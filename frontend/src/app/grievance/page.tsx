'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Mail } from 'lucide-react';
import {
  getGrievanceOfficer,
  getMyGrievances,
  submitGrievance,
  trackGrievance,
  type Grievance,
  type GrievanceOfficer,
  type RequestType,
} from '@/services/privacy';
import styles from './grievance.module.css';

const TYPES: { value: RequestType; label: string; hint: string }[] = [
  { value: 'ACCESS', label: 'See the data you hold about me', hint: 'Signed in? Settings › Your data › Download gives it to you at once.' },
  { value: 'CORRECTION', label: 'Correct or update my data', hint: 'Say what is wrong and what it should be.' },
  { value: 'ERASURE', label: 'Erase my data', hint: 'Signed in? You can delete your account yourself in Settings.' },
  { value: 'NOMINATION', label: 'Act for someone who has died or cannot act', hint: 'Say how you are related; we will ask for proof by email.' },
  { value: 'PRIVACY_GRIEVANCE', label: 'Complain about how my data was handled', hint: 'What happened, and when.' },
  { value: 'CONTENT_COMPLAINT', label: 'Report unlawful content or misuse of the platform', hint: 'Include the tracking ID or page, if you have it.' },
  { value: 'OTHER', label: 'Something else', hint: '' },
];

