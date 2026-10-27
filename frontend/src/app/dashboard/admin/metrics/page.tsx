import React from 'react';
import Link from 'next/link';
import { getPilotMetrics, type PilotMetrics } from '@/services/server';
import cards from '@/components/features/bookings/BookingCard.module.css';
import table from '../../officer/complaints/complaints.module.css';
import styles from './metrics.module.css';

const RANGES = [7, 30, 90];
const LANGUAGE_NAMES: Record<string, string> = { en: 'English', hi: 'Hindi', mr: 'Marathi', unknown: 'Not detected' };

const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`);
const num = (v: number | null, unit: string) => (v === null ? '–' : `${v} ${unit}`);

interface Tile {
  label: string;
  value: string;
  hint: string;
}

export default async function MetricsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const { metrics: m, error } = await getPilotMetrics(days);

  return (
    <div className={table.container}>
      <header className={table.header}>
        <h1>Pilot metrics</h1>
        <p>
          The success measures from the project report, counted from activity on VaadaKaro. Rates show “–” until
          there is data. No letter text is stored for these figures.
        </p>
      </header>

      <nav className={cards.tabs} aria-label="Time range">
        {RANGES.map((d) => (
          <Link
            key={d}
            href={`/dashboard/admin/metrics?days=${d}`}
            className={`${cards.tab} ${d === days ? cards.tabActive : ''}`}
            aria-current={d === days ? 'page' : undefined}
          >
            Last {d} days
          </Link>
        ))}
      </nav>

      {error || !m ? (
        <div className={`${cards.banner} ${cards.bannerError}`} role="alert">Couldn&apos;t load metrics: {error}</div>
      ) : (
        <>
          <Group title="Complaint preparation" tiles={preparation(m)} />
          <LanguageBreakdown metrics={m} />
          <Group title="Documents after drafting" tiles={documents(m)} />
          <Group title="Complaints and consultations" tiles={outcomes(m)} />
          <Group title="Authority guidance" tiles={guidance(m)} />
          <p className={styles.note}>
            Not measured here: classification and authority-recommendation accuracy, language quality and
            usefulness need reviewers or user feedback during the pilot. Security incidents and cost per grievance
            come from your hosting and AI provider dashboards.
          </p>
        </>
      )}
    </div>
  );
}

function preparation(m: PilotMetrics): Tile[] {
  return [
    { label: 'Letters drafted', value: String(m.lettersDrafted), hint: `${m.usersRegistered} new accounts` },
    { label: 'Time to produce a draft', value: num(m.medianSecondsToDraft, 's'), hint: 'Median AI drafting time' },
    { label: 'Draft completion rate', value: pct(m.draftCompletionRate), hint: 'Drafts the citizen saved' },
    { label: 'Draft correction rate', value: pct(m.draftCorrectionRate), hint: 'Saved drafts the citizen edited first' },
    { label: 'Fact check passed', value: pct(m.factCheckPassRate), hint: 'Every number and date kept' },
  ];
}

function documents(m: PilotMetrics): Tile[] {
  return [
    { label: 'Documents saved', value: String(m.draftsSaved), hint: 'From any drafting tool' },
    { label: 'Exported as PDF', value: String(m.documentsExported), hint: 'Distinct documents downloaded' },
    { label: 'Marked as sent', value: String(m.documentsMarkedSubmitted), hint: 'Reported by citizens' },
    { label: 'Reply received', value: String(m.documentsWithResponse), hint: 'Reported by citizens' },
  ];
}

function outcomes(m: PilotMetrics): Tile[] {
  return [
    { label: 'Complaints filed', value: String(m.complaintsFiled), hint: 'On VaadaKaro' },
    { label: 'Resolved', value: String(m.complaintsResolved), hint: 'Of those filed in this period' },
    { label: 'Days to resolution', value: num(m.medianDaysToResolution, 'days'), hint: 'Median' },
    { label: 'Consultations', value: String(m.bookingsRequested), hint: `${m.bookingsConfirmed} confirmed by lawyers` },
  ];
}

function guidance(m: PilotMetrics): Tile[] {
  return [
    { label: 'Offices in directory', value: String(m.authoritiesListed), hint: 'Shown to citizens' },
    {
      label: 'Need rechecking',
      value: String(m.authoritiesNeedingRecheck),
      hint: 'Never checked, or over 180 days ago',
    },
  ];
}

function Group({ title, tiles }: { title: string; tiles: Tile[] }) {
  return (
    <section className={styles.group}>
      <h2>{title}</h2>
      <div className={styles.tiles}>
        {tiles.map((t) => (
          <div key={t.label} className={styles.tile}>
            <p className={styles.label}>{t.label}</p>
            <p className={styles.value}>{t.value}</p>
            <p className={styles.hint}>{t.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LanguageBreakdown({ metrics: m }: { metrics: PilotMetrics }) {
  if (m.inputLanguages.length === 0) return null;
  const total = m.inputLanguages.reduce((s, l) => s + l.count, 0);
  return (
    <section className={styles.group}>
      <h2>Languages citizens wrote in</h2>
      <table className={styles.langTable}>
        <thead>
          <tr>
            <th scope="col">Language</th>
            <th scope="col">Share</th>
            <th scope="col" className={styles.right}>Drafts</th>
          </tr>
        </thead>
        <tbody>
          {m.inputLanguages.map((l) => (
            <tr key={l.language}>
              <td>{LANGUAGE_NAMES[l.language] ?? l.language}</td>
              <td>
                <span className={styles.bar} style={{ width: `${(l.count / total) * 100}%` }} aria-hidden="true" />
                <span className={styles.barLabel}>{Math.round((l.count / total) * 100)}%</span>
              </td>
              <td className={styles.right}>{l.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
