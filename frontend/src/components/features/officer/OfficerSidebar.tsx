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
} from 'lucide-react';
import styles from './OfficerSidebar.module.css';
import { logoutUser } from '@/services/auth';

const navItems = [
  { name: 'Overview', icon: LayoutGrid, href: '/dashboard/officer' },
  { name: 'Complaints', icon: FileText, href: '/dashboard/officer/complaints' },
  { name: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

const adminItems = [
  { name: 'Reports', icon: BarChart3, href: '/dashboard/admin/reports' },
  { name: 'Users & roles', icon: Users, href: '/dashboard/admin/users' },
  { name: 'Audit log', icon: History, href: '/dashboard/admin/audit' },
];

export function OfficerSidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const items = user?.role === 'ADMIN' ? [...navItems.slice(0, 2), ...adminItems, navItems[2]] : navItems;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span>Officer</span>
      </div>

      <nav className={styles.nav}>
        {items.map((item) => {
          const isActive = item.href === '/dashboard/officer'
            ? pathname === item.href
            : pathname.startsWith(item.href);
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
            <h4>{user?.name || 'Officer'}</h4>
            <p>{user?.role === 'ADMIN' ? 'Administrator' : 'Officer'}</p>
          </div>
          <button className={styles.logoutBtn} onClick={() => logoutUser()} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
