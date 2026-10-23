'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notificationActions';

export async function replyToInfoRequest(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    const complaintId = formData.get('complaintId') as string;
    const message = formData.get('message') as string;

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { assignedOfficer: true }
    });

    if (!complaint) throw new Error('Complaint not found');

    // 1. Create a status update back to IN_PROGRESS or just add the reply
    // Usually, we transition back to UNDER_REVIEW or IN_PROGRESS
    await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: 'UNDER_REVIEW',
        updates: {
          create: {
            status: 'UNDER_REVIEW',
            remarks: `Citizen Reply: ${message}`,
            updatedBy: (session.user as any).name || 'CITIZEN'
          }
        }
      }
    });

    // 2. Notify the assigned officer if exists
    if (complaint.assignedOfficerId) {
      await createNotification({
        userId: complaint.assignedOfficerId,
        complaintId,
        type: 'INFO_REQUESTED', // Using this as a "reply" type for now
        title: 'Citizen Responded',
        message: `A citizen has replied to your information request for complaint #${complaint.trackingId.split('-').pop()}.`,
        actionUrl: `/dashboard/officer/complaints/${complaintId}`
      });
    }

    revalidatePath(`/track-complaint`);
    return { success: true };
  } catch (error: any) {
    console.error('Reply error:', error);
    return { success: false, error: error.message };
  }
}
