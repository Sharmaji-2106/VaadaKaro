'use client';

import styles from './ComplaintDetails.module.css';
import { 
  Building2, 
  Tag, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Shield,
  Hourglass
} from 'lucide-react';

interface ComplaintDetailsProps {
  complaint: {
    trackingId: string;
    title: string;
    department: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    location?: string;
  };
}

export default function ComplaintDetails({ complaint }: ComplaintDetailsProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '#dc2626';
      case 'HIGH': return '#ea580c';
      case 'MEDIUM': return '#ca8a04';
      default: return '#166534';
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
        <span className={styles.idLabel}>Record Reference ID</span>
        <h2 className={styles.trackingId}>{complaint.trackingId}</h2>
      </div>

      <div className={styles.mainInfo}>
        <h1 className={styles.title}>{complaint.title}</h1>
        <div className={styles.statusBadge} data-status={complaint.status}>
          Official Status: {complaint.status.replace('_', ' ')}
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaItem}>
          <Building2 size={18} />
          <div>
            <label>Nodal Department</label>
            <p>{complaint.department}</p>
          </div>
        </div>
        <div className={styles.metaItem}>
          <Tag size={18} />
          <div>
            <label>Classification</label>
            <p>{complaint.category}</p>
          </div>
        </div>
        <div className={styles.metaItem}>
          <AlertTriangle size={18} style={{ color: getPriorityColor(complaint.priority) }} />
          <div>
            <label>SLA Priority</label>
            <p style={{ color: getPriorityColor(complaint.priority), fontWeight: 800 }}>{complaint.priority}</p>
          </div>
        </div>
        <div className={styles.metaItem}>
          <Calendar size={18} />
          <div>
            <label>Dating of Filing</label>
            <p>{filedDate}</p>
          </div>
        </div>
      </div>

      <div className={styles.resolutionBox}>
        <div className={styles.resolutionHeader}>
          <Hourglass size={16} />
          <span>Departmental SLA</span>
        </div>
        <p className={styles.resolutionText}>
          Standard processing time: <strong>7–15 working days</strong>
        </p>
        <div className={styles.resolutionStatus}>
          SLA Compliance: Active
        </div>
      </div>

      <div className={styles.footerNote}>
        <Shield size={14} /> Official E-Grievance Digital Record | Government of India Standard Redressal
      </div>
    </div>
  );
}
