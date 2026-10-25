import React from 'react';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  assignOfficer,
  getAssignableOfficers,
  getComplaintDetails,
  updateComplaintStatus,
  type ComplaintStatus,
} from '@/services/server';
import { complaintPdfUrl } from '@/services/legal';
import styles from './details.module.css';
import {
  ChevronLeft,
  Clock,
  AlertTriangle,
  Download,
  Paperclip
} from 'lucide-react';
import Link from 'next/link';

const toLabel = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default async function ComplaintDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const result = await getComplaintDetails(id);
  const complaint = result.complaint as any;
  const pagePath = `/dashboard/officer/complaints/${id}`;

  if (!result.success || !complaint) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h2>Complaint not found</h2>
          <p>It may have been removed, or the link is incorrect.</p>
          <Link href="/dashboard/officer/complaints" className={styles.backBtn}>
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

    const res = await updateComplaintStatus({
      complaintId: id,
      status,
      remarks,
      internalNotes
    });
    revalidatePath(pagePath);
    redirect(res.success ? pagePath : `${pagePath}?error=${encodeURIComponent(res.error || 'Update failed')}`);
  }

  async function handleAssign(formData: FormData) {
    'use server';
    const res = await assignOfficer(id, String(formData.get('officerId') || ''));
    revalidatePath(pagePath);
    redirect(res.success ? pagePath : `${pagePath}?error=${encodeURIComponent(res.error || 'Assignment failed')}`);
  }

  const officers = await getAssignableOfficers(complaint.department);

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <Link href="/dashboard/officer/complaints" className={styles.backLink}>
          <ChevronLeft size={16} /> Complaints
        </Link>
        <a href={complaintPdfUrl(complaint.id)} download className={styles.pdfLink}>
          <Download size={15} /> PDF
        </a>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.mainContent}>
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <span className={styles.trackingId}>#{complaint.trackingId.split('-').pop()}</span>
              <h1 className={styles.title}>{complaint.title}</h1>

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
                  <div className={`${styles.infoValue} ${complaint.priority === 'URGENT' ? styles.urgent : ''}`}>
                    {toLabel(complaint.priority)}
                  </div>
                </div>
                <div>
                  <div className={styles.infoLabel}>Submitted</div>
                  <div className={styles.infoValue}>
                    {createdAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              </div>

              <div className={styles.descriptionBox}>
                <p>{complaint.description}</p>
              </div>

              {complaint.attachments && complaint.attachments.length > 0 && (
                <div className={styles.attachments}>
                  <div className={styles.infoLabel}>Attachments</div>
                  <div className={styles.attachmentGrid}>
                    {complaint.attachments.map((file: any) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.attachment}
                      >
                        <Paperclip size={14} />
                        <span>{file.filename}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Citizen</h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.citizenRow}>
                <div className={styles.avatar}>
                  {complaint.citizen?.name?.charAt(0) || 'C'}
                </div>
                <div className={styles.infoValue}>{complaint.citizen?.name}</div>
              </div>
              <div className={styles.infoGrid}>
                <div>
                  <div className={styles.infoLabel}>Phone</div>
                  <div className={styles.infoValue}>{complaint.citizen?.phone || 'Not provided'}</div>
                </div>
                <div>
                  <div className={styles.infoLabel}>Email</div>
                  <div className={styles.infoValue}>{complaint.citizen?.email}</div>
                </div>
                <div>
                  <div className={styles.infoLabel}>Location</div>
                  <div className={styles.infoValue}>{complaint.location || 'Not specified'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>History</h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.timeline}>
                {complaint.updates.map((update: any, i: number) => (
                  <div key={`${update.createdAt}-${i}`} className={styles.timelineItem}>
                    <div className={styles.timelineDot} />
                    <div className={styles.timelineMeta}>
                      <span className={styles.timelineStatus}>{toLabel(update.status)}</span>
                      <span className={styles.timelineDate}>
                        {update.updatedBy} · {new Date(update.createdAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className={styles.timelineContent}>{update.remarks}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actionPanel}>
          <div className={isDelayed ? styles.slaCard : `${styles.slaCard} ${styles.slaNormal}`}>
            {isDelayed ? <AlertTriangle size={16} /> : <Clock size={16} />}
            <span>{timeSince === 0 ? 'Filed today' : `${timeSince} day${timeSince === 1 ? '' : 's'} open`}</span>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Update</h2>
            </div>
            <div className={styles.cardContent}>
              <form action={handleUpdate}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Status</label>
                  <select name="status" className={styles.select} defaultValue={complaint.status}>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="INFO_REQUESTED">Request More Information</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Remarks <span className={styles.hint}>Visible to citizen</span></label>
                  <textarea
                    name="remarks"
                    className={styles.textarea}
                    placeholder="What changed, and what happens next?"
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Internal notes <span className={styles.hint}>Private</span></label>
                  <textarea
                    name="internalNotes"
                    className={`${styles.textarea} ${styles.privateNotes}`}
                    placeholder="Verification steps, evidence notes…"
                    defaultValue={complaint.internalNotes || ''}
                  />
                </div>

                <button type="submit" className={styles.updateBtn}>
                  Save Update
                </button>
              </form>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Assignment</h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.assignedRow}>
                <span className={styles.infoLabel}>Assigned to</span>
                <span className={styles.infoValue}>
                  {complaint.assignedOfficer ? complaint.assignedOfficer.name || complaint.assignedOfficer.email : 'Nobody yet'}
                </span>
              </div>
              {officers.length > 0 ? (
                <form action={handleAssign} className={styles.assignForm}>
                  <select
                    name="officerId"
                    className={styles.select}
                    defaultValue={complaint.assignedOfficer?.id ?? ''}
                    required
                    aria-label="Officer"
                  >
                    <option value="" disabled>Choose an officer</option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.id}>{o.name || o.email}</option>
                    ))}
                  </select>
                  <button type="submit" className={styles.assignBtn}>Assign</button>
                </form>
              ) : (
                <p className={styles.hint}>No officers are registered for {complaint.department} yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
