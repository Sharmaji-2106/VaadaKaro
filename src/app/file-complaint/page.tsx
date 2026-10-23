'use client';

import { useState } from 'react';
import { Scale, AlertCircle } from 'lucide-react';
import { ComplaintForm } from '@/components/features/complaints/ComplaintForm';
import { SuccessScreen } from '@/components/features/complaints/SuccessScreen';
import styles from './page.module.css';

export default function FileComplaintPage() {
  const [submissionResult, setSubmissionResult] = useState<{
    trackingId: string;
    department: string;
  } | null>(null);

  // In a real scenario, the ComplaintForm would call the server action 
  // and we would call setSubmissionResult with the result.
  // For demonstration, I'll add a mock handler that the form can call.

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {!submissionResult ? (
          <div className={styles.formSection}>
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <Scale size={40} />
              </div>
              <h1>Lodge a Formal Grievance</h1>
              <p>Your submission will be processed under standard government redressal guidelines. Please ensure all details are accurate to avoid delays.</p>
            </div>
            
            <div className={styles.guidanceBanner}>
              <AlertCircle size={20} />
              <p><b>Note:</b> Filing false complaints is a punishable offense under IPC Section 182. Please provide authentic evidence.</p>
            </div>

            <ComplaintForm 
              onSuccess={(result) => setSubmissionResult(result)} 
            />
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
