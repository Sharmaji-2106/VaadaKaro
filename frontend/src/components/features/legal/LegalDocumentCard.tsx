'use client';

import React, { useState } from 'react';
import { Copy, Check, Trash2, Download } from 'lucide-react';
import { updateLegalDoc, documentPdfUrl } from '@/services/legal';
import styles from './legal.module.css';

interface DocProps {
  document: any;
  onDelete?: () => void;
}

const formatContent = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');

export default function LegalDocumentCard({ document, onDelete }: DocProps) {
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

  const typeName = document.type.replace(/_/g, ' ').toLowerCase();

  return (
    <div className={styles.docCard}>
      <div className={styles.docHeader}>
        <div>
          <span className={styles.docType}>{typeName}</span>
          <h3 className={styles.docTitle}>{document.title}</h3>
        </div>
        <div className={styles.docActions}>
          <button onClick={handleCopy} className={styles.iconBtn} title="Copy">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          {/* PDFs are rendered from the saved copy, so offer the download only when nothing is unsaved. */}
          {!isEditing && (
            <a href={documentPdfUrl(document.id)} download className={styles.iconBtn} title="Download PDF">
              <Download size={15} />
            </a>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`${styles.textBtn} ${isEditing ? styles.textBtnActive : ''}`}
          >
            Edit
          </button>
          {onDelete && (
            <button onClick={onDelete} className={`${styles.iconBtn} ${styles.danger}`} title="Delete">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.docBody}>
        {isEditing ? (
          <>
            <textarea
              className={styles.docEditor}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className={styles.editorActions}>
              <button
                onClick={() => { setIsEditing(false); setContent(document.content); }}
                className={styles.textBtn}
              >
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className={styles.primaryBtn}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <div
            className={styles.docContent}
            dangerouslySetInnerHTML={{ __html: formatContent(content) }}
          />
        )}
      </div>

      <div className={styles.docFooter}>
        Check names and addresses before sending.
      </div>
    </div>
  );
}