const STATUS_LABEL: Record<Grievance['status'], string> = {
  ACKNOWLEDGED: 'Received',
  IN_PROGRESS: 'Being looked at',
  RESOLVED: 'Answered',
  REJECTED: 'Closed',
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function GrievancePage() {
  const [officer, setOfficer] = useState<GrievanceOfficer | null>(null);
  const [mine, setMine] = useState<Grievance[] | null>(null); // null: not signed in (or still loading)
  const [type, setType] = useState<RequestType>('ACCESS');
  const [sent, setSent] = useState<Grievance | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [tracked, setTracked] = useState<Grievance | null>(null);
  const [trackError, setTrackError] = useState('');

  useEffect(() => {
    getGrievanceOfficer().then((r) => r.success && setOfficer(r.data));
    getMyGrievances().then((r) => setMine(r.success ? r.data : null));
  }, []);

  const signedIn = mine !== null;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // currentTarget is null once we await, so keep the form.
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSending(true);
    setError('');
    const result = await submitGrievance({
      type,
      details: String(fd.get('details') || ''),
      name: signedIn ? undefined : String(fd.get('name') || ''),
      email: signedIn ? undefined : String(fd.get('email') || ''),
    });
    setSending(false);
    if (result.success) {
      setSent(result.data);
      setMine((prev) => (prev ? [result.data, ...prev] : prev));
      form.reset();
    } else {
      setError(result.error);
    }
  };

  const onTrack = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setTrackError('');
    const result = await trackGrievance(String(fd.get('reference') || ''), String(fd.get('email') || ''));
    if (result.success) setTracked(result.data);
    else {
      setTracked(null);
      setTrackError('No request matches that reference and email.');
    }
  };

  const hint = TYPES.find((t) => t.value === type)?.hint;

  return (
    <>
      <div className="page-band">
        <div className="page-band-inner">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span>›</span> <span>Grievance Officer</span>
          </nav>
          <h1>Grievance Officer</h1>
          <p className="lead">
            Requests about your personal data, and complaints about VaadaKaro itself. This is not where you file a
            civic complaint: for that, <Link href="/file-complaint">file a complaint</Link>.
          </p>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.layout}>
          <main>
            {sent ? (
              <div className={styles.sent} role="status">
                <CheckCircle2 size={22} />
                <div>
                  <h2>Request {sent.reference} received</h2>
                  <p>
                    You&apos;ll get a reply by <strong>{formatDate(sent.dueAt)}</strong>.{' '}
                    {signedIn
                      ? 'It will appear below and in your notifications.'
                      : 'Keep the reference: with your email it lets you check the status below.'}
                  </p>
                  <button type="button" className={styles.linkBtn} onClick={() => setSent(null)}>Send another request</button>
                </div>
              </div>
            ) : (
              <form className={styles.card} onSubmit={onSubmit}>
                <h2>Send a request</h2>
                <label className={styles.field}>
                  <span>What do you need?</span>
                  <select value={type} onChange={(e) => setType(e.target.value as RequestType)}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {hint && <small>{hint}</small>}
                </label>
                {!signedIn && (
                  <div className={styles.row}>
                    <label className={styles.field}>
                      <span>Your name</span>
                      <input name="name" required maxLength={100} autoComplete="name" />
                    </label>
                    <label className={styles.field}>
                      <span>Email for the reply</span>
                      <input name="email" type="email" required autoComplete="email" />
                    </label>
                  </div>
                )}
                <label className={styles.field}>
                  <span>Details</span>
                  <textarea name="details" required minLength={10} maxLength={4000} rows={5} />
                  <small>Don&apos;t include ID numbers (Aadhaar, PAN). We will ask if we need to confirm who you are.</small>
                </label>
                {error && <p className={styles.error} role="alert">{error}</p>}
                <button type="submit" className={styles.primaryBtn} disabled={sending}>
                  {sending ? 'Sending…' : 'Send request'}
                </button>
              </form>
            )}

            {signedIn && mine.length > 0 && (
              <section className={styles.card}>
                <h2>Your requests</h2>
                <ul className={styles.requests}>
                  {mine.map((g) => <RequestRow key={g.id} g={g} />)}
                </ul>
              </section>
            )}

            {!signedIn && (
              <form className={styles.card} onSubmit={onTrack}>
                <h2>Check a request</h2>
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span>Reference</span>
                    <input name="reference" required placeholder="GRV-20261026-AB12CD" />
                  </label>
                  <label className={styles.field}>
                    <span>Email you used</span>
                    <input name="email" type="email" required />
                  </label>
                </div>
                {trackError && <p className={styles.error} role="alert">{trackError}</p>}
                <button type="submit" className={styles.secondaryBtn}>Check status</button>
                {tracked && <ul className={styles.requests}><RequestRow g={tracked} /></ul>}
              </form>
            )}
          </main>

          <aside className={styles.card}>
            <h2>Who answers</h2>
            <p className={styles.officer}>
              <strong>{officer?.name || 'Grievance Officer, VaadaKaro'}</strong>
              <br />
              <Mail size={14} /> <a href={`mailto:${officer?.email ?? 'grievance@vaadakaro.in'}`}>{officer?.email ?? 'grievance@vaadakaro.in'}</a>
              {officer?.address && (
                <>
                  <br />
                  {officer.address}
                </>
              )}
            </p>
            <h3><Clock size={15} /> Timelines</h3>
            <ul className={styles.timeline}>
              <li>Acknowledged within <strong>{officer?.acknowledgeWithinHours ?? 24} hours</strong> (here, straight away).</li>
              <li>Answered within <strong>{officer?.resolveWithinDays ?? 15} days</strong>.</li>
            </ul>
            <p className={styles.small}>
              Set by the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and
              used for your rights under the Digital Personal Data Protection Act, 2023.
            </p>
            <p className={styles.small}>
              Not satisfied with our answer on a personal-data matter? You may complain to the Data Protection Board of
              India.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}

function RequestRow({ g }: { g: Grievance }) {
  const open = g.status === 'ACKNOWLEDGED' || g.status === 'IN_PROGRESS';
  return (
    <li className={styles.request}>
      <div className={styles.requestTop}>
        <span className={styles.reference}>{g.reference}</span>
        <span className={styles.status} data-status={g.status}>{STATUS_LABEL[g.status]}</span>
      </div>
      <p className={styles.small}>
        {TYPES.find((t) => t.value === g.type)?.label} · sent {formatDate(g.createdAt)}
        {open ? ` · reply due by ${formatDate(g.dueAt)}` : g.resolvedAt ? ` · answered ${formatDate(g.resolvedAt)}` : ''}
      </p>
      {g.response && <p className={styles.response}>{g.response}</p>}
    </li>
  );
}
