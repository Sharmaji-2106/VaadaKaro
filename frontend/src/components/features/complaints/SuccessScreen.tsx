'use client';

import Link from 'next/link';
import styles from './SuccessScreen.module.css';
import { CheckCircle2, ChevronRight } from 'lucide-react';

interface SuccessScreenProps {
  trackingId: string;
  department: string;
}

export const SuccessScreen = ({ trackingId, department }: SuccessScreenProps) => {
  return (
    <div className={styles.successContainer}>
      <div className={styles.successHeader}>
        <div className={styles.successStamp}>
          <CheckCircle2 size={56} strokeWidth={1.5} />
        </div>
        <h1 className={styles.title}>Complaint submitted.</h1>
        <p className={styles.subtitle}>
          It is registered on VaadaKaro for <strong>{department}</strong> officers to review.
        </p>
      </div>

      <div className={styles.trackingCard}>
        <span className={styles.cardLabel}>Tracking ID</span>
        <div className={styles.trackingId}>{trackingId}</div>
        <p className={styles.cardInfo}>Keep this to check your status anytime.</p>
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Status</span>
          <p className={styles.statusBadge}>Submitted</p>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Expected response</span>
          <p className={styles.detailValue}>7–15 working days</p>
        </div>
      </div>

      <div className={styles.nextSteps}>
        <h3>What happens next</h3>
        <ul>
          <li>We review your submission within 48 hours.</li>
          <li>You are notified when an officer is assigned.</li>
          <li>If an officer asks for more details, you can reply from the tracking page.</li>
        </ul>
      </div>

      <div className={styles.actions}>
        <Link href="/dashboard" className={styles.primaryAction}>
          Go to Dashboard
        </Link>
        <Link href="/track-complaint" className={styles.iconBtn}>
          Track status <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
};
