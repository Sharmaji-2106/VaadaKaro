import Link from 'next/link';
import { acknowledgeNotice } from '@/services/auth';
import styles from './NoticeBanner.module.css';

/**
 * Shown once to signed-in people who haven't seen the current privacy notice, e.g. accounts made
 * before it existed (DPDP Act, 2023 s.5(2)). It never blocks the site.
 */
export function NoticeBanner() {
  return (
    <div className={styles.banner} role="region" aria-label="Privacy notice update">
      <p>
        <strong>Our privacy notice has changed.</strong> It explains what we keep, the new choice about AI processing,
        and your rights to download, correct or delete your data. Also in{' '}
        <Link href="/privacy#hindi">हिन्दी</Link> and <Link href="/privacy#marathi">मराठी</Link>.
      </p>
      <div className={styles.actions}>
        <Link href="/privacy" className={styles.secondary}>Read it</Link>
        <form action={acknowledgeNotice}>
          <button type="submit" className={styles.primary}>I&apos;ve read it</button>
        </form>
      </div>
    </div>
  );
}
