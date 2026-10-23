'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Bell, 
  Settings, 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import styles from './OfficerSidebar.module.css';
import { signOut } from 'next-auth/react';

const navItems = [
  { name: 'Overview', icon: LayoutDashboard, href: '/dashboard/officer' },
  { name: 'Complaints', icon: FileText, href: '/dashboard/officer/complaints' },
  { name: 'Citizens', icon: Users, href: '/dashboard/officer/citizens' },
  { name: 'Notifications', icon: Bell, href: '/dashboard/officer/notifications' },
  { name: 'Settings', icon: Settings, href: '/dashboard/officer/settings' },
];

export function OfficerSidebar({ user }: { user: any }) {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <ShieldCheck size={32} />
        <span>VaadaKaro <small style={{ fontSize: '0.6rem', verticalAlign: 'middle', opacity: 0.6 }}>OFFICER</small></span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.activeItem : ''}`}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userCard}>
          <div className={styles.userInfo}>
            <h4>{user?.name || 'Officer'}</h4>
            <p>{user?.role}</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={() => signOut({ callbackUrl: '/' })}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
