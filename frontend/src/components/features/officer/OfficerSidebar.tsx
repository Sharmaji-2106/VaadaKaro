'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  FileText,
  Settings,
  LogOut,
  BarChart3,
  Users,
  History,
  CalendarDays,
  UserRound,
  BadgeCheck,
  Gauge,
  Landmark,
  Inbox,
  ShieldAlert,
} from 'lucide-react';
import styles from './OfficerSidebar.module.css';
import { logoutUser } from '@/services/auth';

const settingsItem = { name: 'Settings', icon: Settings, href: '/dashboard/settings' };

const officerItems = [
  { name: 'Overview', icon: LayoutGrid, href: '/dashboard/officer' },
  { name: 'Complaints', icon: FileText, href: '/dashboard/officer/complaints' },
];

const adminItems = [
  { name: 'Reports', icon: BarChart3, href: '/dashboard/admin/reports' },
  { name: 'Pilot metrics', icon: Gauge, href: '/dashboard/admin/metrics' },
  { name: 'Users & roles', icon: Users, href: '/dashboard/admin/users' },
  { name: 'Lawyer verification', icon: BadgeCheck, href: '/dashboard/admin/lawyers' },
  { name: 'Authority directory', icon: Landmark, href: '/dashboard/admin/authorities' },
  { name: 'Grievance Officer', icon: Inbox, href: '/dashboard/admin/grievances' },
  { name: 'Data breaches', icon: ShieldAlert, href: '/dashboard/admin/breaches' },
  { name: 'Audit log', icon: History, href: '/dashboard/admin/audit' },
];

const lawyerItems = [
  { name: 'Overview', icon: LayoutGrid, href: '/dashboard/lawyer' },
  { name: 'Consultations', icon: CalendarDays, href: '/dashboard/lawyer/bookings' },
  { name: 'Public profile', icon: UserRound, href: '/dashboard/lawyer/profile' },
];

// Overview links are exact matches; the others also cover their sub-pages.
const EXACT = new Set(['/dashboard/officer', '/dashboard/lawyer']);

const PORTAL = {
  OFFICER: { title: 'Officer', role: 'Officer', items: [...officerItems, settingsItem] },
  ADMIN: { title: 'Officer', role: 'Administrator', items: [...officerItems, ...adminItems, settingsItem] },
  LAWYER: { title: 'Lawyer', role: 'Lawyer', items: [...lawyerItems, settingsItem] },
} as const;

export function OfficerSidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const portal = PORTAL[user?.role as keyof typeof PORTAL] ?? PORTAL.OFFICER;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span>{portal.title}</span>
      </div>

      <nav className={styles.nav}>
        {portal.items.map((item) => {
          const isActive = EXACT.has(item.href) ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.activeItem : ''}`}
            >
              <item.icon size={17} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userCard}>
          <div className={styles.avatar}>{(user?.name || 'O').charAt(0).toUpperCase()}</div>
          <div className={styles.userInfo}>
            <h4>{user?.name || portal.role}</h4>
            <p>{portal.role}</p>
          </div>
          <button className={styles.logoutBtn} onClick={() => logoutUser()} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
