'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, CheckCircle2, ChevronRight, Info, AlertCircle, Clock } from 'lucide-react';
import styles from './NotificationCenter.module.css';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '@/services/notifications';
import Link from 'next/link';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
      case 'COMPLAINT_SUBMITTED': return <CheckCircle2 size={16} color="var(--accent)" />;
      case 'RESOLVED': return <CheckCircle2 size={16} color="var(--green)" />;
      case 'OFFICER_ASSIGNED': return <Info size={16} color="var(--accent)" />;
      case 'REJECTED': return <AlertCircle size={16} color="var(--red)" />;
      case 'INFO_REQUESTED': return <Clock size={16} color="var(--orange)" />;
      default: return <Bell size={16} color="var(--label-tertiary)" />;
    }
  };

  const NotificationCard = ({ n }: { n: any }) => (
    <div
      className={`${styles.notificationCard} ${!n.isRead ? styles.unreadCard : ''}`}
      onClick={() => !n.isRead && handleMarkAsRead(n.id)}
    >
      <div className={styles.cardIcon}>{getIcon(n.type)}</div>
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.notifTitle}>{n.title}</span>
          <span className={styles.dateLabel}>
            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className={styles.notifMessage}>{n.message}</div>
        {n.actionUrl && (
          <Link
            href={n.actionUrl}
            className={styles.actionLink}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            View <ChevronRight size={14} />
          </Link>
        )}
      </div>
    </div>
  );

  const sections = [
    { title: 'Today', items: today },
    { title: 'Yesterday', items: yesterday },
    { title: 'Earlier', items: older },
  ];

  const drawer = (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={toggleDrawer}
      />

      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`} aria-hidden={!isOpen}>
        <div className={styles.header}>
          <h2 className={styles.title}>Notifications</h2>
          <button className={styles.closeBtn} onClick={toggleDrawer} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className={styles.content}>
          {notifications.length === 0 ? (
            <div className={styles.emptyState}>
              <Bell size={28} />
              <p>No notifications yet.</p>
            </div>
          ) : (
            sections.map((s) => s.items.length > 0 && (
              <div key={s.title} className={styles.section}>
                <div className={styles.sectionTitle}>{s.title}</div>
                {s.items.map(n => <NotificationCard key={n.id} n={n} />)}
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.markAllBtn} onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
            Mark all as read
          </button>
          <Link
            href="/dashboard/settings"
            className={styles.markAllBtn}
            onClick={() => setIsOpen(false)}
          >
            Settings
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={toggleDrawer}
        className={styles.bellBtn}
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {mounted && createPortal(drawer, document.body)}
    </>
  );
}