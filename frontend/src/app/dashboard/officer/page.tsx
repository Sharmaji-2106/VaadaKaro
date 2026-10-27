import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import styles from './overview.module.css';
import table from './complaints/complaints.module.css';
import { getHighPriorityComplaints, getOfficerStats } from '@/services/server';

const toLabel = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default async function OfficerOverview() {
  const [result, urgent] = await Promise.all([getOfficerStats(), getHighPriorityComplaints(5)]);
  const stats = (result?.success && result.stats) ? result.stats : {
    total: 0,
    pending: 0,
    underReview: 0,
    inProgress: 0,
    resolved: 0,
    resolvedToday: 0
  };

  const statCards = [
    { label: 'Assigned', value: stats.total, tone: 'var(--label)' },
    { label: 'Pending review', value: stats.pending, tone: 'var(--orange)' },
    { label: 'In progress', value: stats.inProgress, tone: 'var(--accent-text)' },
    { label: 'Resolved today', value: stats.resolvedToday, tone: 'var(--green)' },
  ];

  return (
    <div className={styles.overview}>
      <header className={styles.header}>
        <h1>Overview</h1>
        <p>Your caseload at a glance.</p>
      </header>

      <div className={styles.statsGrid}>
        {statCards.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <p className={styles.statLabel}>{stat.label}</p>
            <h3 className={styles.statValue} style={{ color: stat.tone }}>{stat.value}</h3>
          </div>
        ))}
      </div>

      <section className={styles.recentSection}>
        <h2 className={styles.sectionTitle}>
          High priority{urgent.total > 0 && <span className={table.secondaryText}> · {urgent.total} open</span>}
        </h2>
        {urgent.complaints.length === 0 ? (
          <p className={styles.emptyNote}>No urgent or high-priority complaints are open.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={table.table} style={{ minWidth: 560 }}>
              <tbody>
                {urgent.complaints.map((c: any) => (
                  <tr key={c.id} className={table.tr}>
                    <td className={table.td}>
                      <div className={table.primaryText}>{c.title}</div>
                      <div className={table.trackingId}>{c.trackingId}</div>
                    </td>
                    <td className={table.td}>
                      <span className={table.priorityBadge} data-priority={c.priority}>{toLabel(c.priority)}</span>
                    </td>
                    <td className={table.td}>
                      <span className={table.statusBadge} data-status={c.status}>{toLabel(c.status)}</span>
                    </td>
                    <td className={table.td} style={{ textAlign: 'right' }}>
                      <Link href={`/dashboard/officer/complaints/${c.id}`} className={table.viewBtn}>
                        Open <ChevronRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
