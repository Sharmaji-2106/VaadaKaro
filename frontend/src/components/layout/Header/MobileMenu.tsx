'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import styles from './Header.module.css';

interface MobileMenuProps {
  links: { href: string; label: string }[];
  signedIn: boolean;
}

export default function MobileMenu({ links, signedIn }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        className={styles.menuBtn}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <div className={styles.mobilePanel}>
          <nav className={styles.mobileNav}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={styles.mobileLink}>
                {l.label}
              </Link>
            ))}
            {signedIn ? (
              <Link href="/dashboard" className={styles.mobileLink}>My Dashboard</Link>
            ) : (
              <div className={styles.mobileActions}>
                <Link href="/login" className={styles.loginLink}>Sign in</Link>
                <Link href="/signup" className={styles.signupBtn}>Create account</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
