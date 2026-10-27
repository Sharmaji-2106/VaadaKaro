import React from 'react';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLawyerBookings, updateLawyerBooking, type BookingStatus } from '@/services/server';
import { BookingCard } from '@/components/features/bookings/BookingCard';
import cards from '@/components/features/bookings/BookingCard.module.css';
import table from '../../officer/complaints/complaints.module.css';

const TABS: { label: string; status?: BookingStatus }[] = [
  { label: 'Needs your answer', status: 'PENDING' },
  { label: 'Confirmed', status: 'CONFIRMED' },
  { label: 'Completed', status: 'COMPLETED' },
  { label: 'Cancelled', status: 'CANCELLED' },
  { label: 'All' },
];

const STATUSES = new Set<string>(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']);

export default async function LawyerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  // No filter in the URL opens the requests waiting on the lawyer; ?status=ALL shows everything.
  const status = (sp.status === 'ALL' ? undefined : STATUSES.has(sp.status ?? '') ? sp.status : 'PENDING') as
    | BookingStatus
    | undefined;
  const { bookings, error: loadError } = await getLawyerBookings({ status });

  async function respond(formData: FormData) {
    'use server';
    const bookingId = String(formData.get('bookingId'));
    const next = String(formData.get('status')) as BookingStatus;
    const note = String(formData.get('note') || '');
    const res = await updateLawyerBooking(bookingId, next, note);

    const qs = new URLSearchParams({ status: status ?? 'ALL' });
    qs.set(res.success ? 'saved' : 'error', res.success ? next : res.error || 'Could not update the booking');
    revalidatePath('/dashboard/lawyer', 'layout');
    redirect(`/dashboard/lawyer/bookings?${qs}`);
  }

  const savedMessage: Record<string, string> = {
    CONFIRMED: 'Confirmed. The citizen has been notified and can now see your contact details.',
    CANCELLED: 'Done. The citizen has been notified.',
    COMPLETED: 'Marked as completed.',
  };

  return (
    <div className={table.container}>
      <header className={table.header}>
        <h1>Consultations</h1>
        <p>Confirm or decline requests, then mark consultations complete once they&apos;re done. Citizens are notified each time.</p>
      </header>

      {sp.error && <div className={`${cards.banner} ${cards.bannerError}`} role="alert">{sp.error}</div>}
      {sp.saved && savedMessage[sp.saved] && (
        <div className={`${cards.banner} ${cards.bannerOk}`} role="status">{savedMessage[sp.saved]}</div>
      )}
      {loadError && <div className={`${cards.banner} ${cards.bannerError}`} role="alert">Couldn&apos;t load bookings: {loadError}</div>}

      <nav className={cards.tabs} aria-label="Filter by status">
        {TABS.map((t) => {
          const active = t.status === status;
          return (
            <Link
              key={t.label}
              href={`/dashboard/lawyer/bookings?status=${t.status ?? 'ALL'}`}
              className={`${cards.tab} ${active ? cards.tabActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {bookings.length === 0 ? (
        <div className={cards.empty}>
          {status === 'PENDING' ? 'No requests are waiting for you.' : 'No consultations here.'}
        </div>
      ) : (
        <div className={cards.list}>
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              party={b.citizen}
              partyLabel={b.status === 'PENDING' ? 'Request from' : 'Consultation with'}
              statusLabel={b.status === 'PENDING' ? 'Needs your answer' : undefined}
            >
              {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                <form action={respond} className={cards.actionForm}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <textarea
                    name="note"
                    className={cards.noteInput}
                    maxLength={1000}
                    rows={1}
                    defaultValue={b.lawyerNote ?? ''}
                    placeholder={
                      b.status === 'PENDING'
                        ? 'Note for the citizen (optional): what to bring, or why you are declining'
                        : 'Note for the citizen (optional)'
                    }
                    aria-label="Note for the citizen"
                  />
                  <div className={cards.buttons}>
                    {b.status === 'PENDING' ? (
                      <>
                        <button type="submit" name="status" value="CONFIRMED" className={cards.primaryBtn}>Confirm</button>
                        <button type="submit" name="status" value="CANCELLED" className={cards.dangerBtn}>Decline</button>
                      </>
                    ) : (
                      <>
                        <button type="submit" name="status" value="COMPLETED" className={cards.primaryBtn}>Mark completed</button>
                        <button type="submit" name="status" value="CANCELLED" className={cards.dangerBtn}>Cancel</button>
                      </>
                    )}
                  </div>
                </form>
              )}
            </BookingCard>
          ))}
        </div>
      )}
    </div>
  );
}
