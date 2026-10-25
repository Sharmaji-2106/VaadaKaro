'use client';

import styles from './TrackingTimeline.module.css';
import { 
  Check, 
  Circle, 
  Clock, 
  FileCheck, 
  AlertCircle, 
  UserPlus, 
  Settings,
  XCircle,
  Search
} from 'lucide-react';

interface TimelineUpdate {
  id?: string;
  status: string;
  remarks: string;
  createdAt: string;
}

interface TrackingTimelineProps {
  currentStatus: string;
  updates: TimelineUpdate[];
}

const STATUS_STAGES = [
  { id: 'SUBMITTED', label: 'Filed', icon: <FileCheck size={14} />, description: 'Received by VaadaKaro.' },
  { id: 'UNDER_REVIEW', label: 'Under review', icon: <Search size={14} />, description: 'Details are being verified.' },
  { id: 'ASSIGNED', label: 'Officer assigned', icon: <UserPlus size={14} />, description: 'Forwarded to the department.' },
  { id: 'IN_PROGRESS', label: 'In progress', icon: <Settings size={14} />, description: 'Work is underway.' },
  { id: 'RESOLVED', label: 'Resolved', icon: <Check size={14} />, description: 'Your complaint has been addressed.' },
];

export default function TrackingTimeline({ currentStatus, updates }: TrackingTimelineProps) {
  // Sort updates by date descending (latest first)
  const sortedUpdates = [...updates].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getCurrentIndex = () => {
    if (currentStatus === 'REJECTED') return -1;
    return STATUS_STAGES.findIndex(s => s.id === currentStatus);
  };

  const currentIndex = getCurrentIndex();

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.cardHeader}>
        
        <div>
          <h2>Progress</h2>
          <p>Updated as officers act on your case</p>
        </div>
      </div>

      <div className={styles.timelineWrapper}>
        <div className={styles.stages}>
          {STATUS_STAGES.map((stage, idx) => {
            const isCompleted = idx < currentIndex || currentStatus === 'RESOLVED';
            const isActive = idx === currentIndex;
            const isPending = idx > currentIndex && currentStatus !== 'RESOLVED' && currentStatus !== 'REJECTED';

            return (
              <div key={stage.id} className={`${styles.stageItem} ${isCompleted ? styles.completed : ''} ${isActive ? styles.active : ''} ${isPending ? styles.pending : ''}`}>
                <div className={styles.stageVisual}>
                  <div className={styles.stageIcon}>
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : stage.icon}
                  </div>
                  {idx < STATUS_STAGES.length - 1 && <div className={styles.connector} />}
                </div>
                <div className={styles.stageContent}>
                  <h3>{stage.label}</h3>
                  <p>{stage.description}</p>
                </div>
              </div>
            );
          })}

          {currentStatus === 'REJECTED' && (
            <div className={`${styles.stageItem} ${styles.rejected}`}>
              <div className={styles.stageVisual}>
                <div className={styles.stageIcon}><XCircle size={14} /></div>
              </div>
              <div className={styles.stageContent}>
                <h3>Rejected</h3>
                <p>Action cannot be taken on this complaint.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.updateFeed}>
        <div className={styles.feedHeader}>Activity</div>
        <div className={styles.tableWrapper}>
          <table className={styles.trackingTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                
                <th>Status / Event</th>
              </tr>
            </thead>
            <tbody>
              {sortedUpdates.length > 0 ? (
                sortedUpdates.map((update, i) => {
                  const date = new Date(update.createdAt);
                  return (
                    <tr key={`${update.createdAt}-${i}`}>
                      <td>{date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                      <td>{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                      
                      <td>
                        <div className={styles.eventStatus}>{update.status.replace(/_/g, ' ').toLowerCase()}</div>
                        <div className={styles.eventRemarks}>{update.remarks}</div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className={styles.emptyTable}>No activity yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
