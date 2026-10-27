import Link from 'next/link';
import { Logo } from '@/components/ui/Logo/Logo';
import styles from './Header.module.css';
import { getCurrentUser } from '@/lib/session';
import { logoutUser } from '@/services/auth';
import { LogOut } from 'lucide-react';
import NotificationCenter from '@/components/features/notifications/NotificationCenter';
import MobileMenu from './MobileMenu';
import { NoticeBanner } from '@/components/features/privacy/NoticeBanner';

const NAV_LINKS = [
  { href: '/file-complaint', label: 'File a complaint' },
  { href: '/draft-letter', label: 'Draft a letter' },
  { href: '/authorities', label: 'Where to complain' },
  { href: '/track-complaint', label: 'Track status' },
  { href: '/ai-assistant', label: 'Legal help' },
  { href: '/find-lawyer', label: 'Find a lawyer' },
];

export const Header = async () => {
  const user = await getCurrentUser();
  const initial = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <>
    <header className={styles.header}>
      <div className={styles.stripe} aria-hidden="true" />
      <div className={styles.mainHeader}>
        <div className={styles.container}>
          <Link href="/" className={styles.logoWrapper} aria-label="VaadaKaro home">
            <Logo size="md" theme="light" />
          </Link>

          <nav className={styles.nav} aria-label="Main">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={styles.navItem}>{l.label}</Link>
            ))}
          </nav>

          <div className={styles.actions}>
            {!user ? (
              <div className={styles.authLinks}>
                <Link href="/login" className={styles.loginLink}>Sign in</Link>
                <Link href="/signup" className={styles.signupBtn}>Create account</Link>
              </div>
            ) : (
              <div className={styles.userProfile}>
                <NotificationCenter />
                <Link
                  href="/dashboard"
                  className={styles.avatar}
                  title={`${user.name || user.email} · ${user.role.charAt(0) + user.role.slice(1).toLowerCase()}`}
                >
                  {initial}
                </Link>
                <form action={logoutUser} className={styles.logoutForm}>
                  <button type="submit" className={styles.logoutBtn} title="Sign out">
                    <LogOut size={17} />
                  </button>
                </form>
              </div>
            )}
            <MobileMenu links={NAV_LINKS} signedIn={!!user} />
          </div>
        </div>
      </div>
    </header>
    {user?.needsNotice && <NoticeBanner />}
    </>
  );
};
