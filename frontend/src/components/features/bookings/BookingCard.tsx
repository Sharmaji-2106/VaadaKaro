import React from 'react';
import { CalendarDays, Clock, Mail, MapPin, Phone, Video } from 'lucide-react';
import type { BookingParty, BookingStatus } from '@/services/server';
import styles from './BookingCard.module.css';

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Awaiting lawyer',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// Booking dates are calendar days stored at midnight UTC; format them in UTC so they never shift a day.
export const formatBookingDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

export function BookingCard({
  booking,
  party,
  partyLabel,
  statusLabel,
  children,
}: {
  booking: {
    date: string;
    timeSlot: string;
    description: string;
    status: BookingStatus;
    isOffline: boolean;
    lawyerNote: string | null;
  };
  party: BookingParty;
  partyLabel: string;
  /** Overrides the default status wording, e.g. "Needs your answer" for the lawyer. */
  statusLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <div>
          <p className={styles.partyLabel}>{partyLabel}</p>
          <h3 className={styles.partyName}>{party.name || 'Name not given'}</h3>
        </div>
        <span className={styles.status} data-status={booking.status}>
          {statusLabel ?? STATUS_LABEL[booking.status]}
        </span>
      </div>

      <ul className={styles.meta}>
        <li><CalendarDays size={15} /> {formatBookingDate(booking.date)}</li>
        <li><Clock size={15} /> {booking.timeSlot}</li>
        <li>
          {booking.isOffline ? <MapPin size={15} /> : <Video size={15} />}
          {booking.isOffline ? 'In person' : 'Online'}
        </li>
      </ul>

      <p className={styles.description}>{booking.description}</p>

      {(party.email || party.phone) && (
        <ul className={styles.contact} aria-label="Contact details">
          {party.email && (
            <li><Mail size={14} /> <a href={`mailto:${party.email}`}>{party.email}</a></li>
          )}
          {party.phone && (
            <li><Phone size={14} /> <a href={`tel:${party.phone}`}>{party.phone}</a></li>
          )}
        </ul>
      )}

      {booking.lawyerNote && (
        <p className={styles.note}>
          <span>Lawyer&apos;s note</span>
          {booking.lawyerNote}
        </p>
      )}

      {children && <div className={styles.actions}>{children}</div>}
    </article>
  );
}
