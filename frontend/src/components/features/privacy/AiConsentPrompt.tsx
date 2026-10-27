'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldQuestion } from 'lucide-react';
import { setAiConsent } from '@/services/privacy';
import styles from './AiConsentPrompt.module.css';

/**
 * Shown when an AI tool is refused because the person hasn't consented to AI processing.
 * Consent here is specific (this purpose only), informed and given by a clear action, and it can
 * be withdrawn in Settings just as easily (DPDP Act, 2023 s.6).
 */
export function AiConsentPrompt({ onGranted }: { onGranted: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allow = async () => {
    setSaving(true);
    setError('');
    const result = await setAiConsent(true);
    setSaving(false);
    if (result.success) onGranted();
    else setError(result.error === 'Unauthorized' ? 'Please sign in first.' : result.error);
  };

  return (
    <div className={styles.box} role="region" aria-label="Consent for AI processing">
      <ShieldQuestion size={22} className={styles.icon} />
      <div>
        <h3>Allow AI processing?</h3>
        <p>
          To draft this for you, what you typed is sent to <strong>Google Gemini</strong>, which may process it outside
          India. It is used only to produce this draft. Your complaints and documents work without it.
        </p>
        <p>
          You can withdraw this any time in <Link href="/dashboard/settings">Settings</Link>. Read the{' '}
          <Link href="/privacy#ai-processing">privacy notice</Link>.
        </p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="button" onClick={allow} disabled={saving} className={styles.allowBtn}>
          {saving ? 'Saving…' : 'Allow and continue'}
        </button>
      </div>
    </div>
  );
}
