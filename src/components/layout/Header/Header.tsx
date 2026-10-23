import Link from 'next/link';
import { Logo } from '@/components/ui/Logo/Logo';
import styles from './Header.module.css';
import { auth } from '@/auth';
import { logoutUser } from '@/lib/actions/auth-actions';
import { User as UserIcon, LogOut } from 'lucide-react';
import NotificationCenter from '@/components/features/notifications/NotificationCenter';

export const Header = async () => {
  const session = await auth();
  const user = session?.user;

  return (
    <header className={styles.header}>
      {/* Official State Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarContainer}>
          <div className={styles.govText}>Ministry of Electronics & Information Technology | Digital India</div>
          <div className={styles.accessibilityLinks}>
            <button>Skip to main content</button>
            <button>Screen Reader Access</button>
            <div className={styles.langSelector}>English | हिन्दी</div>
          </div>
        </div>
      </div>

      <div className={styles.mainHeader}>
        <div className={styles.container}>
          <Link href="/" className={styles.logoWrapper}>
            <Logo size="md" theme="light" />
          </Link>
          
          <nav className={styles.nav}>
            <Link href="/" className={styles.navItem}>Home</Link>
            <Link href="/file-complaint" className={styles.navItem}>File Complaint</Link>
            <Link href="/track-complaint" className={styles.navItem}>Track Status</Link>
            <Link href="/ai-assistant" className={styles.navItem}>AI Legal Assistant</Link>
          </nav>
          
          <div className={styles.actions}>
            {!user ? (
              <>
                <Link href="/login" className={styles.loginLink}>Sign In</Link>
                <Link href="/signup" className={styles.signupBtn}>Request Account</Link>
              </>
            ) : (
              <div className={styles.userProfile}>
                <div className={styles.userDetails}>
                  <span className={styles.userName}>{user.name || user.email}</span>
                  <span className={styles.userRole}>{(user as any).role || 'Citizen'}</span>
                </div>
                <Link href="/dashboard" className={styles.avatar}>
                  <UserIcon size={20} />
                </Link>
                <NotificationCenter />
                <form action={logoutUser}>
                  <button type="submit" className={styles.logoutBtn} title="Log Out">
                    <LogOut size={20} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
