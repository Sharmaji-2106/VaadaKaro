'use client';

import React from 'react';
import styles from './legal.module.css';

interface AnalysisProps {
  analysis: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendedAction: string;
    category: string;
    missingEvidence: string[];
  };
}

export default function AnalysisDashboard({ analysis }: AnalysisProps) {
  const getRiskColor = () => {
    switch (analysis.riskLevel) {
      case 'HIGH': return 'var(--red)';
      case 'MEDIUM': return 'var(--orange)';
      case 'LOW': return 'var(--green)';
      default: return 'var(--label-secondary)';
    }
  };

  return (
    <div className={styles.analysisGrid}>
      <div className={styles.tile}>
        <span className={styles.tileLabel}>Risk level</span>
        <div className={styles.tileValueLarge} style={{ color: getRiskColor() }}>
          {analysis.riskLevel.charAt(0) + analysis.riskLevel.slice(1).toLowerCase()}
        </div>
      </div>

      <div className={styles.tile}>
        <span className={styles.tileLabel}>Category</span>
        <div className={styles.tileValue}>{analysis.category}</div>
      </div>

      <div className={`${styles.tile} ${styles.tileWide}`}>
        <span className={styles.tileLabel}>Recommended action</span>
        <div className={styles.tileValue}>{analysis.recommendedAction}</div>
      </div>

      <div className={`${styles.tile} ${styles.tileWide}`}>
        <span className={styles.tileLabel}>Evidence to gather</span>
        <div className={styles.pillRow}>
          {analysis.missingEvidence.length > 0 ? (
            analysis.missingEvidence.map((item, i) => (
              <span key={i} className={styles.pill}>{item}</span>
            ))
          ) : (
            <span className={styles.muted}>Nothing specific suggested.</span>
          )}
        </div>
      </div>
    </div>
  );
}
