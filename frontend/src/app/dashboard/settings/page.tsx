'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import styles from './settings.module.css';
import { getUserSettings, updateUserSettings } from '@/services/notifications';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    emailEnabled: true,
    pushEnabled: true,
    legalUpdatesEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const result = await getUserSettings();
      if (result.success && result.settings) {
        setSettings({
          emailEnabled: result.settings.emailEnabled,
          pushEnabled: result.settings.pushEnabled,
          legalUpdatesEnabled: result.settings.legalUpdatesEnabled
        });
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setShowSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateUserSettings(settings);
    setSaving(false);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Settings</h1>
        
      </header>

      <div className={styles.settingsGrid}>
        {/* Notifications Section */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            
            <h2>Notifications</h2>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h3>Email</h3>
                <p>Status updates and resolution summaries.</p>
              </div>
              <label className={styles.toggle}>
                <input 
                  type="checkbox" 
                  checked={settings.emailEnabled} 
                  onChange={() => handleToggle('emailEnabled')} 
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h3>In-app alerts</h3>
                <p>Real-time changes in the notification center.</p>
              </div>
              <label className={styles.toggle}>
                <input 
                  type="checkbox" 
                  checked={settings.pushEnabled} 
                  onChange={() => handleToggle('pushEnabled')} 
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h3>Policy updates</h3>
                <p>Changes to platform policies and legal guidance.</p>
              </div>
              <label className={styles.toggle}>
                <input 
                  type="checkbox" 
                  checked={settings.legalUpdatesEnabled} 
                  onChange={() => handleToggle('legalUpdatesEnabled')} 
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>
        </div>

        {/* Security / Privacy Section (Placeholders/Informational) */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            
            <h2>Privacy</h2>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h3>Encryption</h3>
                <p>Your data is encrypted at rest and in transit.</p>
              </div>
              <span className={styles.valueText}>On</span>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h3>Data location</h3>
                <p>Processed and stored on servers in India.</p>
              </div>
              <span className={styles.valueText}>India</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.saveSection}>
        {showSuccess && (
          <div className={styles.successMsg}>
            <CheckCircle2 size={16} /> Saved
          </div>
        )}
        <button 
          className={styles.saveBtn} 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
