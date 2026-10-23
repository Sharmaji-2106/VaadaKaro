'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  ShieldCheck, 
  Save, 
  CheckCircle2,
  Lock,
  Globe
} from 'lucide-react';
import styles from './settings.module.css';
import { getUserSettings, updateUserSettings } from '@/lib/actions/notificationActions';

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
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <div className="animate-pulse text-gray-400">Loading Configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Account Settings</h1>
        <p>Manage your communication preferences and security oversight.</p>
      </header>

      <div className={styles.settingsGrid}>
        {/* Notifications Section */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Bell size={20} className="text-yellow-600" />
            <h2>Communication Preferences</h2>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h3>Email Notifications</h3>
                <p>Receive official status updates and resolution summaries via email.</p>
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
                <h3>In-App Notifications</h3>
                <p>Allow the notification center to alert you of real-time changes.</p>
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
                <h3>Legal & Privacy Updates</h3>
                <p>Stay informed about changes to platform policies and legal guidance.</p>
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
            <ShieldCheck size={20} className="text-navy-600" />
            <h2>Security & Sovereignty</h2>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h3>Data Encryption</h3>
                <p>All grievance data is encrypted at rest and in transit. (System Managed)</p>
              </div>
              <Lock size={18} className="text-gray-400" />
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h3>Jurisdictional Origin</h3>
                <p>Your data is processed and stored on Indian servers. (System Managed)</p>
              </div>
              <Globe size={18} className="text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.saveSection}>
        {showSuccess && (
          <div className={styles.successMsg}>
            <CheckCircle2 size={16} /> Preferences updated successfully
          </div>
        )}
        <button 
          className={styles.saveBtn} 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Syncing...' : <><Save size={18} /> Apply Changes</>}
        </button>
      </div>
    </div>
  );
}
