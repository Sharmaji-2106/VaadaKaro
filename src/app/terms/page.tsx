'use client';

import { useState } from 'react';
import styles from '@/app/legal.module.css';
import { Scale, ChevronDown, FileText, Users, Shield, AlertTriangle, Ban, Copyright, LogOut, Gavel, MapPin, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const sections = [
  {
    id: 'introduction',
    num: '01',
    icon: FileText,
    title: 'Introduction & Agreement',
    content: (
      <>
        <p>Welcome to <strong>VaadaKaro</strong> ("Platform", "we", "our", or "us"). VaadaKaro is a citizen empowerment and legal-tech platform designed to help individuals in India file grievances, access AI-powered legal guidance, generate legal-assistance documents, and track the progress of their complaints through official channels.</p>
        <p>By accessing or using VaadaKaro, you ("User", "you", "your") agree to be legally bound by these Terms & Conditions ("Terms"). If you do not agree to these Terms, you must cease use of the Platform immediately.</p>
        <div className={styles.highlightBox}>
          These Terms constitute a binding legal agreement between you and VaadaKaro Technologies. Please read them carefully before using any feature of this Platform.
        </div>
        <p>We reserve the right to update these Terms at any time. Continued use of the Platform after changes are posted constitutes your acceptance of the revised Terms.</p>
      </>
    ),
  },
  {
    id: 'eligibility',
    num: '02',
    icon: Users,
    title: 'User Eligibility',
    content: (
      <>
        <p>To use VaadaKaro, you must meet the following eligibility requirements:</p>
        <ul>
          <li>You must be at least <strong>18 years of age</strong>. If you are under 18, you may only use the Platform under the direct supervision and with the express consent of a parent or legal guardian.</li>
          <li>You must be a resident of India or filing a complaint related to an incident occurring within India's jurisdiction.</li>
          <li>You must have the legal capacity to enter into binding contracts under applicable Indian law.</li>
          <li>You must not have been previously suspended or permanently banned from the Platform for policy violations.</li>
        </ul>
        <div className={styles.alertBox + ' ' + styles.alertWarning}>
          <AlertTriangle size={20} />
          <p>By creating an account, you represent and warrant that you meet all eligibility requirements. Providing false eligibility information is a violation of these Terms and may result in immediate account termination.</p>
        </div>
      </>
    ),
  },
  {
    id: 'accounts',
    num: '03',
    icon: Shield,
    title: 'Account Responsibility & Security',
    content: (
      <>
        <p>You are solely responsible for:</p>
        <ul>
          <li>Maintaining the confidentiality of your account credentials (email, password, OTP codes).</li>
          <li>All activity that occurs under your account, whether authorized by you or not.</li>
          <li>Providing accurate, current, and complete information during registration and throughout platform use.</li>
          <li>Notifying us immediately at <strong>legal@vaadakaro.in</strong> if you suspect unauthorized access to your account.</li>
        </ul>
        <p>VaadaKaro will never ask for your password via email or phone. Any communication claiming to be from VaadaKaro requesting your password should be treated as fraudulent (phishing).</p>
        <div className={styles.highlightBox}>
          Accounts are non-transferable. Creating multiple accounts to circumvent suspensions, limits, or platform policies is strictly prohibited.
        </div>
      </>
    ),
  },
  {
    id: 'complaints',
    num: '04',
    icon: FileText,
    title: 'Complaint Submission Guidelines',
    content: (
      <>
        <p>VaadaKaro facilitates the digital submission and tracking of civic grievances. By submitting a complaint, you confirm and agree to the following:</p>
        <h3>User Affirmations</h3>
        <ul>
          <li>All information submitted is <strong>accurate, truthful, and to the best of your knowledge</strong>.</li>
          <li>You have legitimate grounds to file the complaint and are not acting in bad faith or with malicious intent.</li>
          <li>Any evidence, photographs, documents, or files you upload are authentic and legally obtained.</li>
          <li>You are the rightful party to the complaint or have express authorization to act on behalf of the complainant.</li>
        </ul>
        <h3>Strictly Prohibited Activities</h3>
        <div className={styles.tagRow}>
          {['False Complaints', 'Defamatory Content', 'Harassment', 'Fraudulent Documents', 'Impersonation', 'Repeat Filing Abuse', 'Malicious Use'].map(t => (
            <span key={t} className={`${styles.tag} ${styles.tagDanger}`}>{t}</span>
          ))}
        </div>
        <div className={styles.alertBox + ' ' + styles.alertDanger}>
          <AlertTriangle size={20} />
          <p><strong>Legal Consequences:</strong> Filing knowingly false or malicious complaints may constitute a criminal offence under <strong>Section 182 of the Indian Penal Code</strong>. VaadaKaro cooperates fully with law enforcement and governmental authorities in such cases.</p>
        </div>
      </>
    ),
  },
  {
    id: 'ai-disclaimer',
    num: '05',
    icon: AlertTriangle,
    title: 'AI Legal Assistance Disclaimer',
    content: (
      <>
        <div className={styles.alertBox + ' ' + styles.alertDanger}>
          <AlertTriangle size={20} />
          <p><strong>VaadaKaro is NOT a law firm and does NOT provide professional legal representation or advice.</strong></p>
        </div>
        <p>Our AI Legal Assistant and Document Generator are informational tools only. They are designed to help you understand your legal options in plain language and generate starting-point document drafts. Specifically:</p>
        <ul>
          <li>AI-generated guidance is <strong>informational only</strong> and does not constitute professional legal advice.</li>
          <li>No <strong>attorney-client relationship</strong> is created at any point through use of the Platform.</li>
          <li>AI-generated legal documents are <strong>template-based drafts</strong> and assistance tools. They are not reviewed by licensed advocates.</li>
          <li>AI responses may occasionally be inaccurate, incomplete, outdated, or not applicable to your specific situation (AI Hallucinations).</li>
          <li>Using AI guidance does not guarantee any legal outcome, authority response, or grievance resolution.</li>
        </ul>
        <div className={styles.highlightBox}>
          For complex legal matters, criminal cases, or situations involving imminent legal risk, you must consult a licensed legal professional. For emergencies, contact the police directly at <strong>100</strong>.
        </div>
      </>
    ),
  },
  {
    id: 'resolution',
    num: '06',
    icon: Gavel,
    title: 'Complaint Resolution Limitations',
    content: (
      <>
        <p>VaadaKaro is a <strong>facilitation platform</strong>. We streamline how citizens communicate with government and civic authorities, but we cannot and do not control the actions of those authorities.</p>
        <p>VaadaKaro expressly does NOT guarantee:</p>
        <ul>
          <li>Any response, action, or acknowledgment from any government department or authority.</li>
          <li>Resolution of your complaint or grievance within any specific timeframe.</li>
          <li>Any particular legal outcome or successful resolution.</li>
          <li>Enforcement of any legal right or remedy.</li>
        </ul>
        <p>VaadaKaro's role is strictly limited to: providing a digital interface for complaint filing, generating tracking records, providing AI-assisted legal information, and facilitating document creation assistance.</p>
      </>
    ),
  },
  {
    id: 'usage',
    num: '07',
    icon: Ban,
    title: 'Acceptable Use Policy',
    content: (
      <>
        <p>You agree to use VaadaKaro only for lawful purposes. The following activities are <strong>strictly prohibited</strong>:</p>
        <ul>
          <li>Filing complaints with fraudulent, false, or misleading information.</li>
          <li>Impersonation of any person, government official, or entity.</li>
          <li>Uploading files containing malware, viruses, or any malicious executable code.</li>
          <li>Uploading obscene, harmful, hateful, or illegal content.</li>
          <li>Sending unsolicited messages or spam through the Platform.</li>
          <li>Attempting to reverse-engineer, hack, or disrupt the Platform's infrastructure or AI systems.</li>
          <li>Scraping data from the Platform without express written consent.</li>
          <li>Using the Platform to facilitate any illegal activity under Indian law.</li>
        </ul>
        <p>Violation of this policy may result in immediate account suspension, permanent termination, reporting to law enforcement, and/or civil legal action.</p>
      </>
    ),
  },
  {
    id: 'ip',
    num: '08',
    icon: Copyright,
    title: 'Intellectual Property',
    content: (
      <>
        <p>All content, software, designs, branding, trademarks, AI systems, and platform architecture associated with VaadaKaro are the exclusive property of <strong>VaadaKaro Technologies</strong> and are protected under applicable Indian and international intellectual property laws.</p>
        <p>You are granted a limited, non-exclusive, non-transferable license to use the Platform. You may NOT:</p>
        <ul>
          <li>Copy, reproduce, or distribute any VaadaKaro content without written permission.</li>
          <li>Use VaadaKaro's branding, name, or logo in any manner that implies endorsement.</li>
          <li>Build competing products using VaadaKaro's systems, design patterns, or AI outputs.</li>
          <li>Claim ownership over copyrighted software elements or platform designs.</li>
        </ul>
        <p>Content you upload to the Platform (e.g., complaint descriptions, evidence) remains your property. You grant VaadaKaro a limited license to process and transmit such content solely for the purpose of delivering Platform services.</p>
      </>
    ),
  },
  {
    id: 'termination',
    num: '09',
    icon: LogOut,
    title: 'Suspension & Termination',
    content: (
      <>
        <p>VaadaKaro reserves the right to suspend or permanently terminate any account, at its sole discretion, in the following circumstances:</p>
        <ul>
          <li>Filing of false, fraudulent, or malicious complaints.</li>
          <li>Repeated violation of the Acceptable Use Policy.</li>
          <li>Submission of forged evidence or fraudulent legal documents.</li>
          <li>Abusive, threatening, or harassing behavior toward Platform staff, officers, or other users.</li>
          <li>Any activity that poses a legal, reputational, or security risk to the Platform.</li>
        </ul>
        <p>Upon termination, your right to access the Platform immediately ceases. Data retention and deletion are governed by our Privacy Policy.</p>
      </>
    ),
  },
  {
    id: 'liability',
    num: '10',
    icon: Shield,
    title: 'Limitation of Liability',
    content: (
      <>
        <p>To the maximum extent permitted by Indian law, VaadaKaro Technologies, its directors, and employees shall not be liable for:</p>
        <ul>
          <li>Any legal outcomes, adverse rulings, or authority delays arising from the use of AI tools.</li>
          <li>Inaccuracies or incompleteness in AI-generated responses (Hallucinations).</li>
          <li>Failure of any authority to respond to or act on a submitted complaint.</li>
          <li>Any indirect, incidental, or consequential damages.</li>
          <li>Actions taken by users in reliance on AI-generated informational drafts.</li>
          <li>Unauthorized access to user accounts resulting from user negligence.</li>
        </ul>
        <div className={styles.highlightBox}>
          VaadaKaro provides tools "as is" and "as available" without any express or implied warranties of merchantability or fitness for a particular purpose.
        </div>
      </>
    ),
  },
  {
    id: 'law',
    num: '11',
    icon: MapPin,
    title: 'Governing Law & Jurisdiction',
    content: (
      <>
        <p>These Terms shall be governed by and construed in accordance with the laws of <strong>India</strong>.</p>
        <p>Any disputes arising from or related to these Terms shall be subject to the exclusive jurisdiction of the courts located in <strong>New Delhi, India</strong>.</p>
        <p>VaadaKaro complies with all applicable Indian laws including, but not limited to:</p>
        <ul>
          <li>Information Technology Act, 2000</li>
          <li>Digital Personal Data Protection Act, 2023</li>
          <li>Consumer Protection Act, 2019</li>
        </ul>
      </>
    ),
  },
  {
    id: 'contact',
    num: '12',
    icon: Mail,
    title: 'Contact & Legal Enquiries',
    content: (
      <>
        <p>For questions, concerns, or legal notices, please contact our legal team at:</p>
        <div className={styles.highlightBox}>
          <strong>VaadaKaro Technologies</strong><br />
          Email: <strong>legal@vaadakaro.in</strong><br />
          Support: <strong>support@vaadakaro.in</strong><br />
          Grievance Officer: <strong>grievance@vaadakaro.in</strong>
        </div>
        <p>We aim to respond to all legal inquiries within 7 business days.</p>
      </>
    ),
  },
];

export default function TermsPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['introduction']));

  const toggle = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  return (
    <div className={styles.legalPage}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroEyebrow}>
          <Scale size={14} /> Legal Document
        </div>
        <h1 className={styles.heroTitle}>Terms & Conditions</h1>
        <p className={styles.heroSubtitle}>
          Please read these terms carefully. By using VaadaKaro, you agree to be bound by these conditions.
        </p>
        <div className={styles.heroMeta}>
          <span className={styles.heroMetaItem}><strong>Effective Date:</strong> June 16, 2025</span>
          <span className={styles.heroMetaItem}><strong>Version:</strong> 1.0</span>
          <span className={styles.heroMetaItem}><strong>Jurisdiction:</strong> India</span>
        </div>
      </div>

      <div className={styles.contentWrapper}>
        {/* Table of Contents */}
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

        {/* Sections */}
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

        {/* CTA */}
        <div className={styles.bottomCta}>
          <h2>Have Legal Questions?</h2>
          <p>Our team is here to help with platform-related legal enquiries.</p>
          <Link href="/ai-assistant" className={styles.ctaBtn}>
            Talk to AI Legal Assistant <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
