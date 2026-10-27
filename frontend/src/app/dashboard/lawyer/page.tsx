import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getLawyerBookings, getLawyerStats, getMyLawyerProfile } from '@/services/server';
import { BookingCard } from '@/components/features/bookings/BookingCard';
import cards from '@/components/features/bookings/BookingCard.module.css';
import styles from '../officer/overview.module.css';

export default async function LawyerOverview() {
  const [{ stats }, { profile }, pending, upcoming] = await Promise.all([
    getLawyerStats(),
    getMyLawyerProfile(),
    getLawyerBookings({ status: 'PENDING', limit: 5 }),
    getLawyerBookings({ status: 'CONFIRMED', upcoming: true, limit: 5 }),
  ]);
  const s = stats ?? { pending: 0, upcoming: 0, completed: 0, cancelled: 0 };

  const statCards = [
    { label: 'Needs your answer', value: s.pending, tone: 'var(--orange)' },
    { label: 'Upcoming', value: s.upcoming, tone: 'var(--accent-text)' },
    { label: 'Completed', value: s.completed, tone: 'var(--blue)' },
    { label: 'Cancelled', value: s.cancelled, tone: 'var(--label-secondary)' },
  ];

  return (
    <div className={styles.overview}>
      <header className={styles.header}>
        <h1>Overview</h1>
        <p>Consultation requests from citizens, and what&apos;s coming up.</p>
      </header>

      {!profile ? (
        <div className={`${cards.banner} ${cards.bannerInfo}`}>
          Citizens can&apos;t find you yet. <Link href="/dashboard/lawyer/profile">Create your public profile</Link>{' '}
          to appear in the lawyer directory.
        </div>
      ) : !profile.isVerified ? (
        <div className={`${cards.banner} ${cards.bannerInfo}`}>
          Your profile is listed, but without a verified badge until an administrator checks bar number{' '}
          {profile.barNumber}.
        </div>
      ) : null}

      <div className={styles.statsGrid}>
        {statCards.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <p className={styles.statLabel}>{stat.label}</p>
            <h3 className={styles.statValue} style={{ color: stat.tone }}>{stat.value}</h3>
          </div>
        ))}
      </div>

      <Section title="Needs your answer" href="/dashboard/lawyer/bookings?status=PENDING" count={s.pending}>
        {pending.bookings.length === 0 ? (
          <p className={styles.emptyNote}>No requests waiting. New ones appear here and in your notifications.</p>
        ) : (
          <div className={cards.list}>
            {pending.bookings.map((b) => (
              <BookingCard key={b.id} booking={b} party={b.citizen} partyLabel="Request from" statusLabel="Needs your answer" />
            ))}
          </div>
        )}
      </Section>

      <Section title="Upcoming" href="/dashboard/lawyer/bookings?status=CONFIRMED" count={s.upcoming}>
        {upcoming.bookings.length === 0 ? (
          <p className={styles.emptyNote}>No confirmed consultations coming up.</p>
        ) : (
          <div className={cards.list}>
            {upcoming.bookings.map((b) => (
              <BookingCard key={b.id} booking={b} party={b.citizen} partyLabel="Consultation with" />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  href,
  count,
  children,
}: {
  title: string;
  href: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.recentSection} style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {count > 0 && (
          <Link href={href} style={{ color: 'var(--link)', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center' }}>
            Answer in Consultations <ChevronRight size={15} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
