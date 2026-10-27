import React from 'react';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminGrievances, updateGrievance } from '@/services/server';
import type { Grievance } from '@/services/privacy';
import cards from '@/components/features/bookings/BookingCard.module.css';
import table from '../../officer/complaints/complaints.module.css';

const TYPE_LABEL: Record<Grievance['type'], string> = {
  ACCESS: 'Access to data (DPDP s.11)',
  CORRECTION: 'Correction (DPDP s.12)',
  ERASURE: 'Erasure (DPDP s.12)',
  NOMINATION: 'Nominee acting (DPDP s.14)',
  PRIVACY_GRIEVANCE: 'Privacy grievance (DPDP s.13)',
  CONTENT_COMPLAINT: 'Content / misuse (IT Rules r.3(2))',
  OTHER: 'Other',
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function AdminGrievancesPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string; error?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const openOnly = sp.all !== '1';
  const { grievances, error: loadError } = await getAdminGrievances(openOnly);
  const overdue = grievances.filter((g) => g.overdue).length;

  async function respond(fd: FormData) {
    'use server';
    const res = await updateGrievance(
      String(fd.get('id')),
      String(fd.get('status')) as Grievance['status'],
      String(fd.get('response') || '').trim()
    );
    const qs = new URLSearchParams(openOnly ? {} : { all: '1' });
    qs.set(res.success ? 'saved' : 'error', res.success ? '1' : res.error || 'Could not save');
    revalidatePath('/dashboard/admin/grievances');
    redirect(`/dashboard/admin/grievances?${qs}`);
  }

  return (
    <div className={table.container}>
      <header className={table.header}>
        <h1>Grievance Officer</h1>
        <p>
          Data-rights requests and complaints about the platform. Each is acknowledged automatically when it arrives
          and must be answered within 15 days (IT Rules 2021, rule 3(2)). The reply you write here is what the person
          receives.
        </p>
      </header>

      {sp.error && <div className={`${cards.banner} ${cards.bannerError}`} role="alert">{sp.error}</div>}
      {sp.saved && <div className={`${cards.banner} ${cards.bannerOk}`} role="status">Saved. The person has been notified if they have an account.</div>}
      {loadError && <div className={`${cards.banner} ${cards.bannerError}`} role="alert">Couldn&apos;t load requests: {loadError}</div>}
      {overdue > 0 && (
        <div className={`${cards.banner} ${cards.bannerError}`} role="alert">
          {overdue} {overdue === 1 ? 'request is' : 'requests are'} past the 15-day deadline.
        </div>
      )}

      <nav className={cards.tabs} aria-label="Filter">
        <Link href="/dashboard/admin/grievances" className={`${cards.tab} ${openOnly ? cards.tabActive : ''}`}>Open</Link>
        <Link href="/dashboard/admin/grievances?all=1" className={`${cards.tab} ${!openOnly ? cards.tabActive : ''}`}>All</Link>
      </nav>

      {grievances.length === 0 ? (
        <div className={cards.empty}>{openOnly ? 'No open requests.' : 'No requests yet.'}</div>
      ) : (
        <div className={cards.list}>
          {grievances.map((g) => {
            const open = g.status === 'ACKNOWLEDGED' || g.status === 'IN_PROGRESS';
            return (
              <article key={g.id} className={cards.card}>
                <div className={cards.top}>
                  <div>
                    <p className={cards.partyLabel}>
                      {g.reference} · {TYPE_LABEL[g.type]}
                    </p>
                    <h3 className={cards.partyName}>
                      {g.name} <span className={table.secondaryText}>{g.email || ''}</span>
                    </h3>
                  </div>
                  <span className={cards.status} data-status={g.overdue ? 'CANCELLED' : open ? 'PENDING' : 'COMPLETED'}>
                    {g.overdue ? `Overdue since ${formatDate(g.dueAt)}` : open ? `Due ${formatDate(g.dueAt)}` : g.status === 'RESOLVED' ? 'Answered' : 'Closed'}
                  </span>
                </div>
                <p className={cards.description}>{g.details}</p>
                <p className={table.secondaryText} style={{ marginTop: '0.4rem' }}>
                  Received {formatDate(g.createdAt)}
                  {g.userId ? ' from a signed-in account' : ' from someone without an account: reply by email'}
                </p>
                {g.response && (
                  <p className={cards.note}>
                    <span>Reply</span>
                    {g.response}
                  </p>
                )}
                {open && (
                  <div className={cards.actions}>
                    <form action={respond} className={cards.actionForm}>
                      <input type="hidden" name="id" value={g.id} />
                      <textarea
                        name="response"
                        className={cards.noteInput}
                        rows={2}
                        maxLength={4000}
                        defaultValue={g.response ?? ''}
                        placeholder="Reply to the person (required to close)"
                        aria-label="Reply"
                      />
                      <div className={cards.buttons}>
                        {g.status === 'ACKNOWLEDGED' && (
                          <button type="submit" name="status" value="IN_PROGRESS" className={cards.secondaryBtn}>Mark in progress</button>
                        )}
                        <button type="submit" name="status" value="RESOLVED" className={cards.primaryBtn}>Resolve</button>
                        <button type="submit" name="status" value="REJECTED" className={cards.dangerBtn}>Reject with reason</button>
                      </div>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
