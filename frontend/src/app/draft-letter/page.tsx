'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Copy, Download, Mic, MicOff } from 'lucide-react';
import base from '../generate-docs/generator.module.css';
import styles from './draft-letter.module.css';
import { draftLetter, saveDocument, documentPdfUrl, type LetterDraft, type LetterLanguage } from '@/services/legal';
import { AuthorityCard } from '@/components/features/authorities/AuthorityCard';
import { AiConsentPrompt } from '@/components/features/privacy/AiConsentPrompt';
import { isAiConsentError } from '@/services/privacy';
import authorityStyles from '@/components/features/authorities/AuthorityCard.module.css';

const LANGUAGES: { value: LetterLanguage; label: string; speech: string }[] = [
  { value: 'en', label: 'English', speech: 'en-IN' },
  { value: 'hi', label: 'हिन्दी (Hindi)', speech: 'hi-IN' },
  { value: 'mr', label: 'मराठी (Marathi)', speech: 'mr-IN' },
];

// Minimal typing for the browser Speech API (not in TypeScript's DOM lib).
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function DraftLetterPage() {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [speechLang, setSpeechLang] = useState<LetterLanguage>('hi');
  const [outputLanguage, setOutputLanguage] = useState<LetterLanguage>('en');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<LetterDraft | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => {
    setVoiceSupported(getRecognition() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = LANGUAGES.find((l) => l.value === speechLang)!.speech;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let spoken = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) spoken += e.results[i][0].transcript;
      }
      // Append, never replace what the citizen already typed.
      if (spoken) setDescription((prev) => (prev ? `${prev.trimEnd()} ${spoken.trim()}` : spoken.trim()));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runDraft();
  };

  const runDraft = async () => {
    recognitionRef.current?.stop();
    setIsPending(true);
    setError('');
    setDraft(null);
    setSavedId(null);
    setSaveError('');

    const result = await draftLetter({ description, outputLanguage, location });
    if (result.success) {
      setDraft(result.draft);
      setSubject(result.draft.subject);
      setBody(result.draft.body);
    } else {
      setError(result.error === 'Unauthorized' ? 'Please sign in to draft a letter.' : result.error);
    }
    setIsPending(false);
  };

  const letterText = `Subject: ${subject}\n\n${body}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    const result = await saveDocument({
      title: subject || 'Complaint letter',
      content: body,
      category: draft?.category,
      editedFromAi: !!draft && (body !== draft.body || subject !== draft.subject),
    });
    setSaving(false);
    if (result.success) setSavedId(result.document.id);
    else setSaveError(result.error);
  };

  return (
    <>
      <div className="page-band">
        <div className="page-band-inner">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span>›</span> <span>Draft a complaint letter</span>
          </nav>
          <h1>Draft a complaint letter</h1>
          <p className="lead">
            Describe the problem in your own words, in Hindi, Marathi or English. We turn it into a formal letter you can check, edit and download.
          </p>
        </div>
      </div>

      <div className={base.container}>
        <div className={base.grid}>
          <aside className={base.sidebar}>
            <div className={base.card}>
              <form onSubmit={handleSubmit}>
                <div className={base.inputGroup}>
                  <label className={base.label} htmlFor="description">What happened?</label>
                  <textarea
                    id="description"
                    className={base.textarea}
                    placeholder="e.g. मेरे घर के बाहर की स्ट्रीटलाइट 3 मार्च से खराब है…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    minLength={10}
                    maxLength={3000}
                    required
                  />
                  {voiceSupported && (
                    <div className={styles.voiceRow}>
                      <select
                        className={styles.voiceLang}
                        value={speechLang}
                        onChange={(e) => setSpeechLang(e.target.value as LetterLanguage)}
                        disabled={listening}
                        aria-label="Language you will speak"
                      >
                        {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={toggleVoice}
                        className={`${styles.voiceBtn} ${listening ? styles.voiceActive : ''}`}
                      >
                        {listening ? <><MicOff size={15} /> Stop</> : <><Mic size={15} /> Speak</>}
                      </button>
                    </div>
                  )}
                </div>

                <div className={base.inputGroup}>
                  <label className={base.label} htmlFor="location">Location <span className={styles.optional}>optional</span></label>
                  <input
                    id="location"
                    className={base.input}
                    placeholder="Area, city, pincode"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    maxLength={300}
                  />
                </div>

                <div className={base.inputGroup}>
                  <label className={base.label} htmlFor="outputLanguage">Write the letter in</label>
                  <select
                    id="outputLanguage"
                    className={base.select}
                    value={outputLanguage}
                    onChange={(e) => setOutputLanguage(e.target.value as LetterLanguage)}
                  >
                    {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>

                <button type="submit" className={base.generateBtn} disabled={isPending || description.trim().length < 10}>
                  {isPending ? 'Drafting…' : 'Draft my letter'}
                </button>
              </form>
            </div>
            <p className={base.disclaimer}>
              AI-assisted drafts can contain mistakes. Check every fact before you send it. This is not legal advice, and nothing is submitted for you.
            </p>
          </aside>

          <main className={base.mainContent}>
            {isPending ? (
              <div className={base.loadingOverlay}>
                <div className={base.spinner} />
                <p>Reading your description and drafting the letter…</p>
              </div>
            ) : isAiConsentError(error) ? (
              <AiConsentPrompt onGranted={runDraft} />
            ) : error ? (
              <div className={base.errorState}>
                <h3>Couldn&apos;t draft the letter</h3>
                <p>{error}</p>
                {error.startsWith('Please sign in') ? (
                  <Link href="/login?callbackUrl=/draft-letter" className={base.linkBtn}>Sign in</Link>
                ) : (
                  <button onClick={() => setError('')} className={base.linkBtn}>Try again</button>
                )}
              </div>
            ) : draft ? (
              <div>
                {!draft.factCheck.passed && (
                  <div className={styles.warning} role="alert">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Check these details.</strong> Your description mentions{' '}
                      {draft.factCheck.missingFacts.map((f) => `“${f}”`).join(', ')}, which{' '}
                      {draft.factCheck.missingFacts.length === 1 ? 'does' : 'do'} not appear in the letter.
                    </div>
                  </div>
                )}

                <div className={styles.summaryGrid}>
                  <div className={styles.tile}>
                    <span className={styles.tileLabel}>Category</span>
                    <span className={styles.tileValue}>{draft.category}</span>
                  </div>
                  <div className={styles.tile}>
                    <span className={styles.tileLabel}>Likely department</span>
                    <span className={styles.tileValue}>{draft.suggestedDepartment}</span>
                  </div>
                  <div className={`${styles.tile} ${styles.tileWide}`}>
                    <span className={styles.tileLabel}>About this suggestion</span>
                    <span className={styles.tileText}>{draft.authorityNote}</span>
                    <span className={styles.verify}>Confirm the right office for your area before sending.</span>
                  </div>
                </div>

                <section className={styles.whereToSend} aria-labelledby="where-to-send">
                  <h2 id="where-to-send">Where to send it</h2>
                  {draft.authorities.length > 0 ? (
                    <>
                      <p className={styles.hint}>
                        From our directory of official offices. Each entry links to the source we checked it against.
                      </p>
                      <div className={authorityStyles.list}>
                        {draft.authorities.slice(0, 3).map((a) => <AuthorityCard key={a.id} authority={a} />)}
                      </div>
                    </>
                  ) : (
                    <p className={authorityStyles.empty}>
                      Our directory has no checked office for this yet. The department above is only the AI&apos;s
                      suggestion, so confirm the right office with your local administration before you send anything.
                      You can also <Link href="/authorities">browse the directory</Link>.
                    </p>
                  )}
                </section>

                <div className={styles.letterCard}>
                  <div className={styles.letterHeader}>
                    <h2>Your letter</h2>
                    <span className={styles.aiBadge}>AI-assisted draft</span>
                  </div>
                  <label className={base.label} htmlFor="subject">Subject</label>
                  <input id="subject" className={base.input} value={subject} onChange={(e) => setSubject(e.target.value)} />
                  <label className={`${base.label} ${styles.bodyLabel}`} htmlFor="body">Letter</label>
                  <textarea id="body" className={styles.letterBody} value={body} onChange={(e) => setBody(e.target.value)} />

                  {draft.placeholders.length > 0 && (
                    <p className={styles.hint}>Replace before sending: {draft.placeholders.join(', ')}</p>
                  )}

                  <div className={styles.actions}>
                    <button type="button" onClick={handleCopy} className={styles.secondaryBtn}>
                      {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                    {savedId ? (
                      <a href={documentPdfUrl(savedId)} download className={styles.primaryBtn}>
                        <Download size={15} /> Download PDF
                      </a>
                    ) : (
                      <button type="button" onClick={handleSave} disabled={saving || !body.trim()} className={styles.primaryBtn}>
                        {saving ? 'Saving…' : 'Save as PDF'}
                      </button>
                    )}
                  </div>
                  {savedId && (
                    <p className={styles.hint}>
                      Saved to <Link href="/dashboard/documents">your documents</Link>, where you can also note when
                      and where you sent it. Further edits here are not saved.
                    </p>
                  )}
                  {saveError && <p className={styles.errorText}>{saveError}</p>}
                </div>

                {(draft.missingInformation.length > 0 || draft.assumptions.length > 0) && (
                  <div className={styles.listGrid}>
                    {draft.missingInformation.length > 0 && (
                      <div className={styles.tile}>
                        <span className={styles.tileLabel}>Details that would strengthen it</span>
                        <ul>{draft.missingInformation.map((m) => <li key={m}>{m}</li>)}</ul>
                      </div>
                    )}
                    {draft.assumptions.length > 0 && (
                      <div className={styles.tile}>
                        <span className={styles.tileLabel}>Added by the AI. Check these.</span>
                        <ul>{draft.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.nextStep}>
                  <p>
                    <strong>Next:</strong> this is still a draft. Send it to the office yourself, or{' '}
                    <Link href="/file-complaint">file it as a complaint on VaadaKaro</Link> to get a tracking ID.
                  </p>
                  <p className={styles.disclaimerText}>{draft.disclaimer}</p>
                </div>
              </div>
            ) : (
              <div className={base.emptyState}>
                <h3>Your letter will appear here</h3>
                <p>Write or speak what happened: when it started, where, and what you have already tried.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
