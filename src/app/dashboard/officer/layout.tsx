import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { OfficerSidebar } from '@/components/features/officer/OfficerSidebar';
import styles from './officer-layout.module.css';
import Link from 'next/link';

export default async function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user as any;

  // RBAC Protection: Only OFFICER and ADMIN
  if (!session?.user) {
    redirect('/login?callbackUrl=/dashboard/officer');
  }

  if (user?.role !== 'OFFICER' && user?.role !== 'ADMIN') {
    return (
      <div className={styles.unauthorized}>
        <h1>Unauthorized Access</h1>
        <p>This area is restricted to Government Officers and Administrators only.</p>
        <Link href="/dashboard" className={styles.backBtn}>
          Return to Citizen Dashboard
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
