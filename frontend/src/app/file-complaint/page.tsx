'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Clock, Phone } from 'lucide-react';
import { ComplaintForm } from '@/components/features/complaints/ComplaintForm';
import { SuccessScreen } from '@/components/features/complaints/SuccessScreen';
import styles from './page.module.css';

export default function FileComplaintPage() {
  const [submissionResult, setSubmissionResult] = useState<{
    trackingId: string;
    department: string;
  } | null>(null);

  return (
    <div className={styles.pageWrapper}>
      <div className="page-band">
        <div className="page-band-inner">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span>›</span> <span>File a complaint</span>
          </nav>
          <h1>{submissionResult ? 'Complaint submitted' : 'File a complaint'}</h1>
          <p className="lead">
            {submissionResult
              ? 'Keep your tracking ID safe. You will need it to check progress.'
              : 'Report a civic issue to the right department. It takes about 3 minutes and your draft is saved automatically.'}
          </p>
        </div>
      </div>

      <div className={styles.container}>
        {!submissionResult ? (
          <div className={styles.layout}>
            <div className={styles.formSection}>
              <ComplaintForm onSuccess={(result) => setSubmissionResult(result)} />
            </div>

            <aside className={styles.aside}>
              <div className={styles.asideCard}>
                <h2>Before you start</h2>
                <ul className={styles.checklist}>
                  <li><Check size={16} strokeWidth={3} /> Date and time of the incident</li>
                  <li><Check size={16} strokeWidth={3} /> Exact location or landmark</li>
                  <li><Check size={16} strokeWidth={3} /> Photos or documents, if you have them</li>
                  <li><Check size={16} strokeWidth={3} /> Any previous complaint numbers</li>
                </ul>
              </div>

              <div className={styles.asideCard}>
                <h2><Clock size={18} /> What happens next</h2>
                <p>Your complaint is reviewed within 48 hours and assigned to an officer. Most cases get a first response within 7–15 working days.</p>
              </div>

              <div className={`${styles.asideCard} ${styles.warning}`}>
                <h2><Phone size={18} /> Is it an emergency?</h2>
                <p>Do not use this form. Call <strong>112</strong> for police, fire or ambulance.</p>
              </div>

              <p className={styles.legalNote}>
                Filing a false complaint is an offence under Section 217 of the Bharatiya Nyaya Sanhita, 2023 (formerly Section 182 IPC).
              </p>
            </aside>
          </div>
        ) : (
          <div className={styles.successSection}>
            <SuccessScreen
              trackingId={submissionResult.trackingId}
              department={submissionResult.department}
            />
          </div>
        )}
      </div>
    </div>
  );
}
