'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  Calendar, 
  ArrowRight,
  Info,
  AlertCircle,
  FileText,
  Clock,
  Settings
} from 'lucide-react';
import styles from './NotificationCenter.module.css';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '@/lib/actions/notificationActions';
import Link from 'next/link';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    
    // Refresh periodically
    const interval = setInterval(fetchNotifications, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    const result = await getUserNotifications();
    if (result.success && result.notifications) {
      setNotifications(result.notifications);
      setUnreadCount(result.notifications.filter((n: any) => !n.isRead).length);
    }
  }

  const toggleDrawer = () => setIsOpen(!isOpen);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const groupNotifications = () => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const older: any[] = [];

    const now = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);

    notifications.forEach(n => {
      const date = new Date(n.createdAt);
      if (date.toDateString() === now.toDateString()) {
        today.push(n);
      } else if (date.toDateString() === yesterdayDate.toDateString()) {
        yesterday.push(n);
      } else {
        older.push(n);
      }
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'COMPLAINT_SUBMITTED': return <CheckCircle2 size={16} color="#10b981" />;
      case 'RESOLVED': return <CheckCircle2 size={16} color="#fbbf24" />;
      case 'OFFICER_ASSIGNED': return <Info size={16} color="#3b82f6" />;
      case 'REJECTED': return <AlertCircle size={16} color="#ef4444" />;
      case 'INFO_REQUESTED': return <Clock size={16} color="#f59e0b" />;
      default: return <Bell size={16} color="#64748b" />;
    }
  };

  const NotificationCard = ({ n }: { n: any }) => (
    <div 
      className={`${styles.notificationCard} ${!n.isRead ? styles.unreadCard : ''}`}
      onClick={() => !n.isRead && handleMarkAsRead(n.id)}
    >
      {!n.isRead && <div className={styles.unreadDot} />}
      <div className={styles.cardHeader}>
        <span className={styles.typeLabel}>{n.type.replace('_', ' ')}</span>
        <span className={styles.dateLabel}>
          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ marginTop: '0.2rem' }}>{getIcon(n.type)}</div>
        <div style={{ flex: 1 }}>
          <div className={styles.notifTitle}>{n.title}</div>
          <div className={styles.notifMessage}>{n.message}</div>
          {n.actionUrl && (
            <Link 
              href={n.actionUrl} 
              className="text-xs font-bold text-blue-600 mt-2 flex items-center gap-1 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            >
              Take Action <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Bell Icon Trigger */}
      <div style={{ position: 'relative' }}>
        <button 
          onClick={toggleDrawer}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell size={20} className={unreadCount > 0 ? "text-yellow-600" : "text-gray-600"} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Background Overlay */}
      <div 
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`} 
        onClick={toggleDrawer}
      />

      {/* Notification Drawer */}
      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Bell size={22} className="text-yellow-600" /> Notifications
          </h2>
          <button className={styles.closeBtn} onClick={toggleDrawer}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {notifications.length === 0 ? (
            <div className={styles.emptyState}>
              <Bell size={48} />
              <p>No notifications yet. We'll keep you posted!</p>
            </div>
          ) : (
            <>
              {today.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}><Calendar size={12} /> Today</div>
                  {today.map(n => <NotificationCard key={n.id} n={n} />)}
                </div>
              )}

              {yesterday.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}><Calendar size={12} /> Yesterday</div>
                  {yesterday.map(n => <NotificationCard key={n.id} n={n} />)}
                </div>
              )}

              {older.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}><Calendar size={12} /> Previous</div>
                  {older.map(n => <NotificationCard key={n.id} n={n} />)}
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className={styles.markAllBtn} onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
              <CheckCircle2 size={16} /> Mark all read
            </button>
            <Link 
              href="/dashboard/settings" 
              className={styles.markAllBtn}
              onClick={() => setIsOpen(false)}
              style={{ width: 'auto', padding: '0.75rem 1rem' }}
            >
              <Settings size={16} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
