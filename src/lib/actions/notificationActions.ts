'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export type NotificationType = 
  | 'COMPLAINT_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'OFFICER_ASSIGNED'
  | 'INFO_REQUESTED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED'
  | 'GENERAL_SUPPORT';

interface CreateNotificationParams {
  userId: string;
  complaintId?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}

/**
 * Unified service to handle In-App and mock Email notifications
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const { userId, complaintId, type, title, message, actionUrl } = params;

    // 1. Fetch user preferences
    const settings = await prisma.userSettings.findUnique({
      where: { userId }
    }) || await prisma.userSettings.create({
      data: { userId } // Default settings if none exist
    });

    // 2. Log to Database (In-App)
    if (settings.pushEnabled) {
      await prisma.notification.create({
        data: {
          userId,
          complaintId,
          type,
          title,
          message,
          actionUrl,
        }
      });
    }

    // 3. Dispatch Email (Mock for now)
    if (settings.emailEnabled) {
      // In a real app, we'd use Resend/SendGrid/Nodemailer here
      console.log(`[EMAIL DISPATCH] To: ${userId}, Subject: ${title}`);
      console.log(`[EMAIL BODY] ${message}`);
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Failed to create notification:', error);
    return { success: false, error: 'Notification system failure' };
  }
}

export async function getUserNotifications() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    const notifications = await prisma.notification.findMany({
      where: { userId: (session.user as any).id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return { success: true, notifications };
  } catch (error) {
    return { success: false, error: 'Failed to fetch notifications' };
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    await prisma.notification.update({
      where: { id, userId: (session.user as any).id }, // scoped to current user only
      data: { isRead: true }
    });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Update failed' };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    await prisma.notification.updateMany({
      where: { 
        userId: (session.user as any).id,
        isRead: false
      },
      data: { isRead: true }
    });
    
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Update failed' };
  }
}

export async function updateUserSettings(data: {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  legalUpdatesEnabled?: boolean;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    await prisma.userSettings.upsert({
      where: { userId: (session.user as any).id },
      update: data,
      create: { 
        userId: (session.user as any).id,
        ...data 
      }
    });

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Settings update failed' };
  }
}

export async function getUserSettings() {
  try {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');

    const settings = await prisma.userSettings.findUnique({
      where: { userId: (session.user as any).id }
    });

    return { 
      success: true, 
      settings: settings || { 
        emailEnabled: true, 
        pushEnabled: true, 
        legalUpdatesEnabled: true 
      } 
    };
  } catch (error) {
    return { success: false, error: 'Failed to fetch settings' };
  }
}
