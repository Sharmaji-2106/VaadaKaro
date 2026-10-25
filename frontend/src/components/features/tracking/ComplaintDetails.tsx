'use client';

import styles from './ComplaintDetails.module.css';
import { Download, Hourglass } from 'lucide-react';
import { complaintPdfUrl } from '@/services/legal';

interface ComplaintDetailsProps {
  complaint: {
    id?: string;
    isPublicView?: boolean;
    trackingId: string;
    title: string;
    department: string;
    category: string;
    priority?: string;
    status: string;
    createdAt: string;
    location?: string;
  };
}

export default function ComplaintDetails({ complaint }: ComplaintDetailsProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'var(--red)';
      case 'HIGH': return 'var(--orange)';
      case 'MEDIUM': return 'var(--label)';
      default: return 'var(--green)';
    }
  };

  const filedDate = new Date(complaint.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className={styles.detailsCard}>
      <div className={styles.trackingHeader}>
        <span className={styles.idLabel}>Tracking ID</span>
        <h2 className={styles.trackingId}>{complaint.trackingId}</h2>
      </div>

      <div className={styles.mainInfo}>
        <h1 className={styles.title}>{complaint.title}</h1>
        <div className={styles.statusBadge} data-status={complaint.status}>
          {complaint.status.replace(/_/g, ' ').toLowerCase()}
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          
          <div>
            <label>Department</label>
            <p>{complaint.department}</p>
          </div>
        </div>
        <div className={styles.metaItem}>
          
          <div>
            <label>Category</label>
            <p>{complaint.category}</p>
          </div>
        </div>
        {complaint.priority && (
          <div className={styles.metaItem}>
            <div>
              <label>Priority</label>
              <p style={{ color: getPriorityColor(complaint.priority) }}>{complaint.priority.charAt(0) + complaint.priority.slice(1).toLowerCase()}</p>
            </div>
          </div>
        )}
        <div className={styles.metaItem}>
          
          <div>
            <label>Filed on</label>
            <p>{filedDate}</p>
          </div>
        </div>
      </div>

      <div className={styles.resolutionBox}>
        <div className={styles.resolutionHeader}>
          <Hourglass size={14} />
          <span>Expected resolution</span>
        </div>
        <p className={styles.resolutionText}>
          <strong>7–15 working days</strong>
        </p>
      </div>

      {/* Only the owner (and officials) get the full record; the public view has no id. */}
      {complaint.id && !complaint.isPublicView && (
        <a href={complaintPdfUrl(complaint.id)} download className={styles.downloadLink}>
          <Download size={15} /> Download complaint PDF
        </a>
      )}
    </div>
  );
}
