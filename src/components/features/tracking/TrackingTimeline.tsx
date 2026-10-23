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
  id: string;
  status: string;
  remarks: string;
  createdAt: string;
}

interface TrackingTimelineProps {
  currentStatus: string;
  updates: TimelineUpdate[];
}

const STATUS_STAGES = [
  { id: 'SUBMITTED', label: 'Grievance Filed', icon: <FileCheck size={18} />, description: 'Received by the portal.' },
  { id: 'UNDER_REVIEW', label: 'Review Initiated', icon: <Search size={18} />, description: 'Preliminary verification.' },
  { id: 'ASSIGNED', label: 'Officer Assigned', icon: <UserPlus size={18} />, description: 'Forwarded to relevant department.' },
  { id: 'IN_PROGRESS', label: 'Action Periodic', icon: <Settings size={18} />, description: 'Work process in progress.' },
  { id: 'RESOLVED', label: 'Case Resolved', icon: <Check size={18} />, description: 'Complaint successfully addressed.' },
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
        <div className={styles.iconBox}><Clock size={20} /></div>
        <div>
          <h2>Lifecycle Progress</h2>
          <p>Real-time updates from official sources</p>
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
                    {isCompleted ? <Check size={16} /> : stage.icon}
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
                <div className={styles.stageIcon}><XCircle size={16} /></div>
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
        <div className={styles.feedHeader}>Official Action History</div>
        <div className={styles.tableWrapper}>
          <table className={styles.trackingTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Office / Department</th>
                <th>Status / Event</th>
              </tr>
            </thead>
            <tbody>
              {sortedUpdates.length > 0 ? (
                sortedUpdates.map((update) => {
                  const date = new Date(update.createdAt);
                  return (
                    <tr key={update.id}>
                      <td>{date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                      <td>{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                      <td>National Redressal Cell</td>
                      <td>
                        <div className={styles.eventStatus}>{update.status.replace('_', ' ')}</div>
                        <div className={styles.eventRemarks}>{update.remarks}</div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className={styles.emptyTable}>No tracking history available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
