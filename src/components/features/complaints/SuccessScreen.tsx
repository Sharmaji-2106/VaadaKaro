'use client';

import Link from 'next/link';
import styles from './SuccessScreen.module.css';
import { CheckCircle, ArrowRight, Download, Share2, Info, Shield } from 'lucide-react';

interface SuccessScreenProps {
  trackingId: string;
  department: string;
}

export const SuccessScreen = ({ trackingId, department }: SuccessScreenProps) => {
  return (
    <div className={styles.successContainer}>
      {/* Official Acknowledgment Header */}
      <div className={styles.successHeader}>
        <div className={styles.successStamp}>
          <Shield size={28} />
        </div>
        <h1 className={styles.title}>Grievance Registered Successfully</h1>
        <p className={styles.subtitle}>
          Your complaint has been officially recorded and transmitted to the <strong>{department}</strong>.
        </p>
      </div>

      {/* Official Reference Number */}
      <div className={styles.trackingCard}>
        <span className={styles.cardLabel}>Official Reference Number (Tracking ID)</span>
        <div className={styles.trackingId}>{trackingId}</div>
        <p className={styles.cardInfo}>
          Preserve this number for all future correspondence and status tracking.
        </p>
      </div>

      {/* Status Grid */}
      <div className={styles.detailsGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Current Status</span>
          <p className={styles.statusBadge}>SUBMITTED</p>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Est. Response Time</span>
          <p className={styles.detailValue}>7–15 Working Days</p>
        </div>
      </div>

      {/* Next Steps */}
      <div className={styles.nextSteps}>
        <h3><Info size={14} /> WHAT HAPPENS NEXT</h3>
        <ul>
          <li>Our verification team will review your submission for completeness within 48 hours.</li>
          <li>You will receive a notification once an officer is formally assigned to your case.</li>
          <li>Additional evidence can be submitted at any time via the tracking portal.</li>
        </ul>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <Link href="/dashboard" className={styles.primaryAction}>
          Go to Dashboard <ArrowRight size={16} />
        </Link>
        <div className={styles.secondaryActions}>
          <button className={styles.iconBtn}><Download size={14} /> Print PDF</button>
          <button className={styles.iconBtn}><Share2 size={14} /> Share</button>
        </div>
      </div>
    </div>
  );
};

