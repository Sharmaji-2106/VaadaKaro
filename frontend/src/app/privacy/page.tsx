'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/legal.module.css';
import {
  Lock,
  ChevronDown,
  Database,
  Eye,
  Share2,
  ShieldCheck,
  User,
  Cookie,
  Bell,
  Mail,
  ArrowRight,
  Clock,
  Baby,
  AlertTriangle,
  Languages,
} from 'lucide-react';
import Link from 'next/link';
import { getGrievanceOfficer, type GrievanceOfficer } from '@/services/privacy';

// Keep in step with PRIVACY_NOTICE_VERSION in the backend config: consents record this version.
const NOTICE_VERSION = '2026-10-26';
const EFFECTIVE = '26 October 2026';

function OfficerContact({ officer }: { officer: GrievanceOfficer | null }) {
  const email = officer?.email ?? 'grievance@vaadakaro.in';
  return (
    <div className={styles.highlightBox}>
      <strong>Grievance Officer:</strong> {officer?.name || 'Grievance Officer, VaadaKaro'}
      <br />
      <strong>Email:</strong> <a href={`mailto:${email}`}>{email}</a>
      {officer?.address && (
        <>
          <br />
          <strong>Address:</strong> {officer.address}
        </>
      )}
      <br />
      <strong>Timelines:</strong> acknowledged within {officer?.acknowledgeWithinHours ?? 24} hours, answered within{' '}
      {officer?.resolveWithinDays ?? 15} days.
      <br />
      Or use the <Link href="/grievance">Grievance Officer page</Link>.
    </div>
  );
}

