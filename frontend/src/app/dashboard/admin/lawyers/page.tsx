import React from 'react';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminLawyers, setLawyerVerified } from '@/services/server';
import table from '../../officer/complaints/complaints.module.css';
import cards from '@/components/features/bookings/BookingCard.module.css';
import styles from '../admin.module.css';

const FILTERS = [
  { label: 'Waiting for check', value: 'false' },
  { label: 'Verified', value: 'true' },
  { label: 'All', value: 'all' },
];

export default async function AdminLawyersPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; error?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.verified === 'true' || sp.verified === 'all' ? sp.verified : 'false';
  const { lawyers, error: loadError } = await getAdminLawyers(filter === 'all' ? undefined : filter === 'true');

  async function setVerified(formData: FormData) {
    'use server';
    const profileId = String(formData.get('profileId'));
    const res = await setLawyerVerified(profileId, formData.get('verified') === 'true');
    const qs = new URLSearchParams({ verified: filter });
    qs.set(res.success ? 'saved' : 'error', res.success ? profileId : res.error || 'Could not update the lawyer');
    revalidatePath('/dashboard/admin/lawyers');
    redirect(`/dashboard/admin/lawyers?${qs}`);
  }

  return (
    <div className={table.container}>
      <header className={table.header}>
        <h1>Lawyer verification</h1>
        <p>
          Check each enrolment number and year with the State Bar Council named before verifying, and that the bio
          stays within Bar Council of India rule 36 (facts only, no self-praise or results). To list someone as a lawyer,
          first give their account the Lawyer role under Users &amp; roles; they then fill in their own profile.
        </p>
      </header>

      {sp.error && <div className={styles.errorBanner} role="alert">{sp.error}</div>}
      {/* The row may have moved to another tab, so confirm up here too. */}
      {sp.saved && <div className={`${cards.banner} ${cards.bannerOk}`} role="status">Saved. The lawyer has been notified.</div>}
      {loadError && <div className={styles.errorBanner} role="alert">Couldn&apos;t load lawyers: {loadError}</div>}

      <nav className={cards.tabs} aria-label="Filter by verification">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/dashboard/admin/lawyers?verified=${f.value}`}
            className={`${cards.tab} ${filter === f.value ? cards.tabActive : ''}`}
            aria-current={filter === f.value ? 'page' : undefined}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <div className={table.tableWrapper}>
        <table className={table.table}>
          <thead>
            <tr>
              <th className={table.th}>Lawyer</th>
              <th className={table.th}>Bar number</th>
              <th className={table.th}>Practice</th>
              <th className={table.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {lawyers.length === 0 ? (
              <tr>
                <td colSpan={4} className={table.emptyCell}>
                  {filter === 'false' ? 'No profiles are waiting for a check.' : 'No lawyer profiles here.'}
                </td>
              </tr>
            ) : (
              lawyers.map((l) => (
                <tr key={l.id} className={table.tr}>
                  <td className={table.td}>
                    <div className={table.primaryText}>{l.user.name || 'No name'}</div>
                    <div className={table.secondaryText}>{l.email}</div>
                  </td>
                  <td className={table.td}>
                    <span className={table.trackingId}>{l.barNumber}</span>
                    <div className={table.secondaryText}>
                      {l.stateBarCouncil ?? 'State Bar Council not given'}
                      {l.enrolmentYear ? `, ${l.enrolmentYear}` : ''}
                    </div>
                  </td>
                  <td className={table.td}>
                    <div>{l.specialization.join(', ')}</div>
                    <div className={table.secondaryText}>
                      {l.location} · {l.experience} yrs · ₹{l.fees}
                    </div>
                  </td>
                  <td className={table.td}>
                    <form action={setVerified} className={styles.roleForm}>
                      <input type="hidden" name="profileId" value={l.id} />
                      <input type="hidden" name="verified" value={l.isVerified ? 'false' : 'true'} />
                      <span className={table.statusBadge} data-status={l.isVerified ? 'RESOLVED' : 'IN_PROGRESS'}>
                        {l.isVerified ? 'Verified' : 'Not verified'}
                      </span>
                      <button type="submit" className={l.isVerified ? cards.secondaryBtn : styles.saveBtn}>
                        {l.isVerified ? 'Remove badge' : 'Verify'}
                      </button>
                      {sp.saved === l.id && <span className={styles.saved}>Saved</span>}
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
