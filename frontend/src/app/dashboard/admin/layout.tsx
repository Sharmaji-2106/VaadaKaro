import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { OfficerSidebar } from '@/components/features/officer/OfficerSidebar';
import styles from '../officer/officer-layout.module.css';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?callbackUrl=/dashboard/admin/reports');
  }

  // Convenience only: every admin endpoint is checked by the API as well.
  if (user.role !== 'ADMIN') {
    return (
      <div className={styles.unauthorized}>
        <h1>Administrators only.</h1>
        <p>This area is available to administrators.</p>
        <Link href="/dashboard" className={styles.backBtn}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <OfficerSidebar user={user} />
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
