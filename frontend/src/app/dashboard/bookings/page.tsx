import React from 'react';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Scale } from 'lucide-react';
import { cancelMyBooking, getMyBookings } from '@/services/server';
import { BookingCard } from '@/components/features/bookings/BookingCard';
import cards from '@/components/features/bookings/BookingCard.module.css';
import dash from '../dashboard.module.css';

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const sp = await searchParams;
  const { bookings, error: loadError } = await getMyBookings();

  async function cancel(formData: FormData) {
    'use server';
    const res = await cancelMyBooking(String(formData.get('bookingId')));
    revalidatePath('/dashboard/bookings');
    redirect(
      res.success
        ? '/dashboard/bookings?cancelled=1'
        : `/dashboard/bookings?error=${encodeURIComponent(res.error || 'Could not cancel the booking')}`
    );
  }

  const open = bookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED');
  const past = bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'CANCELLED');

  const renderList = (list: typeof bookings) => (
    <div className={cards.list}>
      {list.map((b) => (
        <BookingCard key={b.id} booking={b} party={b.lawyer} partyLabel="Lawyer">
          {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
            <form action={cancel} className={cards.actionForm}>
              <input type="hidden" name="bookingId" value={b.id} />
              <p className={dash.statLabel} style={{ flex: '1 1 260px' }}>
                {b.status === 'PENDING'
                  ? 'The lawyer has not answered yet. Their contact details appear here once they confirm.'
                  : 'Confirmed. Contact the lawyer directly if you need to change the time.'}
              </p>
              <button type="submit" className={cards.dangerBtn}>Cancel booking</button>
            </form>
          )}
        </BookingCard>
      ))}
    </div>
  );

  return (
    <>
      <div className="page-band">
        <div className={`page-band-inner ${dash.bandRow}`}>
          <div>
            <span className="eyebrow">Your dashboard</span>
            <h1>My consultations</h1>
            <p className="lead">Lawyer consultations you have requested, and what each lawyer said.</p>
          </div>
          <Link href="/find-lawyer" className={dash.newBtn}>
            <Scale size={18} /> Find a lawyer
          </Link>
        </div>
      </div>

      <div className={dash.container}>
        {sp.error && <div className={`${cards.banner} ${cards.bannerError}`} role="alert">{sp.error}</div>}
        {sp.cancelled && (
          <div className={`${cards.banner} ${cards.bannerOk}`} role="status">Booking cancelled. The lawyer has been told.</div>
        )}
        {loadError && (
          <div className={`${cards.banner} ${cards.bannerError}`} role="alert">Couldn&apos;t load your bookings: {loadError}</div>
        )}

        {bookings.length === 0 ? (
          <div className={cards.empty}>
            You haven&apos;t booked a consultation yet. <Link href="/find-lawyer">Browse lawyers</Link> near you.
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.3125rem', fontWeight: 600, margin: '0 0 0.75rem' }}>Open</h2>
            {open.length ? renderList(open) : <div className={cards.empty}>No open consultations.</div>}
            {past.length > 0 && (
              <>
                <h2 style={{ fontSize: '1.3125rem', fontWeight: 600, margin: '2rem 0 0.75rem' }}>Past</h2>
                {renderList(past)}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
