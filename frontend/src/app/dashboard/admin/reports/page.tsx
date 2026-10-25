import React from 'react';
import { getMonthlyReport } from '@/services/server';
import styles from './reports.module.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const month = Math.min(12, Math.max(1, parseInt(sp.month || '') || now.getMonth() + 1));
  const year = parseInt(sp.year || '') || now.getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  const { report, error } = await getMonthlyReport(year, month);
  const rows = report?.departments ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Monthly report</h1>
          <p className={styles.subtitle}>
            Complaints filed in {MONTHS[month - 1]} {year}, by department, with their current status.
          </p>
        </div>
        <form className={styles.controls} method="GET">
          <div className={styles.pickers}>
            <select name="month" className={styles.select} defaultValue={month} aria-label="Month">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select name="year" className={styles.select} defaultValue={year} aria-label="Year">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button type="submit" className={styles.generateBtn}>Show</button>
        </form>
      </div>

      {error ? (
        <div className={styles.notice}>Couldn&apos;t load the report: {error}</div>
      ) : (
        <>
          <div className={styles.totals}>
            <div><span>{report?.totalFiled ?? 0}</span> filed</div>
            <div><span>{report?.totalResolved ?? 0}</span> resolved</div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Filed</th>
                  <th>Status now</th>
                  <th>Officers</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.empty}>No complaints were filed this month.</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.department}>
                      <td className={styles.strong}>{r.department}</td>
                      <td>{r.filed}</td>
                      <td>
                        <div className={styles.statusInfo}>
                          <div className={styles.statusItem}>
                            <span className={`${styles.dot} ${styles.resolvedDot}`} /> {r.resolved} resolved
                          </div>
                          <div className={styles.statusItem}>
                            <span className={`${styles.dot} ${styles.progressDot}`} /> {r.inProgress} in progress
                          </div>
                          <div className={styles.statusItem}>
                            <span className={`${styles.dot} ${styles.pendingDot}`} /> {r.pending} pending
                          </div>
                          {r.rejected > 0 && (
                            <div className={styles.statusItem}>
                              <span className={`${styles.dot} ${styles.rejectedDot}`} /> {r.rejected} rejected
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={r.officers === 0 ? styles.warn : undefined}>
                        {r.officers === 0 ? 'None assigned' : r.officers}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
