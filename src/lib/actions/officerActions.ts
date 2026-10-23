'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { ComplaintStatus, PriorityLevel } from '@prisma/client';
import { createNotification } from './notificationActions';

/**
 * RBAC Helper: Ensures only OFFICER or ADMIN can access actions
 */
async function ensureOfficer() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userDepartment = (session?.user as any)?.department;
  const userId = (session?.user as any)?.id;

  if (!session?.user || (role !== 'OFFICER' && role !== 'ADMIN')) {
    throw new Error('Unauthorized: Officer access required');
  }
  return { session, role, userDepartment, userId };
}

export async function getOfficerStats() {
  try {
    const { role, userDepartment } = await ensureOfficer();

    const where: any = {};
    if (role !== 'ADMIN' && userDepartment) {
      where.department = userDepartment;
    }

    const counts = await prisma.complaint.groupBy({
      by: ['status'],
      where,
      _count: {
        _all: true
      }
    });

    const stats = {
      total: 0,
      pending: 0,
      underReview: 0,
      inProgress: 0,
      resolved: 0,
      resolvedToday: 0
    };

    counts.forEach(c => {
      stats.total += c._count._all;
      if (c.status === 'SUBMITTED') stats.pending = c._count._all;
      if (c.status === 'UNDER_REVIEW') stats.underReview = c._count._all;
      if (c.status === 'IN_PROGRESS') stats.inProgress = c._count._all;
      if (c.status === 'RESOLVED') stats.resolved = c._count._all;
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const whereStats: any = {
      status: 'RESOLVED',
      updatedAt: {
        gte: startOfToday
      }
    };

    if (role !== 'ADMIN' && userDepartment) {
      whereStats.department = userDepartment;
    }

    stats.resolvedToday = await prisma.complaint.count({
      where: whereStats
    });

    return { success: true, stats };
  } catch (error: any) {
    console.error('Error fetching officer stats:', error);
    return { success: false, error: error.message };
  }
}

export async function getOfficerComplaints(params: {
  status?: ComplaintStatus;
  priority?: PriorityLevel;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const { role, userDepartment } = await ensureOfficer();
    const { status, priority, department, search, page = 1, limit = 10 } = params;

    const where: any = {};
    
    // SECURITY: Enforce department isolation
    if (role !== 'ADMIN') {
      if (userDepartment) {
        where.department = userDepartment;
      } else {
        // If officer has no department, they see nothing by default
        return { success: true, complaints: [], pagination: { total: 0, pages: 1, currentPage: 1 } };
      }
    } else if (department) {
      // Admin can filter by any department
      where.department = department;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { trackingId: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [complaints, total] = await prisma.$transaction([
      prisma.complaint.findMany({
        where,
        include: {
          citizen: {
            select: { name: true, email: true, phone: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.complaint.count({ where })
    ]);

    return {
      success: true,
      complaints,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      }
    };
  } catch (error: any) {
    console.error('Error fetching complaints:', error);
    return { success: false, error: error.message };
  }
}

export async function getComplaintDetails(id: string) {
  try {
    const { role, userDepartment } = await ensureOfficer();

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        citizen: {
          select: { name: true, email: true, phone: true, location: true }
        },
        assignedOfficer: {
          select: { name: true, email: true }
        },
        updates: {
          orderBy: { createdAt: 'desc' }
        },
        attachments: true
      }
    });

    if (!complaint) throw new Error('Complaint not found');

    // SECURITY: Verify department access
    if (role !== 'ADMIN' && complaint.department !== userDepartment) {
      throw new Error('Unauthorized: Department mismatch');
    }

    return { success: true, complaint };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateComplaintStatus(params: {
  complaintId: string;
  status: ComplaintStatus;
  remarks: string;
  internalNotes?: string;
}) {
  try {
    const { session, role, userDepartment } = await ensureOfficer();
    const { complaintId, status, remarks, internalNotes } = params;

    // SECURITY: Fetch complaint first to check department
    const complaintCheck = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { department: true, citizenId: true, trackingId: true }
    });

    if (!complaintCheck) throw new Error('Complaint not found');

    if (role !== 'ADMIN' && complaintCheck.department !== userDepartment) {
      throw new Error('Unauthorized: Department mismatch');
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status,
        internalNotes: internalNotes || undefined,
        updates: {
          create: {
            status,
            remarks,
            updatedBy: session.user?.name || 'OFFICER'
          }
        }
      }
    });

    // Create notification for citizen using the new service
    await createNotification({
      userId: updatedComplaint.citizenId,
      complaintId: complaintId,
      type: status as any,
      title: `Complaint ${status.replace('_', ' ')}`,
      message: `Your complaint #${updatedComplaint.trackingId.split('-').pop()} is now ${status.replace('_', ' ')}. Remarks: ${remarks}`,
      actionUrl: `/track-complaint?id=${updatedComplaint.trackingId}`
    });

    revalidatePath('/dashboard/officer');
    revalidatePath(`/dashboard/officer/complaints/${complaintId}`);
    revalidatePath('/dashboard'); // Notify citizen
    revalidatePath('/track-complaint');

    return { success: true, complaint: updatedComplaint };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignOfficer(complaintId: string, officerId: string) {
  try {
    const { session, role, userDepartment } = await ensureOfficer();
    
    // SECURITY: Verify department access
    const complaintCheck = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { department: true }
    });

    if (!complaintCheck) throw new Error('Complaint not found');

    if (role !== 'ADMIN' && complaintCheck.department !== userDepartment) {
      throw new Error('Unauthorized: Department mismatch');
    }

    await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        assignedOfficerId: officerId,
        updates: {
          create: {
            status: 'UNDER_REVIEW', // Auto-promote to under review when assigned
            remarks: 'Complaint has been assigned to a dedicated officer.',
            updatedBy: session.user?.name || 'ADMIN'
          }
        }
      }
    });

    // Notify citizen about assignment
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { citizenId: true, trackingId: true }
    });

    if (complaint) {
      await createNotification({
        userId: complaint.citizenId,
        complaintId,
        type: 'OFFICER_ASSIGNED',
        title: 'Officer Assigned',
        message: `An official has been assigned to your complaint #${complaint.trackingId.split('-').pop()}.`,
        actionUrl: `/track-complaint?id=${complaint.trackingId}`
      });
    }

    revalidatePath('/dashboard/officer');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
