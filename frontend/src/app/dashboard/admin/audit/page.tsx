import React from 'react';
import { Search } from 'lucide-react';
import { getAuditLogs } from '@/services/server';
import table from '../../officer/complaints/complaints.module.css';
import styles from '../admin.module.css';

const toLabel = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function details(metadata: string | null): string {
  if (!metadata) return '';
  try {
    return Object.entries(JSON.parse(metadata) as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v ?? '—'}`)
      .join(' · ');
  } catch {
    return metadata;
  }
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entityId?: string }>;
}) {
  const { entityId } = await searchParams;
  const { logs, error } = await getAuditLogs(entityId);

  return (
    <div className={table.container}>
      <header className={table.header}>
        <h1>Audit log</h1>
        <p>Every account, role and complaint change, newest first (last 200).</p>
      </header>

      {error && <div className={styles.errorBanner} role="alert">Couldn&apos;t load the audit log: {error}</div>}

      <form className={table.controls} method="GET">
        <div className={table.searchWrapper}>
          <Search className={table.searchIcon} size={15} />
          <input
            name="entityId"
            type="text"
            placeholder="Filter by record ID (complaint or user ID)"
            className={table.searchInput}
            defaultValue={entityId}
          />
        </div>
        <button type="submit" className={table.searchBtn}>Apply</button>
      </form>

      <div className={table.tableWrapper}>
        <table className={table.table}>
          <thead>
            <tr>
              <th className={table.th}>When</th>
              <th className={table.th}>Action</th>
              <th className={table.th}>Record</th>
              <th className={table.th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className={table.emptyCell}>No entries.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className={table.tr}>
                  <td className={`${table.td} ${table.secondaryText}`}>
                    {new Date(log.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className={table.td}>
                    <div className={table.primaryText}>{toLabel(log.action)}</div>
                    <div className={table.secondaryText}>by {log.userId ? <code>{log.userId}</code> : 'system'}</div>
                  </td>
                  <td className={table.td}>
                    <div className={table.secondaryText}>{toLabel(log.entity)}</div>
                    <code className={table.trackingId}>{log.entityId}</code>
                  </td>
                  <td className={`${table.td} ${table.secondaryText}`}>{details(log.metadata)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
