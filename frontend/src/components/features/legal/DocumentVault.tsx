'use client';

import React, { useState, useEffect } from 'react';
import { fetchUserLegalDocs, deleteLegalDoc } from '@/services/legal';
import LegalDocumentCard from './LegalDocumentCard';
import { Search } from 'lucide-react';
import styles from './legal.module.css';

/** `empty` is shown when the user has no documents; without it the vault renders nothing. */
export default function DocumentVault({ empty }: { empty?: React.ReactNode } = {}) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    setLoading(true);
    const results = await fetchUserLegalDocs();
    setDocs(results);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this document from your vault?')) {
      const result = await deleteLegalDoc(id);
      if (result.success) {
        setDocs(docs.filter(d => d.id !== id));
      }
    }
  };

  const filteredDocs = docs.filter(d =>
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className={styles.vaultStatus}>Loading your documents…</div>;
  }

  if (docs.length === 0) {
    return empty ? <div className={styles.vaultStatus}>{empty}</div> : null;
  }

  return (
    <div className={styles.vault}>
      <div className={styles.vaultHeader}>
        <h2>Your documents</h2>
        <div className={styles.vaultSearch}>
          <Search size={15} />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className={styles.vaultStatus}>No documents match “{searchTerm}”.</div>
      ) : (
        filteredDocs.map(doc => (
          <LegalDocumentCard key={doc.id} document={doc} onDelete={() => handleDelete(doc.id)} />
        ))
      )}
    </div>
  );
}
