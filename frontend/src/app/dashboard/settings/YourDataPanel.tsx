'use client';

import React, { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { deleteAccount } from '@/services/auth';
import { getPrivacyStatus, removeNominee, setAiConsent, setNominee, type PrivacyStatus } from '@/services/privacy';
import styles from './settings.module.css';
import data from './your-data.module.css';

/** Download a copy of everything stored, or delete the account (see backend app/api/routes/account.py). */
export default function YourDataPanel() {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  const [privacy, setPrivacy] = useState<PrivacyStatus | null>(null);
  const [editingNominee, setEditingNominee] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    getPrivacyStatus().then((r) => r.success && setPrivacy(r.data));
  }, []);

  const apply = (r: { success: true; data: PrivacyStatus } | { success: false; error: string }, ok: string) => {
    if (r.success) {
      setPrivacy(r.data);
      setMessage({ text: ok, error: false });
    } else {
      setMessage({ text: r.error, error: true });
    }
  };

  const onNominee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await setNominee({
      name: String(fd.get('name') || ''),
      relation: String(fd.get('relation') || ''),
      email: String(fd.get('email') || ''),
      phone: String(fd.get('phone') || ''),
    });
    apply(r, 'Nominee saved.');
    if (r.success) setEditingNominee(false);
  };

  return (
    <>
      {message && (
        <p className={message.error ? data.error : data.status} role={message.error ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}

      <div className={styles.settingItem}>
        <div className={styles.settingInfo}>
          <h3>AI processing</h3>
          <p>
            Lets the letter drafter and legal assistant send what you type to Google Gemini. Withdrawing stops it at
            once and erases your legal assistant history; documents you chose to save are kept.
          </p>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={!!privacy?.aiConsent}
            disabled={!privacy}
            onChange={async (e) =>
              apply(
                await setAiConsent(e.target.checked),
                e.target.checked ? 'AI processing turned on.' : 'Consent withdrawn and legal assistant history erased.'
              )
            }
            aria-label="Allow AI processing"
          />
          <span className={styles.slider}></span>
        </label>
      </div>

      <div className={styles.settingItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div className={data.row}>
          <div className={styles.settingInfo}>
            <h3>Nominee</h3>
            <p>
              {privacy?.nominee
                ? `${privacy.nominee.name} (${privacy.nominee.relation}) can use your data rights if you die or cannot act.`
                : 'Someone who can use your data rights if you die or cannot act (DPDP Act, 2023, section 14).'}
            </p>
          </div>
          {!editingNominee && (
            <span className={data.actions}>
              <button type="button" className={data.secondaryBtn} onClick={() => setEditingNominee(true)}>
                {privacy?.nominee ? 'Change' : 'Add'}
              </button>
              {privacy?.nominee && (
                <button type="button" className={data.secondaryBtn} onClick={async () => apply(await removeNominee(), 'Nominee removed.')}>
                  Remove
                </button>
              )}
            </span>
          )}
        </div>
        {editingNominee && (
          <form className={data.confirm} onSubmit={onNominee}>
            <label><span>Name</span><input name="name" required minLength={2} maxLength={100} defaultValue={privacy?.nominee?.name} /></label>
            <label><span>Relation to you</span><input name="relation" required minLength={2} maxLength={60} defaultValue={privacy?.nominee?.relation} /></label>
            <label><span>Email</span><input name="email" type="email" defaultValue={privacy?.nominee?.email ?? ''} /></label>
            <label><span>Phone</span><input name="phone" inputMode="tel" defaultValue={privacy?.nominee?.phone ?? ''} /></label>
            <p className={data.note}>Give an email or a phone number so we can reach them.</p>
            <div className={data.actions}>
              <button type="button" className={data.secondaryBtn} onClick={() => setEditingNominee(false)}>Cancel</button>
              <button type="submit" className={data.primaryBtn}>Save nominee</button>
            </div>
          </form>
        )}
      </div>

      <div className={styles.settingItem}>
        <div className={styles.settingInfo}>
          <h3>Correct something, or complain</h3>
          <p>Requests go to our Grievance Officer: acknowledged at once, answered within 15 days.</p>
        </div>
        <Link href="/grievance" className={data.secondaryBtn}>Open</Link>
      </div>
      <div className={styles.settingItem}>
        <div className={styles.settingInfo}>
          <h3>Download my data</h3>
          <p>Your account, complaints, documents, consultations and notifications as one JSON file.</p>
        </div>
        <a href="/api/v1/account/export" download className={data.secondaryBtn}>Download</a>
      </div>

      <div className={styles.settingItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div className={data.row}>
          <div className={styles.settingInfo}>
            <h3>Delete my account</h3>
            <p>Permanent. Staff accounts are closed by an administrator instead.</p>
          </div>
          {!confirming && (
            <button type="button" className={data.dangerBtn} onClick={() => setConfirming(true)}>Delete…</button>
          )}
        </div>

        {confirming && (
          <form action={action} className={data.confirm}>
            <p>When you delete your account:</p>
            <ul>
              <li>Your profile, saved documents, assistant history, notifications and uploaded files are deleted.</li>
              <li>Complaints no officer has acted on yet are deleted.</li>
              <li>
                Complaints a department is already handling stay in its records, without your name, address, PIN code
                or attachments, so the work on them isn&apos;t lost.
              </li>
              <li>Open lawyer consultations are cancelled and the lawyer is told.</li>
            </ul>
            <p>
              Download your data first if you want a copy. Read more in the <Link href="/privacy">privacy policy</Link>.
            </p>
            <label>
              <span>Password</span>
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <label>
              <span>Type DELETE to confirm</span>
              <input name="confirm" autoComplete="off" required pattern="DELETE" />
            </label>
            {state?.error && <p className={data.error} role="alert">{state.error}</p>}
            <div className={data.actions}>
              <button type="button" className={data.secondaryBtn} onClick={() => setConfirming(false)}>Cancel</button>
              <button type="submit" className={data.dangerBtn} disabled={pending}>
                {pending ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
