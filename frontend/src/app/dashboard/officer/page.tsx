import React from 'react';
import styles from './overview.module.css';
import { getOfficerStats } from '@/services/server';

export default async function OfficerOverview() {
  const result = await getOfficerStats();
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
        <h2 className={styles.sectionTitle}>High priority</h2>
        <p className={styles.emptyNote}>High-priority cases will appear here as they are filed.</p>
      </section>
    </div>
  );
}
