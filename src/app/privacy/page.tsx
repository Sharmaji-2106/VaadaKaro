'use client';

import { useState } from 'react';
import styles from '@/app/legal.module.css';
import { Lock, ChevronDown, Database, Eye, Share2, ShieldCheck, User, Cookie, Bell, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const sections = [
  {
    id: 'collection',
    num: '01',
    icon: Database,
    title: 'Data We Collect',
    content: (
      <>
        <p>VaadaKaro collects the following categories of information to provide its services effectively:</p>
        <h3>Identity & Contact Data</h3>
        <ul>
          <li><strong>Name, email address, phone number</strong> — collected during account registration.</li>
          <li><strong>Profile information</strong> — location (State/City), preferred departments, and notification settings.</li>
        </ul>
        <h3>Complaint & Case Data</h3>
        <ul>
          <li><strong>Complaint details</strong> — title, detailed description, category, department, and incident location.</li>
          <li><strong>Evidence & Attachments</strong> — images, PDFs, and documents you upload to support your grievance.</li>
          <li><strong>AI legal queries</strong> — input text you provide to the AI Legal Assistant.</li>
          <li><strong>Generated documents</strong> — drafts produced by the platform and stored in your secure vault.</li>
        </ul>
        <h3>Technical & Usage Data</h3>
        <ul>
          <li>IP address, browser type, device information, and session metadata.</li>
          <li>Usage analytics — how you interact with platform features and AI tools.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'purpose',
    num: '02',
    icon: Eye,
    title: 'Why We Collect This Data',
    content: (
      <>
        <p>Your data is used exclusively for the following lawful purposes under the DPDP Act 2023:</p>
        <ul>
          <li><strong>Service Delivery:</strong> To facilitate complaint filing, tracking, and AI-assisted document generation.</li>
          <li><strong>Communication:</strong> To send status updates, alerts, and essential platform notifications.</li>
          <li><strong>AI Processing:</strong> To generate contextually relevant legal guidance and document drafts.</li>
          <li><strong>Security & Safety:</strong> To detect fraud, prevent platform abuse, and ensure safe usage.</li>
          <li><strong>Platform Improvement:</strong> To fix technical bugs and enhance AI accuracy through anonymized analytics.</li>
        </ul>
        <div className={styles.highlightBox}>
          VaadaKaro does NOT sell your personal data to advertisers or third-party data brokers. We do not use your data for marketing profiling.
        </div>
      </>
    ),
  },
  {
    id: 'storage',
    num: '03',
    icon: Lock,
    title: 'Secure Document Storage',
    content: (
      <>
        <p>Evidence, legal documents, and complaint files are stored using industrial-grade security:</p>
        <ul>
          <li><strong>Encryption:</strong> Files are encrypted at rest using AES-256 and in transit via TLS 1.3.</li>
          <li><strong>Secure Cloud:</strong> We utilize Cloudinary's secure infrastructure for evidence storage, protected by server-side signed access tokens.</li>
          <li><strong>Vault Isolation:</strong> Your generated legal documents are stored in an isolated database environment tied strictly to your unique User ID.</li>
          <li><strong>Access Control:</strong> Only you and authorized governmental officers (for filed cases) can access your complaint data.</li>
        </ul>
        <p>Data is retained for as long as your account is active or as required by Indian law (e.g., for active legal proceedings).</p>
      </>
    ),
  },
  {
    id: 'ai-processing',
    num: '04',
    icon: ShieldCheck,
    title: 'AI Data Processing Disclosure',
    content: (
      <>
        <div className={styles.alertBox + ' ' + styles.alertInfo}>
          <Eye size={20} />
          <p>When you use the AI Assistant, your input text is processed by Google Gemini AI services to generate responses.</p>
        </div>
        <p>Key AI Privacy Principles:</p>
        <ul>
          <li><strong>No Training:</strong> VaadaKaro does not use your personal case details to train its proprietary models.</li>
          <li><strong>Data Minimization:</strong> Only relevant complaint context is shared with the AI infrastructure to generate meaningful guidance.</li>
          <li><strong>Session History:</strong> AI interactions are stored in your private history for your convenience; you may clear this history at any time.</li>
        </ul>
        <p>By using AI features, you consent to this specific processing for the purpose of receiving informational legal guidance.</p>
      </>
    ),
  },
  {
    id: 'sharing',
    num: '05',
    icon: Share2,
    title: 'Data Sharing & Disclosure',
    content: (
      <>
        <div className={styles.highlightBox}>
          We share your data only when necessary to fulfill your requests or comply with the law.
        </div>
        <p>Sharing scenarios include:</p>
        <ul>
          <li><strong>Authorities:</strong> When you file a formal complaint, relevant details are shared with the designated department (e.g., Police, Municipal Corp) for resolution.</li>
          <li><strong>Service Providers:</strong> Cloud hosting (Vercel), AI (Google), and storage (Cloudinary) providers that help us run the platform.</li>
          <li><strong>Legal Mandate:</strong> In response to a valid court order, search warrant, or legal requirement under Indian law.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'security',
    num: '06',
    icon: Lock,
    title: 'Multi-Layered Security',
    content: (
      <>
        <p>VaadaKaro implements a robust security architecture:</p>
        <ul>
          <li><strong>Session Security:</strong> Powered by NextAuth with secure session cookies and CSRF protection.</li>
          <li><strong>Role-Based Access:</strong> Strict separation between Citizen data and Officer interfaces.</li>
          <li><strong>Input Sanitization:</strong> All submissions undergo server-side validation to prevent injection attacks and XSS.</li>
          <li><strong>Audit Logging:</strong> Critical actions are logged to maintain an immutable record of case handling.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'rights',
    num: '07',
    icon: User,
    title: 'Your Rights (DPDP Act 2023)',
    content: (
      <>
        <p>As a user in India, you have the following rights regarding your digital personal data:</p>
        <ul>
          <li><strong>Right to Access:</strong> Request a summary of the data we hold about you.</li>
          <li><strong>Right to Correction:</strong> Update or correct inaccurate personal information.</li>
          <li><strong>Right to Erasure:</strong> Request the deletion of your account and related personal data.</li>
          <li><strong>Right to Withdraw Consent:</strong> Withdraw your consent for data processing at any time (though some services may become unavailable).</li>
          <li><strong>Right to Grievance Redressal:</strong> Contact our Grievance Officer if your privacy concerns are not addressed.</li>
        </ul>
        <p>To exercise these rights, email: <strong>privacy@vaadakaro.in</strong></p>
      </>
    ),
  },
  {
    id: 'cookies',
    num: '08',
    icon: Cookie,
    title: 'Cookies & Trackers',
    content: (
      <>
        <p>We use essential cookies to maintain your login session and remember your preferences. We do NOT use third-party advertising cookies or cross-site tracking pixels. You can manage cookies through your browser settings.</p>
      </>
    ),
  },
  {
    id: 'updates',
    num: '09',
    icon: Bell,
    title: 'Changes to this Policy',
    content: (
      <>
        <p>We may update this Privacy Policy periodically. Substantial changes will be notified to you via in-app notification or email. Your continued use of VaadaKaro after such updates constitutes acceptance of the new policy.</p>
      </>
    ),
  },
  {
    id: 'contact',
    num: '10',
    icon: Mail,
    title: 'Privacy Contact',
    content: (
      <>
        <p>For all data-related queries:</p>
        <div className={styles.highlightBox}>
          <strong>Grievance Officer:</strong> grievance@vaadakaro.in<br />
          <strong>Privacy Team:</strong> privacy@vaadakaro.in<br />
          <strong>Response Time:</strong> Within 30 days as per DPDP Act guidelines.
        </div>
        <p>Last Revised: <strong>June 16, 2026</strong></p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['collection']));

  const toggle = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  return (
    <div className={styles.legalPage}>
      <div className={styles.hero}>
        <div className={styles.heroEyebrow}>
          <Lock size={14} /> Legal Document
        </div>
        <h1 className={styles.heroTitle}>Privacy Policy</h1>
        <p className={styles.heroSubtitle}>
          Your privacy is foundational to VaadaKaro. This policy explains what we collect, why, and how we protect it.
        </p>
        <div className={styles.heroMeta}>
          <span className={styles.heroMetaItem}><strong>Effective Date:</strong> June 16, 2025</span>
          <span className={styles.heroMetaItem}><strong>Version:</strong> 1.0</span>
          <span className={styles.heroMetaItem}><strong>Jurisdiction:</strong> India (DPDP Act 2023)</span>
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.toc}>
          <div className={styles.tocTitle}>Table of Contents</div>
          <ul className={styles.tocList}>
            {sections.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} onClick={() => setOpenSections(prev => new Set([...prev, s.id]))}>
                  {s.num}. {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {sections.map(s => {
          const isOpen = openSections.has(s.id);
          const Icon = s.icon;
          return (
            <div key={s.id} id={s.id} className={styles.sectionCard}>
              <div className={styles.sectionHeader} onClick={() => toggle(s.id)}>
                <div className={styles.sectionIcon}><Icon size={20} /></div>
                <div className={styles.sectionTitleGroup}>
                  <div className={styles.sectionNum}>Section {s.num}</div>
                  <div className={styles.sectionTitle}>{s.title}</div>
                </div>
                <ChevronDown size={20} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
              </div>
              {isOpen && <div className={styles.sectionBody}>{s.content}</div>}
            </div>
          );
        })}

        <div className={styles.bottomCta}>
          <h2>Questions About Your Data?</h2>
          <p>Manage your notification preferences and data settings from your account.</p>
          <Link href="/dashboard/settings" className={styles.ctaBtn}>
            Open Account Settings <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
