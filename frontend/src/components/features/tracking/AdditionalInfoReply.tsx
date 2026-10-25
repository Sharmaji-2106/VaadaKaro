'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { replyToInfoRequest } from '@/services/complaints';
import styles from './AdditionalInfoReply.module.css';

export default function AdditionalInfoReply({ complaintId }: { complaintId: string }) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('complaintId', complaintId);
    formData.append('message', message);

    const result = await replyToInfoRequest(formData);
    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
      setMessage('');
    }
  };

  if (isSuccess) {
    return (
      <div className={`${styles.card} ${styles.success}`}>
        <CheckCircle2 size={32} className={styles.successIcon} />
        <h3>Response sent</h3>
        <p>The officer has your reply. Your status is now Under Review.</p>
        <button onClick={() => setIsSuccess(false)} className={styles.linkBtn}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <AlertCircle size={18} />
        <h3>More information needed</h3>
      </div>

      <p className={styles.desc}>
        The reviewing officer has asked for more details before they can proceed.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          className={styles.textarea}
          placeholder="Type your response…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <div className={styles.footer}>
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className={styles.submitBtn}
          >
            {isSubmitting ? 'Sending…' : 'Send to Officer'}
          </button>
        </div>
      </form>
    </div>
  );
}
