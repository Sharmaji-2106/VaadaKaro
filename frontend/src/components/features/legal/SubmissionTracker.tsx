'use client';

import React, { useState } from 'react';
import { recordSubmission, type LegalDocument, type SubmissionStatus } from '@/services/legal';
import styles from './legal.module.css';

const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

/**
 * Draft → sent → reply, as the citizen tells us. VaadaKaro never sends the letter, so every
 * label makes clear this is the citizen's own record, not a confirmation from the office.
 */
export default function SubmissionTracker({ document: initial }: { document: LegalDocument }) {
  const [doc, setDoc] = useState(initial);
  const [form, setForm] = useState<'SUBMITTED' | 'RESPONDED' | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (status: SubmissionStatus, data: Record<string, string> = {}) => {
    setSaving(true);
    setError('');
    const result = await recordSubmission(doc.id, {
      status,
      submittedTo: data.submittedTo ?? doc.submittedTo ?? undefined,
      submissionReference: data.submissionReference ?? doc.submissionReference ?? undefined,
      submittedOn: data.submittedOn ?? doc.submittedOn ?? undefined,
      ...data,
    });
    setSaving(false);
    if (result.success) {
      setDoc(result.document);
      setForm(null);
    } else {
      setError(result.error);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    save(form!, data);
  };

  return (
    <div className={styles.tracker}>
      <div className={styles.trackerRow}>
        <span className={styles.trackerBadge} data-status={doc.submissionStatus}>
          {doc.submissionStatus === 'DRAFT' ? 'Draft, not sent' : doc.submissionStatus === 'SUBMITTED' ? 'You sent it' : 'Reply received'}
        </span>
        <span className={styles.trackerText}>
          {doc.submissionStatus === 'DRAFT' && 'Only you have this. Nothing has been submitted for you.'}
          {doc.submissionStatus !== 'DRAFT' && (
            <>
              To {doc.submittedTo} on {formatDate(doc.submittedOn)}
              {doc.submissionReference && <> · Ref. {doc.submissionReference}</>}
            </>
          )}
        </span>
        {!form && (
          <span className={styles.trackerActions}>
            {doc.submissionStatus === 'DRAFT' && (
              <button type="button" className={styles.textBtn} onClick={() => setForm('SUBMITTED')}>I sent it</button>
            )}
            {doc.submissionStatus === 'SUBMITTED' && (
              <button type="button" className={styles.textBtn} onClick={() => setForm('RESPONDED')}>I got a reply</button>
            )}
            {doc.submissionStatus !== 'DRAFT' && (
              <button type="button" className={styles.textBtn} disabled={saving} onClick={() => save('DRAFT')}>
                Mark as not sent
              </button>
            )}
          </span>
        )}
      </div>

      {doc.submissionStatus === 'RESPONDED' && doc.responseNote && (
        <p className={styles.trackerNote}>
          <strong>Reply on {formatDate(doc.respondedOn)}:</strong> {doc.responseNote}
        </p>
      )}

      {form && (
        <form className={styles.trackerForm} onSubmit={onSubmit}>
          {form === 'SUBMITTED' ? (
            <>
              <label>
                <span>Sent to</span>
                <input name="submittedTo" required maxLength={200} placeholder="e.g. Ward office, K-East" />
              </label>
              <label>
                <span>Reference or acknowledgement no. (optional)</span>
                <input name="submissionReference" maxLength={120} />
              </label>
              <label>
                <span>Date sent</span>
                <input name="submittedOn" type="date" max={today()} defaultValue={today()} required />
              </label>
            </>
          ) : (
            <>
              <label className={styles.trackerWide}>
                <span>What did they say?</span>
                <textarea name="responseNote" required maxLength={2000} rows={2} />
              </label>
              <label>
                <span>Date of reply</span>
                <input name="respondedOn" type="date" max={today()} defaultValue={today()} required />
              </label>
            </>
          )}
          <div className={styles.editorActions}>
            <button type="button" className={styles.textBtn} onClick={() => setForm(null)}>Cancel</button>
            <button type="submit" className={styles.primaryBtn} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      )}
      {error && <p className={styles.trackerError} role="alert">{error}</p>}
    </div>
  );
}
