import React from 'react';
import { AlertTriangle, ExternalLink, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import type { Authority } from '@/services/legal';
import styles from './AuthorityCard.module.css';

const SCOPE_LABEL = { DISTRICT: 'Your district', STATE: 'Your state', NATIONAL: 'Nationwide' } as const;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** One directory entry, always with its source and when it was last checked against it. */
export function AuthorityCard({ authority, children }: { authority: Authority; children?: React.ReactNode }) {
  const a = authority;
  const where = a.state ? [a.district, a.state].filter(Boolean).join(', ') : 'All of India';
  // The public lookup computes needsRecheck; admin listings derive it from the date alone.
  const stale = a.needsRecheck ?? !a.lastVerifiedAt;

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div>
          <p className={styles.meta}>
            {a.department}
            {a.scope ? ` · ${SCOPE_LABEL[a.scope]}` : ` · ${where}`}
          </p>
          <h3 className={styles.name}>{a.name}</h3>
        </div>
        {a.submissionUrl && (
          <a href={a.submissionUrl} target="_blank" rel="noopener noreferrer" className={styles.submitLink}>
            Open official portal <ExternalLink size={14} />
          </a>
        )}
      </div>

      <p className={styles.how}>{a.howToSubmit}</p>

      {(a.phone || a.email || a.address) && (
        <ul className={styles.contact}>
          {a.phone && <li><Phone size={14} /> <a href={`tel:${a.phone}`}>{a.phone}</a></li>}
          {a.email && <li><Mail size={14} /> <a href={`mailto:${a.email}`}>{a.email}</a></li>}
          {a.address && <li><MapPin size={14} /> {a.address}</li>}
        </ul>
      )}

      {a.categories.length > 0 && <p className={styles.categories}>Handles: {a.categories.join(', ')}</p>}

      <p className={`${styles.verified} ${stale ? styles.stale : ''}`}>
        {stale ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
        <span>
          {a.lastVerifiedAt ? `Checked ${formatDate(a.lastVerifiedAt)}` : 'Not yet checked by our team'}
          {stale && a.lastVerifiedAt ? ', a while ago' : ''} against{' '}
          <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer">the official source</a>.
          {stale && ' Confirm the details there before you send anything.'}
        </span>
      </p>

      {children}
    </article>
  );
}
