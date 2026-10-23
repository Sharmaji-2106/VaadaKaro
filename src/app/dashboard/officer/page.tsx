import React from 'react';
import styles from './overview.module.css';
import { 
  FileText, 
  Clock, 
  Activity, 
  CheckCircle2, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { getOfficerStats } from '@/lib/actions/officerActions';

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
    { 
      label: 'Assigned Complaints', 
      value: stats.total, 
      icon: FileText, 
      color: '#3b82f6', 
      bg: '#eff6ff' 
    },
    { 
      label: 'Pending Review', 
      value: stats.pending, 
      icon: Clock, 
      color: '#f59e0b', 
      bg: '#fffbeb' 
    },
    { 
      label: 'In Progress', 
      value: stats.inProgress, 
      icon: Activity, 
      color: '#8b5cf6', 
      bg: '#f5f3ff' 
    },
    { 
      label: 'Resolved Today', 
      value: stats.resolvedToday, 
      icon: TrendingUp, 
      color: '#10b981', 
      bg: '#ecfdf5' 
    },
  ];

  return (
    <div className={styles.overview}>
      <header className={styles.header}>
        <h1>Officer Command Center</h1>
        <p>Monitor and manage citizen grievances with administrative precision.</p>
      </header>

      <div className={styles.statsGrid}>
        {statCards.map((stat, i) => (
          <div key={i} className={styles.statCard}>
            <div 
              className={styles.statIcon} 
              style={{ color: stat.color, backgroundColor: stat.bg }}
            >
              <stat.icon size={20} />
            </div>
            <p className={styles.statLabel}>{stat.label}</p>
            <h3 className={styles.statValue}>{stat.value}</h3>
          </div>
        ))}
      </div>

      <section className={styles.recentSection}>
        <h2 className={styles.sectionTitle}>
          <AlertCircle size={24} className="text-amber-500" />
          High Priority Attention Required
        </h2>
        
        {/* We'll implement a quick high-priority list here or keep it simple for now */}
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 'var(--radius-lg)', border: '1px dashed #e2e8f0' }}>
          <p>Strategic workload monitoring active. High priority cases will appear here as they are filed.</p>
        </div>
      </section>
    </div>
  );
}
