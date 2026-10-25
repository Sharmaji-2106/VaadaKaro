import { api } from '@/lib/api/client';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  complaintId: string | null;
  actionUrl: string | null;
  createdAt: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  legalUpdatesEnabled: boolean;
}

export async function getUserNotifications() {
  try {
    return { success: true as const, notifications: await api<NotificationItem[]>('/notifications') };
  } catch {
    return { success: false as const, error: 'Failed to fetch notifications' };
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    await api(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
    return { success: true as const };
  } catch {
    return { success: false as const, error: 'Update failed' };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    await api('/notifications/read-all', { method: 'POST' });
    return { success: true as const };
  } catch {
    return { success: false as const, error: 'Update failed' };
  }
}

export async function getUserSettings() {
  try {
    return { success: true as const, settings: await api<NotificationSettings>('/settings/notifications') };
  } catch {
    return { success: false as const, error: 'Failed to fetch settings' };
  }
}

export async function updateUserSettings(data: Partial<NotificationSettings>) {
  try {
    await api('/settings/notifications', { method: 'PATCH', json: data });
    return { success: true as const };
  } catch {
    return { success: false as const, error: 'Settings update failed' };
  }
}
