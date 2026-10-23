'use client';

import React, { useState } from 'react';
import { 
  Copy, 
  Download, 
  Edit3, 
  RefreshCw, 
  Check, 
  ChevronRight, 
  FileText,
  Mail,
  Scale,
  ShieldCheck,
  Info
} from 'lucide-react';
import { updateLegalDoc } from '@/lib/actions/aiDocumentActions';

interface DocProps {
  document: any;
}

export default function LegalDocumentCard({ document }: DocProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(document.content);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateLegalDoc(document.id, content);
    setSaving(false);
    setIsEditing(false);
  };

  const getTypeIcon = () => {
    switch (document.type) {
      case 'FORMAL_COMPLAINT': return <FileText size={18} className="text-blue-600" />;
      case 'GOVERNMENT_EMAIL': return <Mail size={18} className="text-purple-600" />;
      case 'POLICE_DRAFT': return <ShieldCheck size={18} className="text-red-600" />;
      case 'CONSUMER_DRAFT': return <Scale size={18} className="text-amber-600" />;
      default: return <FileText size={18} className="text-gray-600" />;
    }
  };

  const getTypeName = () => {
    return document.type.replace('_', ' ');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all mb-6">
      {/* Card Header */}
      <div className="px-6 py-4 border-bottom bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getTypeIcon()}
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{getTypeName()}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
            title="Copy to clipboard"
          >
            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          </button>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 hover:bg-gray-200 rounded-lg transition-colors ${isEditing ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
            title="Edit Document"
          >
            <Edit3 size={16} />
          </button>
          <button 
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
            title="Download PDF"
            disabled
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        <h3 className="text-lg font-extrabold text-navy-900 mb-4">{document.title}</h3>
        
        {isEditing ? (
          <div className="flex flex-col gap-3">
            <textarea
              className="w-full min-h-[300px] p-4 bg-gray-50 border border-blue-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => { setIsEditing(false); setContent(document.content); }}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <div 
              className="text-gray-700 leading-relaxed whitespace-pre-wrap font-serif text-[1.05rem]"
              dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }}
            />
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[0.7rem] text-gray-400 font-medium">
        <span>Generated via VaadaAI Legal Engine</span>
        <div className="flex items-center gap-1">
          <Info size={10} />
          <span>Double check addresses and names before sending</span>
        </div>
      </div>
    </div>
  );
}
