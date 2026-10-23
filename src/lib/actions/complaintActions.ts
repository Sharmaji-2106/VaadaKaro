'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { createNotification } from './notificationActions';

import { complaintSchema } from '@/lib/validation';
import { logAction } from './auditActions';
import { sendComplaintConfirmationEmail, sendComplaintToGovernment } from './emailActions';

export async function submitComplaint(data: any) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const userId = (session.user as any).id;

    // 0. DIAGNOSTIC LOGGING
    console.log("Incoming Complaint Data:", JSON.stringify(data, null, 2));

    // 1. SERVER-SIDE VALIDATION
    const validatedData = complaintSchema.safeParse(data);
    if (!validatedData.success) {
      const flattenedErrors = validatedData.error.flatten();
      console.error("Zod Validation Error:", JSON.stringify(flattenedErrors, null, 2));
      
      const fieldErrors = flattenedErrors.fieldErrors as Record<string, string[] | undefined>;
      const firstErrorField = Object.keys(fieldErrors)[0];
      const errorMessage = fieldErrors[firstErrorField]?.[0] || "Invalid input data";
      
      return { 
        success: false, 
        error: `${errorMessage} (${firstErrorField})`,
        validationErrors: flattenedErrors.fieldErrors
      };
    }

    const { 
      title, 
      description, 
      department, 
      category, 
      priority, 
      address, 
      city, 
      state, 
      pincode, 
      attachments 
    } = validatedData.data;

    const location = `${address}, ${city}, ${state}`;

    // 2. DUPLICATE PREVENTION (5-minute window)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingComplaint = await prisma.complaint.findFirst({
      where: {
        citizenId: userId,
        title,
        department,
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (existingComplaint && !data.confirmDuplicate) {
      return { 
        success: false, 
        error: "Looks like you recently submitted a similar complaint.", 
        isDuplicate: true 
      };
    }

    const trackingId = `VDK-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;
    
    // 3. DATABASE PERSISTENCE
    const complaint = await prisma.complaint.create({
      data: {
        title,
        description,
        department,
        category,
        priority,
        location,
        pincode,
        trackingId,
        citizenId: userId,
        attachments: {
          create: attachments?.map(att => ({
            url: att.url,
            filename: att.filename,
            mimeType: att.mimeType,
            fileSize: att.fileSize,
          }))
        }
      },
    });

    // 4. AUDIT LOGGING
    await logAction({
      action: 'COMPLAINT_CREATED',
      entity: 'COMPLAINT',
      entityId: complaint.id,
      metadata: { trackingId }
    });

    // Create initial update
    await prisma.complaintUpdate.create({
      data: {
        complaintId: complaint.id,
        status: 'SUBMITTED',
        remarks: 'Complaint filed successfully via digital portal.',
        updatedBy: 'SYSTEM',
      }
    });

    // 5. EMAIL NOTIFICATIONS (Background)
    // We don't await these to keep the responsiveness fast
    sendComplaintConfirmationEmail(complaint.id).catch(err => console.error("Email Error:", err));
    sendComplaintToGovernment(complaint.id).catch(err => console.error("Govt Email Error:", err));
    
    // Notify Citizen about successful submission
    await createNotification({
      userId: (session.user as any).id,
      complaintId: complaint.id,
      type: 'COMPLAINT_SUBMITTED',
      title: 'Complaint Successfully Submitted',
      message: `Your complaint #${complaint.trackingId.split('-').pop()} has been successfully registered.`,
      actionUrl: `/track-complaint?id=${complaint.trackingId}`
    });

    revalidatePath('/file-complaint');
    revalidatePath('/dashboard');
    return { success: true, trackingId: complaint.trackingId, department: complaint.department };
  } catch (error) {
    console.error('Submission error:', error);
    return { success: false, error: 'Failed to submit complaint' };
  }
}

export async function getUserComplaints() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    const complaints = await prisma.complaint.findMany({
      where: { citizenId: (session.user as any).id },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, complaints };
  } catch (error) {
    console.error('Fetch error:', error);
    return { success: false, error: 'Failed to fetch complaints' };
  }
}

export async function getComplaintByTrackingId(trackingId: string) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    const complaint = await prisma.complaint.findUnique({
      where: { trackingId },
      include: {
        updates: {
          orderBy: { createdAt: 'desc' }
        },
        attachments: true // We'll filter this later
      }
    });

    if (!complaint) {
      return { success: false, error: 'Invalid Tracking ID' };
    }

    // Determine access level
    const isOwner = userId === complaint.citizenId;
    const isOfficial = userRole === 'OFFICER' || userRole === 'ADMIN';
    const hasFullAccess = isOwner || isOfficial;

    if (hasFullAccess) {
      return { success: true, complaint };
    }

    // PUBLIC ACCESS: Mask sensitive data
    const publicData = {
      trackingId: complaint.trackingId,
      status: complaint.status,
      title: complaint.title, // Title is generally safe but let's keep it minimal
      category: complaint.category,
      department: complaint.department,
      createdAt: complaint.createdAt,
      updates: complaint.updates.map(u => ({
        status: u.status,
        remarks: u.remarks,
        createdAt: u.createdAt
      })),
      // Hide these:
      description: "REDACTED for privacy",
      location: "REDACTED",
      attachments: [],
      citizenId: "HIDDEN"
    };

    return { 
      success: true, 
      complaint: publicData as any,
      isPublicView: true 
    };
  } catch (error) {
    console.error('Fetch error:', error);
    return { success: false, error: 'Server error' };
  }
}
