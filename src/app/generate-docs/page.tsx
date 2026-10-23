'use client';

import React, { useState } from 'react';
import styles from './generator.module.css';
import { 
  Sparkles, 
  Send, 
  AlertTriangle, 
  History, 
  FileCheck,
  Search,
  Scale,
  RefreshCw
} from 'lucide-react';
import { generateLegalDrafts } from '@/actions/document-generator';
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
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.badge}>
          <Sparkles size={14} /> AI Powered Document Engine
        </div>
        <h1 className={styles.title}>Legal Document Generator</h1>
        <p className={styles.subtitle}>
          Convert your civic and legal problems into professionally structured, ready-to-use legal drafts in seconds.
        </p>
      </header>

      <div className={styles.grid}>
        {/* Left: Input Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <form onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>What's the core issue?</label>
                <input 
                  type="text" 
                  className={styles.input}
                  placeholder="e.g., Unfair deposit deduction by landlord"
                  value={formData.issue}
                  onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Provide detailed context</label>
                <textarea 
                  className={styles.textarea}
                  placeholder="Describe what happened, dates, amounts, and any parties involved..."
                  style={{ minHeight: '150px' }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Category (Optional)</label>
                <select 
                  className={styles.select}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Auto-detect Category</option>
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
                {isPending ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} /> Analyzing Case...
                  </>
                ) : (
                  <>
                    <Scale size={20} /> Generate Legal Drafts
                  </>
                )}
              </button>
            </form>
          </div>

          <div className={styles.disclaimer} style={{ 
            background: 'rgba(212, 175, 55, 0.1)', 
            border: '1px solid var(--brand-gold)', 
            borderRadius: '12px',
            padding: '1.25rem',
            marginTop: '1.5rem',
            color: 'var(--brand-navy)'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Scale size={24} style={{ color: 'var(--brand-gold)', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.6' }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>AI Legal Assistant Disclosure</strong>
                These documents are AI-generated drafts intended for informational assistance. 
                They do <strong>not</strong> constitute professional legal advice. Always verify content 
                before legal use.
              </p>
            </div>
          </div>
        </aside>

        {/* Right: Results Area */}
        <main className={styles.mainContent}>
          {isPending ? (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <div>
                <h3 className="text-xl font-bold text-navy-900 mb-2">Architecting Legal Frameworks</h3>
                <p className="text-gray-500">Retrieving jurisdictional rules and drafting specific clauses for your case...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-red-50 border border-red-100 rounded-2xl">
              <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
              <h3 className="text-red-900 font-bold text-lg mb-2">Generation Failed</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button 
                onClick={() => setError('')}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : results ? (
            <div>
              <div className={styles.resultsHeader}>
                <h2>AI Case Analysis</h2>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                    <FileCheck size={12} /> {results.documents.length} Drafts Prepared
                  </span>
                </div>
              </div>
              
              <AnalysisDashboard analysis={results.analysis} />

              <div className="mt-10">
                <div className={styles.resultsHeader}>
                  <h2>Generated Legal Drafts</h2>
                </div>
                <div className="mt-4">
                  {results.documents.map((doc: any) => (
                    <LegalDocumentCard key={doc.id} document={doc} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="p-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                <Scale size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-400 mb-2">Ready to Draft</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Fill in the case details on the left to generate structured legal drafts and case analysis.
                </p>
              </div>
              <DocumentVault />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
