import React from 'react';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getBreachNotices, markBreachReported, reportBreach } from '@/services/server';
import cards from '@/components/features/bookings/BookingCard.module.css';
import table from '../../officer/complaints/complaints.module.css';
import form from '../../lawyer/profile/profile.module.css';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

// datetime-local gives "YYYY-MM-DDTHH:mm" in the admin's own time, which we take as IST.
const fromLocalIst = (value: string) => (value ? new Date(`${value}:00+05:30`).toISOString() : null);

export default async function BreachesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; error?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const { notices, error: loadError } = await getBreachNotices();
  const renderedAt = new Date().getTime();

  async function create(fd: FormData) {
    'use server';
    const allUsers = fd.get('scope') === 'all';
    const res = await reportBreach({
      title: String(fd.get('title') || '').trim(),
      description: String(fd.get('description') || '').trim(),
      likelyConsequences: String(fd.get('likelyConsequences') || '').trim(),
      mitigation: String(fd.get('mitigation') || '').trim(),
      occurredAt: fromLocalIst(String(fd.get('occurredAt') || '')),
      detectedAt: fromLocalIst(String(fd.get('detectedAt') || '')) ?? new Date().toISOString(),
      allUsers,
      affectedEmails: allUsers ? [] : String(fd.get('emails') || '').split(/[\s,;]+/).filter(Boolean),
    });
    revalidatePath('/dashboard/admin/breaches');
    redirect(
      res.success
        ? `/dashboard/admin/breaches?saved=${res.notice?.notifiedCount ?? 0}`
        : `/dashboard/admin/breaches?new=1&error=${encodeURIComponent(res.error || 'Could not save')}`
    );
  }

  async function markReported(fd: FormData) {
    'use server';
    const res = await markBreachReported(String(fd.get('id')), fd.get('which') === 'board' ? 'board' : 'certIn');
    revalidatePath('/dashboard/admin/breaches');
    redirect(res.success ? '/dashboard/admin/breaches' : `/dashboard/admin/breaches?error=${encodeURIComponent(res.error || 'Could not save')}`);
  }

  return (
    <div className={table.container}>
      <header className={table.header}>
        <h1>Data breaches</h1>
        <p>
          If personal data may have been exposed, lost or altered: report it to <strong>CERT-In within 6 hours</strong> of
          noticing (CERT-In directions, 28 April 2022), tell every affected person without delay, and send the Data
          Protection Board a detailed report <strong>within 72 hours</strong> (DPDP Act 2023 s.8(6) and DPDP Rules 2025).
          This page notifies affected people in the app and tracks the two deadlines. The reports to CERT-In and the
          Board are filed on their own portals or by email.
        </p>
      </header>

      {sp.error && <div className={`${cards.banner} ${cards.bannerError}`} role="alert">{sp.error}</div>}
      {sp.saved && (
        <div className={`${cards.banner} ${cards.bannerOk}`} role="status">
          Recorded. {sp.saved} {sp.saved === '1' ? 'person was' : 'people were'} notified in the app. Email them too
          once an email provider is set up.
        </div>
      )}
      {loadError && <div className={`${cards.banner} ${cards.bannerError}`} role="alert">Couldn&apos;t load: {loadError}</div>}

      {sp.new ? (
        <form action={create} className={form.form}>
          <fieldset className={form.group}>
            <legend>Record a breach and notify people</legend>
            <label className={form.field}>
              <span>Short title</span>
              <input name="title" required minLength={5} maxLength={200} />
            </label>
            <label className={form.field}>
              <span>What happened (in plain language; this is sent to people)</span>
              <textarea name="description" required minLength={20} maxLength={4000} rows={3} />
            </label>
            <label className={form.field}>
              <span>Likely consequences for them</span>
              <textarea name="likelyConsequences" required minLength={10} maxLength={2000} rows={2} />
            </label>
            <label className={form.field}>
              <span>What we have done, and what they should do</span>
              <textarea name="mitigation" required minLength={10} maxLength={2000} rows={2} />
            </label>
            <div className={form.row}>
              <label className={form.field}>
                <span>When it happened (IST, if known)</span>
                <input name="occurredAt" type="datetime-local" />
              </label>
              <label className={form.field}>
                <span>When we noticed (IST); deadlines run from here</span>
                <input name="detectedAt" type="datetime-local" required />
              </label>
            </div>
            <label className={form.toggle}>
              <input type="radio" name="scope" value="some" defaultChecked />
              <span>Only these accounts:</span>
            </label>
            <label className={form.field}>
              <textarea name="emails" rows={2} placeholder="Emails, separated by commas or new lines" aria-label="Affected emails" />
            </label>
            <label className={form.toggle}>
              <input type="radio" name="scope" value="all" />
              <span>Everyone with an account</span>
            </label>
          </fieldset>
          <div className={cards.buttons}>
            <button type="submit" className={cards.dangerBtn}>Record and notify</button>
            <Link href="/dashboard/admin/breaches" className={cards.secondaryBtn}>Cancel</Link>
          </div>
        </form>
      ) : (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <Link href="/dashboard/admin/breaches?new=1" className={cards.dangerBtn}>Record a breach</Link>
          </div>
          {notices.length === 0 ? (
            <div className={cards.empty}>No breaches recorded.</div>
          ) : (
            <div className={cards.list}>
              {notices.map((n) => (
                <article key={n.id} className={cards.card}>
                  <div className={cards.top}>
                    <div>
                      <p className={cards.partyLabel}>Noticed {formatTime(n.detectedAt)} IST</p>
                      <h3 className={cards.partyName}>{n.title}</h3>
                    </div>
                    <span className={table.secondaryText}>
                      {n.notifiedCount} notified{n.allUsers ? ' (everyone)' : ''}
                    </span>
                  </div>
                  <p className={cards.description}>{n.description}</p>
                  <div className={cards.actions}>
                    <Deadline
                      label="CERT-In (6 hours)"
                      due={n.certInDueAt}
                      done={n.certInReportedAt}
                      now={renderedAt}
                      id={n.id}
                      which="certIn"
                      action={markReported}
                    />
                    <Deadline
                      label="Data Protection Board (72 hours)"
                      due={n.boardDueAt}
                      done={n.boardReportedAt}
                      now={renderedAt}
                      id={n.id}
                      which="board"
                      action={markReported}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Deadline({
  label,
  due,
  done,
  now,
  id,
  which,
  action,
}: {
  label: string;
  due: string;
  done: string | null;
  now: number;
  id: string;
  which: 'certIn' | 'board';
  action: (fd: FormData) => Promise<void>;
}) {
  const late = !done && new Date(due).getTime() < now;
  return (
    <form action={action} className={cards.actionForm} style={{ alignItems: 'center', marginBottom: '0.4rem' }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="which" value={which} />
      <span style={{ flex: '1 1 260px', fontSize: '0.875rem' }}>
        <strong>{label}:</strong>{' '}
        {done ? (
          <span style={{ color: 'var(--green)' }}>reported {formatTime(done)}</span>
        ) : (
          <span style={{ color: late ? 'var(--red)' : 'var(--orange)' }}>
            {late ? 'overdue, was due' : 'due by'} {formatTime(due)}
          </span>
        )}
      </span>
      {!done && <button type="submit" className={cards.secondaryBtn}>Mark as reported now</button>}
    </form>
  );
}
