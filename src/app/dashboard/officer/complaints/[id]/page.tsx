import React from 'react';
import { getComplaintDetails, updateComplaintStatus } from '@/lib/actions/officerActions';
import styles from './details.module.css';
import { 
  ArrowLeft, 
  User, 
  FileText, 
  History, 
  Shield, 
  MapPin, 
  Phone, 
  Mail,
  Clock,
  CheckCircle,
  AlertTriangle,
  Paperclip
} from 'lucide-react';
import Link from 'next/link';
import { ComplaintStatus } from '@prisma/client';

export default async function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getComplaintDetails(id);
  const complaint = result.complaint as any;
  
  if (!result.success || !complaint) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '5rem', textAlign: 'center' }}>
          <AlertTriangle size={64} style={{ color: '#ef4444', margin: '0 auto 1.5rem' }} />
          <h2>Complaint Not Found</h2>
          <p>The requested complaint ID does not exist or has been removed.</p>
          <Link href="/dashboard/officer/complaints" className={styles.backBtn} style={{ marginTop: '2rem', display: 'inline-block' }}>
            Back to Complaints
          </Link>
        </div>
      </div>
    );
  }

  const createdAt = new Date(complaint.createdAt);
  const timeSince = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const isDelayed = timeSince > 3 && complaint.status !== 'RESOLVED' && complaint.status !== 'REJECTED';

  async function handleUpdate(formData: FormData) {
    'use server';
    const status = formData.get('status') as ComplaintStatus;
    const remarks = formData.get('remarks') as string;
    const internalNotes = formData.get('internalNotes') as string;

    await updateComplaintStatus({
      complaintId: id,
      status,
      remarks,
      internalNotes
    });
  }

  return (
    <div className={styles.container}>
      <Link href="/dashboard/officer/complaints" className={styles.backLink}>
        <ArrowLeft size={18} /> Back to Dashboard
      </Link>

      <div className={styles.layout}>
        {/* Left Column: Details & History */}
        <div className={styles.mainContent}>
          
          {/* Header Info */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2><FileText size={20} className="text-blue-600" /> Complaint Information</h2>
              <span className={styles.trackingId}>#{complaint.trackingId.split('-').pop()}</span>
            </div>
            <div className={styles.cardContent}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-navy)', marginBottom: '1.5rem' }}>
                {complaint.title}
              </h1>
              
              <div className={styles.infoGrid}>
                <div>
                  <div className={styles.infoLabel}>Department</div>
                  <div className={styles.infoValue}>{complaint.department}</div>
                </div>
                <div>
                  <div className={styles.infoLabel}>Category</div>
                  <div className={styles.infoValue}>{complaint.category}</div>
                </div>
                <div>
                  <div className={styles.infoLabel}>Priority</div>
                  <div className={styles.infoValue} style={{ color: complaint.priority === 'URGENT' ? '#ef4444' : 'inherit', fontWeight: 700 }}>
                    {complaint.priority}
                  </div>
                </div>
                <div>
                  <div className={styles.infoLabel}>Submission Date</div>
                  <div className={styles.infoValue}>
                    {createdAt.toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
                  </div>
                </div>
              </div>

              <div className={styles.descriptionBox}>
                <div className={styles.infoLabel} style={{ marginBottom: '0.75rem' }}>Description</div>
                <p>{complaint.description}</p>
              </div>

              {complaint.attachments && complaint.attachments.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <div className={styles.infoLabel} style={{ marginBottom: '1rem' }}>Evidence / Attachments</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                    {complaint.attachments.map((file: any) => (
                      <a 
                        key={file.id} 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-sm font-medium"
                      >
                        <Paperclip size={16} className="text-gray-400" />
                        <span className="truncate">{file.filename}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Citizen Info */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2><User size={20} className="text-green-600" /> Citizen Details</h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.infoGrid}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#64748b' }}>
                    {complaint.citizen?.name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <div className={styles.infoValue}>{complaint.citizen?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Citizen Contributor</div>
                  </div>
                </div>
                <div>
                  <div className={styles.infoLabel}><Phone size={12} /> Contact Number</div>
                  <div className={styles.infoValue}>{complaint.citizen?.phone || 'Not provided'}</div>
                </div>
                <div>
                  <div className={styles.infoLabel}><Mail size={12} /> Email Address</div>
                  <div className={styles.infoValue}>{complaint.citizen?.email}</div>
                </div>
                <div>
                  <div className={styles.infoLabel}><MapPin size={12} /> Reported Location</div>
                  <div className={styles.infoValue}>{complaint.location || complaint.citizen?.location || 'General City Area'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2><History size={20} className="text-amber-600" /> Resolution Timeline</h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.timeline}>
                {complaint.updates.map((update: any) => (
                  <div key={update.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot} />
                    <div className={styles.timelineMeta}>
                      <span className={styles.timelineUser}>{update.updatedBy}</span>
                      <span className={styles.timelineDate}>
                        {new Date(update.createdAt).toLocaleString('en-IN', { 
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <div className={styles.timelineContent}>
                      <span className={styles.timelineStatus} style={{ color: 'var(--brand-gold-muted)' }}>
                        {update.status.replace('_', ' ')}:
                      </span>
                      {update.remarks}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className={styles.actionPanel}>
          
          <div className={isDelayed ? styles.slaCard : `${styles.slaCard} ${styles.slaNormal}`}>
            <Clock size={20} />
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>RESPONSE TIMER</div>
              <div>{timeSince === 0 ? 'Filed Today' : `${timeSince} Days Elapsed`}</div>
            </div>
            {isDelayed && <AlertTriangle size={20} style={{ marginLeft: 'auto' }} />}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2><Shield size={20} className="text-navy-600" /> Administrative Actions</h2>
            </div>
            <div className={styles.cardContent}>
              <form action={handleUpdate}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Update Workflow Status</label>
                  <select name="status" className={styles.select} defaultValue={complaint.status}>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="INFO_REQUESTED">Request More Information</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolve Complaint</option>
                    <option value="REJECTED">Reject Complaint</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Official Remarks (Citizen Visible)</label>
                  <textarea 
                    name="remarks" 
                    className={styles.textarea} 
                    placeholder="Provide detailed update to the citizen..."
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Internal Workspace Notes (Private)</label>
                  <textarea 
                    name="internalNotes" 
                    className={styles.textarea} 
                    placeholder="Document evidence, officer thoughts, or verification steps..."
                    defaultValue={complaint.internalNotes || ''}
                    style={{ background: '#fffbeb', borderColor: '#fde68a' }}
                  />
                </div>

                <button type="submit" className={styles.updateBtn}>
                  <CheckCircle size={18} /> Update Resolution Path
                </button>
              </form>
            </div>
          </div>

          <div className={styles.card} style={{ borderStyle: 'dashed' }}>
            <div className={styles.cardContent} style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div className={styles.infoLabel}>Assigned Authority</div>
              <div style={{ fontWeight: 700, color: 'var(--brand-navy)', marginBottom: '0.5rem' }}>
                {complaint.assignedOfficer?.name || 'Self-Managing'}
              </div>
              <button disabled className="text-xs text-gray-400 font-medium cursor-not-allowed">
                Re-assign Authority (Coming Soon)
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
