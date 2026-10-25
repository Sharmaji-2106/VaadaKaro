import Link from 'next/link';
import styles from './page.module.css';
import {
  ArrowRight,
  Check,
  ClipboardList,
  Search,
  MessageSquare,
  FileText,
  Scale,
  ShieldCheck,
  Lock,
  Bell,
} from 'lucide-react';

const services = [
  {
    href: '/file-complaint',
    icon: <ClipboardList size={22} />,
    tone: 'green',
    title: 'File a complaint',
    desc: 'Report a civic issue. We route it to the right department automatically.',
  },
  {
    href: '/track-complaint',
    icon: <Search size={22} />,
    tone: 'navy',
    title: 'Track a complaint',
    desc: 'See who is handling your case and every update, using your tracking ID.',
  },
  {
    href: '/ai-assistant',
    icon: <MessageSquare size={22} />,
    tone: 'saffron',
    title: 'Get legal guidance',
    desc: 'Ask about your rights, RTI, consumer law and more, in plain language.',
  },
  {
    href: '/generate-docs',
    icon: <FileText size={22} />,
    tone: 'navy',
    title: 'Draft legal documents',
    desc: 'Turn your problem into a formal complaint, RTI or notice in seconds.',
  },
  {
    href: '/find-lawyer',
    icon: <Scale size={22} />,
    tone: 'green',
    title: 'Find a lawyer',
    desc: 'Book a consultation with verified advocates near you.',
  },
];

const steps = [
  { title: 'Describe the issue', desc: 'Tell us what happened, where, and add photos or documents.' },
  { title: 'AI checks the details', desc: 'We flag missing information so your complaint is not rejected.' },
  { title: 'Department acts', desc: 'An officer is assigned and posts updates you can follow.' },
  { title: 'Resolution', desc: 'Get official closing remarks and rate how it was handled.' },
];

const departments = [
  'Municipal Corporation', 'Police', 'Electricity', 'Water Supply',
  'Roads & Infrastructure', 'Cyber Crime', 'Consumer Court', 'Women Safety',
];

const stats = [
  { value: '12,450+', label: 'Complaints filed' },
  { value: '98.2%', label: 'Resolution rate' },
  { value: '4,200+', label: 'Legal drafts generated' },
  { value: '24 hrs', label: 'Average first response' },
];

export default function Home() {
  return (
    <div className={styles.wrapper}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <span className={styles.badge}>Citizen grievance platform</span>
              <h1 className={styles.title}>
                Report civic issues.<br />
                <span className={styles.highlight}>Track them to resolution.</span>
              </h1>
              <p className={styles.description}>
                File a complaint with the right department, get AI-assisted legal guidance, and see every action taken on your case.
              </p>

              <div className={styles.ctaGroup}>
                <Link href="/file-complaint" className={styles.primaryButton}>
                  File a complaint <ArrowRight size={20} strokeWidth={2.5} />
                </Link>
                <Link href="/track-complaint" className={styles.secondaryButton}>
                  Track an existing complaint
                </Link>
              </div>

              <ul className={styles.heroChecks}>
                <li><Check size={16} strokeWidth={3} /> Free for every citizen</li>
                <li><Check size={16} strokeWidth={3} /> Routed to the right department</li>
                <li><Check size={16} strokeWidth={3} /> Updates at every step</li>
              </ul>
            </div>

            {/* Illustrative tracking preview */}
            <div className={styles.preview} aria-hidden="true">
              <div className={styles.previewTag}>Example</div>
              <div className={styles.previewCard}>
                <div className={styles.previewTop}>
                  <span className={styles.previewId}>VDK-2026-104829</span>
                  <span className={styles.previewStatus}>In progress</span>
                </div>
                <h3 className={styles.previewTitle}>Leaking water main on MG Road</h3>
                <p className={styles.previewMeta}>Water Supply · Gurugram, Haryana</p>

                <ol className={styles.previewSteps}>
                  <li className={styles.done}><span /> <div><b>Filed</b><small>12 Mar, 09:14</small></div></li>
                  <li className={styles.done}><span /> <div><b>Reviewed</b><small>12 Mar, 13:40</small></div></li>
                  <li className={styles.done}><span /> <div><b>Officer assigned</b><small>Jal Board, Ward 14</small></div></li>
                  <li className={styles.current}><span /> <div><b>Repair in progress</b><small>Crew dispatched today</small></div></li>
                  <li><span /> <div><b>Resolved</b><small>Expected in 2 days</small></div></li>
                </ol>
              </div>
              <div className={styles.previewToast}>
                <Bell size={16} />
                <div>
                  <b>Status updated</b>
                  <small>Your complaint is now in progress</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className={styles.services}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>What you can do</h2>
            <p className={styles.sectionLead}>Everything you need to raise an issue and see it through, in one place.</p>
          </div>
          <div className={styles.serviceGrid}>
            {services.map((s) => (
              <Link key={s.href} href={s.href} className={styles.serviceCard}>
                <div className={`${styles.serviceIcon} ${styles[s.tone]}`}>{s.icon}</div>
                <h3>{s.title} <ArrowRight size={18} className={styles.serviceArrow} /></h3>
                <p>{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howItWorks}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.preTitle}>How it works</span>
            <h2 className={styles.sectionTitle}>From complaint to resolution in four steps</h2>
          </div>
          <ol className={styles.stepGrid}>
            {steps.map((step, idx) => (
              <li key={step.title} className={styles.stepCard}>
                <span className={styles.stepNumber}>{idx + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Stats */}
      <section className={styles.statsBar}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            {stats.map((s) => (
              <div key={s.label} className={styles.statItem}>
                <h3>{s.value}</h3>
                <p>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments + trust */}
      <section className={styles.trust}>
        <div className={styles.container}>
          <div className={styles.trustGrid}>
            <div>
              <h2 className={styles.sectionTitleSm}>Departments we route to</h2>
              <div className={styles.deptList}>
                {departments.map((d) => <span key={d} className={styles.dept}>{d}</span>)}
              </div>
            </div>
            <div className={styles.trustList}>
              <div className={styles.trustItem}>
                <ShieldCheck size={22} />
                <div><b>Your data stays in India</b><p>Processed under the DPDP Act, 2023.</p></div>
              </div>
              <div className={styles.trustItem}>
                <Lock size={22} />
                <div><b>Encrypted end to end</b><p>Evidence and documents are encrypted at rest and in transit.</p></div>
              </div>
              <div className={styles.trustItem}>
                <Scale size={22} />
                <div><b>Guidance, not a law firm</b><p>AI help is informational. <Link href="/disclaimer">Read the disclaimer</Link>.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.container}>
          <div className={styles.ctaBox}>
            <div>
              <h2>Have an issue in your area?</h2>
              <p>Create a free account to file complaints and follow them in your dashboard.</p>
            </div>
            <div className={styles.ctaActions}>
              <Link href="/signup" className={styles.premiumCta}>
                Create a free account
              </Link>
              <Link href="/file-complaint" className={styles.ctaLink}>
                or file without waiting <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