const buildSections = (officer: GrievanceOfficer | null) => [
  {
    id: 'collection',
    num: '01',
    icon: Database,
    title: 'Data We Collect',
    content: (
      <>
        <p>VaadaKaro is the Data Fiduciary for the personal data below. We collect only what each service needs:</p>
        <h3>Account</h3>
        <ul>
          <li><strong>Name, email address and password</strong> (stored only as a one-way hash), and your confirmation that you are 18 or older.</li>
          <li><strong>Optional:</strong> phone number, and a nominee you choose (their name, relation and contact).</li>
        </ul>
        <h3>Complaints and documents</h3>
        <ul>
          <li><strong>Complaints:</strong> title, description, category, department, address and PIN code of the incident.</li>
          <li><strong>Attachments</strong> you upload as evidence (images and PDFs, up to 10 MB each).</li>
          <li><strong>Documents and letters</strong> you save, and where and when you say you sent them.</li>
          <li><strong>Legal assistant questions</strong> and answers, if you are signed in.</li>
          <li><strong>Lawyer consultations</strong> you request, and what you write in them.</li>
        </ul>
        <h3>Technical</h3>
        <ul>
          <li>Your IP address, used briefly to limit repeated requests and sign-in attempts.</li>
          <li>A record of important actions (for example, sign-up, consent, status changes), kept for security.</li>
        </ul>
        <p>We do not use advertising or analytics trackers.</p>
      </>
    ),
  },
  {
    id: 'purpose',
    num: '02',
    icon: Eye,
    title: 'Why We Use It',
    content: (
      <>
        <ul>
          <li><strong>Running your account and the services you ask for</strong> (filing, tracking, drafting, consultations), on the consent you give at sign-up.</li>
          <li><strong>AI drafting and the legal assistant</strong>, only with your separate consent (section 04).</li>
          <li><strong>Telling you about your complaints</strong>, consultations and requests.</li>
          <li><strong>Security:</strong> preventing abuse and investigating incidents.</li>
          <li><strong>Measuring whether the service works</strong>, using counts (for example, how many letters were drafted), never the text of your complaints or letters.</li>
          <li><strong>Complying with Indian law</strong>, for example a lawful order from a court or authority.</li>
        </ul>
        <div className={styles.highlightBox}>We do not sell your personal data or use it for advertising.</div>
      </>
    ),
  },
  {
    id: 'storage',
    num: '03',
    icon: Lock,
    title: 'Storage, Security and Retention',
    content: (
      <>
        <ul>
          <li>Traffic to VaadaKaro uses HTTPS. Our database (MongoDB Atlas) and file storage (Cloudflare R2) encrypt data at rest.</li>
          <li>Attachments are in a private bucket and can be opened only through links that expire within minutes.</li>
          <li>Officers see only complaints of their own department. Access is checked on our servers for every request.</li>
          <li>Our service providers may store data outside India. The DPDP Act, 2023 allows this except to countries the Government of India restricts.</li>
        </ul>
        <h3>How long we keep it</h3>
        <ul>
          <li><strong>Account, documents, consultations:</strong> until you delete your account.</li>
          <li><strong>Complaints:</strong> until you delete your account. Complaints a department is already handling then stay in its records without your name, address, PIN code or attachments.</li>
          <li><strong>Read notifications:</strong> 180 days. <strong>Legal assistant history:</strong> 1 year.</li>
          <li><strong>Security logs and consent records:</strong> at least 1 year, as Indian rules require; they hold account ids, not your complaint text.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ai-processing',
    num: '04',
    icon: ShieldCheck,
    title: 'AI Processing (Google Gemini)',
    content: (
      <>
        <div className={styles.alertBox + ' ' + styles.alertInfo}>
          <Eye size={20} />
          <p>
            The AI tools send what you type to Google Gemini, which may process it outside India. This happens only if
            you agree: at sign-up, in Settings, or (without an account) with each question.
          </p>
        </div>
        <ul>
          <li>Filing and tracking complaints never needs AI consent.</li>
          <li>You can withdraw consent at any time in <Link href="/dashboard/settings">Settings</Link>. It stops AI processing at once and erases your legal assistant history; documents you chose to save stay until you delete them.</li>
          <li>Google handles the text under its own terms for the Gemini API; depending on the plan, Google may keep it for a limited time. Don&apos;t include ID numbers (Aadhaar, PAN) or other people&apos;s details you don&apos;t need to.</li>
          <li>AI output is information, not legal advice, and can be wrong. Check everything before you use it.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'sharing',
    num: '05',
    icon: Share2,
    title: 'Who We Share It With',
    content: (
      <>
        <ul>
          <li><strong>The department you file with:</strong> its officers on VaadaKaro see your complaint so they can act on it.</li>
          <li><strong>A lawyer you book:</strong> your name and what you wrote; your email and phone only once they confirm.</li>
          <li><strong>Service providers</strong> that run VaadaKaro for us: Vercel (website), Render (servers), MongoDB Atlas (database), Cloudflare (file storage) and Google (AI, with your consent).</li>
          <li><strong>Authorities</strong> when Indian law requires it, for example a court order.</li>
        </ul>
        <p>Anyone with a complaint&apos;s tracking ID can see its status and history, but not the description, address or files.</p>
      </>
    ),
  },
  {
    id: 'rights',
    num: '06',
    icon: User,
    title: 'Your Rights (DPDP Act, 2023)',
    content: (
      <>
        <ul>
          <li><strong>Access (s.11):</strong> download everything we hold about you from Settings › Your data.</li>
          <li><strong>Correction and erasure (s.12):</strong> correct details through the <Link href="/grievance">Grievance Officer</Link>, or delete your account yourself in Settings.</li>
          <li><strong>Withdraw consent (s.6):</strong> as easily as you gave it, in Settings.</li>
          <li><strong>Nominate (s.14):</strong> choose someone to use these rights if you die or cannot act, in Settings.</li>
          <li><strong>Grievance redressal (s.13):</strong> through the <Link href="/grievance">Grievance Officer</Link>. If you are not satisfied, you may complain to the Data Protection Board of India.</li>
        </ul>
        <p>
          This notice is in English, Hindi and Marathi. To read it in another language listed in the Eighth Schedule to
          the Constitution, ask the <Link href="/grievance">Grievance Officer</Link> and we will send it to you.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    num: '07',
    icon: Baby,
    title: 'Children',
    content: (
      <p>
        Accounts are only for people aged 18 or over, because the DPDP Act requires verifiable parental consent for
        children&apos;s data and we do not offer that. A parent or guardian can file a complaint on a child&apos;s behalf
        from their own account.
      </p>
    ),
  },
  {
    id: 'breach',
    num: '08',
    icon: AlertTriangle,
    title: 'If Something Goes Wrong',
    content: (
      <p>
        If a breach affects your personal data, we will tell you without delay, in the app and through the contact
        details you gave us, with what
        happened, what it may mean for you and what to do. We also report it to the Data Protection Board of India and
        CERT-In as the law requires.
      </p>
    ),
  },
  {
    id: 'cookies',
    num: '09',
    icon: Cookie,
    title: 'Cookies',
    content: (
      <p>
        One essential cookie keeps you signed in. It cannot be read by scripts on the page. We use no advertising or
        tracking cookies.
      </p>
    ),
  },
  {
    id: 'hindi',
    num: '10',
    icon: Languages,
    title: 'हिन्दी में सारांश',
    content: (
      <div lang="hi">
        <p>
          VaadaKaro आपका नाम, ईमेल, आपकी शिकायतें, अपलोड की गई फ़ाइलें और आपके सहेजे गए दस्तावेज़ इसलिए रखता है ताकि आप
          शिकायत दर्ज कर सकें, उसकी स्थिति देख सकें और पत्र तैयार कर सकें। आपकी शिकायत संबंधित विभाग के अधिकारियों को दिखाई
          देती है।
        </p>
        <p>
          AI सुविधाएँ (पत्र का मसौदा, कानूनी सहायक) वैकल्पिक हैं। आपकी सहमति होने पर ही आपका लिखा हुआ Google Gemini को भेजा
          जाता है, जो इसे भारत के बाहर भी प्रोसेस कर सकता है। यह सहमति आप कभी भी Settings में वापस ले सकते हैं।
        </p>
        <p>
          आपके अधिकार (डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023): अपने डेटा की जानकारी पाना, उसे सुधरवाना या मिटवाना,
          सहमति वापस लेना, नामांकित व्यक्ति (nominee) चुनना और शिकायत करना। Settings › Your data से आप अपना डेटा डाउनलोड
          कर सकते हैं या खाता हटा सकते हैं।
        </p>
        <p>
          शिकायत अधिकारी: {officer?.email ?? 'grievance@vaadakaro.in'}। पावती 24 घंटे में, उत्तर 15 दिन में। संतुष्ट न होने
          पर आप भारतीय डेटा संरक्षण बोर्ड से शिकायत कर सकते हैं। खाता केवल 18 वर्ष या उससे अधिक आयु के लोगों के लिए है।
        </p>
      </div>
    ),
  },
  {
    id: 'marathi',
    num: '11',
    icon: Languages,
    title: 'मराठीत सारांश',
    content: (
      <div lang="mr">
        <p>
          VaadaKaro तुमचे नाव, ईमेल, तुमच्या तक्रारी, अपलोड केलेल्या फाइल्स आणि तुम्ही जतन केलेले दस्तऐवज ठेवते, जेणेकरून
          तुम्ही तक्रार नोंदवू शकाल, तिची स्थिती पाहू शकाल आणि पत्र तयार करू शकाल. तुमची तक्रार संबंधित विभागाच्या
          अधिकाऱ्यांना दिसते.
        </p>
        <p>
          AI सुविधा (पत्राचा मसुदा, कायदेशीर सहाय्यक) ऐच्छिक आहेत. तुमची संमती असेल तरच तुम्ही लिहिलेला मजकूर Google
          Gemini कडे पाठवला जातो, जो त्यावर भारताबाहेरही प्रक्रिया करू शकतो. ही संमती तुम्ही कधीही Settings मध्ये मागे घेऊ
          शकता.
        </p>
        <p>
          तुमचे अधिकार (डिजिटल वैयक्तिक डेटा संरक्षण अधिनियम, 2023): तुमच्या डेटाची माहिती मिळवणे, तो दुरुस्त करणे किंवा
          पुसून टाकणे, संमती मागे घेणे, नामनिर्देशित व्यक्ती (nominee) नेमणे आणि तक्रार करणे. Settings › Your data मधून
          तुम्ही तुमचा डेटा डाउनलोड करू शकता किंवा खाते हटवू शकता.
        </p>
        <p>
          तक्रार अधिकारी: {officer?.email ?? 'grievance@vaadakaro.in'}. पोच 24 तासांत, उत्तर 15 दिवसांत. समाधान न झाल्यास तुम्ही
          भारतीय डेटा संरक्षण मंडळाकडे तक्रार करू शकता. खाते फक्त 18 वर्षे किंवा त्याहून अधिक वयाच्या व्यक्तींसाठी आहे.
        </p>
      </div>
    ),
  },
  {
    id: 'updates',
    num: '12',
    icon: Bell,
    title: 'Changes to this Notice',
    content: (
      <p>
        When this notice changes in a way that affects how we use your data, we will tell you in the app and ask for
        your consent again where the law requires it. Each consent you give is recorded with the version of the notice
        you saw (this is version {NOTICE_VERSION}).
      </p>
    ),
  },
  {
    id: 'contact',
    num: '13',
    icon: Mail,
    title: 'Grievance Officer',
    content: (
      <>
        <OfficerContact officer={officer} />
        <p>
          <Clock size={14} style={{ verticalAlign: '-2px' }} /> Last revised: <strong>{EFFECTIVE}</strong>
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['collection']));
  const [officer, setOfficer] = useState<GrievanceOfficer | null>(null);

  useEffect(() => {
    getGrievanceOfficer().then((r) => r.success && setOfficer(r.data));
    // Links such as /privacy#hindi open that section.
    const hash = window.location.hash.slice(1);
    if (hash) setOpenSections((prev) => new Set([...prev, hash]));
  }, []);

  const sections = buildSections(officer);

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
          <Lock size={14} /> Privacy notice
        </div>
        <h1 className={styles.heroTitle}>Privacy Policy</h1>
        <p className={styles.heroSubtitle}>
          What we collect, why, how long we keep it, and your rights under the Digital Personal Data Protection Act,
          2023. Also in <a href="#hindi" onClick={() => setOpenSections(prev => new Set([...prev, 'hindi']))}>हिन्दी</a> and{' '}
          <a href="#marathi" onClick={() => setOpenSections(prev => new Set([...prev, 'marathi']))}>मराठी</a>.
        </p>
        <div className={styles.heroMeta}>
          <span className={styles.heroMetaItem}><strong>Effective:</strong> {EFFECTIVE}</span>
          <span className={styles.heroMetaItem}><strong>Version:</strong> {NOTICE_VERSION}</span>
          <span className={styles.heroMetaItem}><strong>Law:</strong> DPDP Act 2023, IT Act 2000</span>
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
          <h2>Manage your data</h2>
          <p>Download your data, change AI consent, add a nominee or delete your account.</p>
          <Link href="/dashboard/settings" className={styles.ctaBtn}>
            Open Settings <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
