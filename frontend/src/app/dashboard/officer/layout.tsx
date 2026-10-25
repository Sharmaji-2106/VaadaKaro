import React from 'react';
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { OfficerSidebar } from '@/components/features/officer/OfficerSidebar';
import styles from './officer-layout.module.css';
import Link from 'next/link';

export default async function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // RBAC Protection: Only OFFICER and ADMIN (the API enforces this too)
  if (!user) {
    redirect('/login?callbackUrl=/dashboard/officer');
  }

  if (user?.role !== 'OFFICER' && user?.role !== 'ADMIN') {
    return (
      <div className={styles.unauthorized}>
        <h1>Officers only.</h1>
        <p>This area is available to officers and administrators.</p>
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
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
