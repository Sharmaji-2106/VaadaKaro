'use client';

import React, { useState, useEffect } from 'react';
import { fetchUserLegalDocs, deleteLegalDoc } from '@/actions/document-generator';
import LegalDocumentCard from './LegalDocumentCard';
import { Archive, Trash2, Search, Filter } from 'lucide-react';

export default function DocumentVault() {
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
    if (confirm('Are you sure you want to delete this document from your vault?')) {
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
    return <div className="p-10 text-center text-gray-500">Loading your vault...</div>;
  }

  return (
    <div className="mt-12 pt-12 border-t border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-navy-900 flex items-center gap-3">
            <Archive size={28} className="text-navy-600" /> Your Document Vault
          </h2>
          <p className="text-gray-500 text-sm mt-1">Access and manage all your historical legal drafts.</p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search drafts..."
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-navy-500 outline-none w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="p-16 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Archive size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No documents found in your vault.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="relative group">
              <LegalDocumentCard document={doc} />
              <button 
                onClick={() => handleDelete(doc.id)}
                className="absolute top-4 right-20 p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                title="Delete from vault"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
