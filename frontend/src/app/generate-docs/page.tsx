'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './generator.module.css';
import { generateLegalDrafts } from '@/services/legal';
import AnalysisDashboard from '@/components/features/legal/AnalysisDashboard';
import LegalDocumentCard from '@/components/features/legal/LegalDocumentCard';
import DocumentVault from '@/components/features/legal/DocumentVault';

export default function GenerateDocsPage() {
  const [formData, setFormData] = useState({
    issue: '',
    description: '',
    category: '',
  });
  const [isPending, setIsPending] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.issue || !formData.description) return;

    setIsPending(true);
    setError('');
    setResults(null);

    try {
      const result = await generateLegalDrafts(formData);
      if (result.success) {
        setResults({
          analysis: result.analysis,
          documents: result.documents
        });
      } else {
        setError(result.error || 'Failed to generate documents. Please try a more detailed description.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please check your connection.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
    <div className="page-band">
      <div className="page-band-inner">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link> <span>›</span> <span>Draft legal documents</span>
        </nav>
        <h1>Draft legal documents</h1>
        <p className="lead">
          Describe your problem and get a case analysis plus ready-to-edit drafts: formal complaints, emails to officials, police and consumer drafts.
        </p>
      </div>
    </div>
    <div className={styles.container}>
      <div className={styles.grid}>
        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <form onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Issue</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Deposit withheld by landlord"
                  value={formData.issue}
                  onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Details</label>
                <textarea
                  className={styles.textarea}
                  placeholder="What happened, when, amounts, people involved…"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Category</label>
                <select
                  className={styles.select}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Detect automatically</option>
                  <option value="Consumer Dispute">Consumer Dispute</option>
                  <option value="Property/Landlord">Property/Landlord</option>
                  <option value="Public Utility">Public Utility</option>
                  <option value="Cybercrime">Cybercrime</option>
                  <option value="Fraud">Fraud</option>
                </select>
              </div>

              <button
                type="submit"
                className={styles.generateBtn}
                disabled={isPending}
              >
                {isPending ? 'Generating…' : 'Generate Drafts'}
              </button>
            </form>
          </div>

          <p className={styles.disclaimer}>
            AI-generated drafts are for guidance only and are not legal advice. Review before use.
          </p>
        </aside>

        <main className={styles.mainContent}>
          {isPending ? (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <p>Analysing your case and drafting documents…</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <h3>Couldn't generate drafts</h3>
              <p>{error}</p>
              <button onClick={() => setError('')} className={styles.linkBtn}>
                Try again
              </button>
            </div>
          ) : results ? (
            <div>
              <div className={styles.resultsHeader}>
                <h2>Analysis</h2>
                <span className={styles.countBadge}>{results.documents.length} drafts</span>
              </div>

              <AnalysisDashboard analysis={results.analysis} />

              <div className={styles.resultsHeader}>
                <h2>Drafts</h2>
              </div>
              {results.documents.map((doc: any) => (
                <LegalDocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          ) : (
            <>
              <div className={styles.emptyState}>
                <h3>Ready when you are</h3>
                <p>Fill in the details to generate a case analysis and drafts.</p>
              </div>
              <DocumentVault />
            </>
          )}
        </main>
      </div>
    </div>
    </>
  );
}
