import Link from 'next/link';
import styles from './page.module.css';
import { 
  ShieldCheck, 
  MessageSquare, 
  Search, 
  Zap, 
  ArrowRight, 
  Scale, 
  Clock, 
  ChevronRight,
  ClipboardList,
  FileText,
  BadgeCheck
} from 'lucide-react';

export default function Home() {
  return (
    <div className={styles.wrapper}>
      {/* Hero Section - Official Trust Statement */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <Scale size={14} /> Official Citizen Redressal Platform
            </div>
            <h1 className={styles.title}>
              Citizen Grievance Redressal <br />
              <span className={styles.highlight}>& Accountability Portal</span>
            </h1>
            <p className={styles.description}>
              An integrated system for filing complaints, receiving AI-assisted legal guidance, and tracking resolution status with government departments.
            </p>
            
            <div className={styles.ctaGroup}>
              <Link href="/file-complaint" className={styles.primaryButton}>
                Submit a New Complaint <ArrowRight size={20} />
              </Link>
              <Link href="/track-complaint" className={styles.secondaryButton}>
                Track Existing Case
              </Link>
            </div>

            <div className={styles.heroTrust}>
              <div className={styles.trustItem}>
                <div className={styles.trustIcon}><ShieldCheck size={24} /></div>
                <span>Secure Filing</span>
              </div>
              <div className={styles.trustItem}>
                <div className={styles.trustIcon}><BadgeCheck size={24} /></div>
                <span>Verified Officers</span>
              </div>
              <div className={styles.trustIcon} style={{ display: 'none' }}><Zap size={24} /></div> {/* Hidden for spacing consistency in grid */}
              <div className={styles.trustItem}>
                <div className={styles.trustIcon}><Scale size={24} /></div>
                <span>Legal Clarity</span>
              </div>
              <div className={styles.trustItem}>
                <div className={styles.trustIcon}><Clock size={24} /></div>
                <span>Real-time Status</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Citizen Statistics Dashboard */}
      <section className={styles.statsBar}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <h3>12,450+</h3>
              <p>Grievances Filed</p>
            </div>
            <div className={styles.statItem}>
              <h3>98.2%</h3>
              <p>Resolution Rate</p>
            </div>
            <div className={styles.statItem}>
              <h3>4,200+</h3>
              <p>Legal Drafts Generated</p>
            </div>
            <div className={styles.statItem}>
              <h3>24 hrs</h3>
              <p>Avg. Response Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Structured Workflow */}
      <section className={styles.howItWorks}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.preTitle}>Standard Operating Procedure</span>
            <h2 className={styles.sectionTitle}>Process Flow for Redressal</h2>
          </div>

          <div className={styles.stepGrid}>
            {[
              { 
                icon: <ClipboardList size={24} />, 
                title: '1. File Complaint', 
                desc: 'Provide details about your grievance. Mention date, location, and nature of the issue clearly.' 
              },
              { 
                icon: <MessageSquare size={24} />, 
                title: '2. Legal Guidance', 
                desc: 'Our AI analyzes your case against relevant laws and suggests the best legal pathway for resolution.' 
              },
              { 
                icon: <Search size={24} />, 
                title: '3. Department Review', 
                desc: 'Your case is routed to the competent authority. Track which officer is currently handling your record.' 
              },
              { 
                icon: <Zap size={24} />, 
                title: '4. Resolution', 
                desc: 'Receive official closing remarks and rate the resolution process once your issue is addressed.' 
              }
            ].map((step, idx) => (
              <div key={idx} className={styles.stepCard}>
                <span className={styles.stepNumber}>0{idx + 1}</span>
                <div className={styles.stepIconWrapper}>{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Administrative Action */}
      <section className={styles.finalCta}>
        <div className={styles.container}>
          <div className={styles.ctaBox}>
            <h2>Ensure Accountability.</h2>
            <p>Every grievance filed is a step towards a better governed society. Access the citizen portal to start.</p>
            <Link href="/signup" className={styles.premiumCta}>
              Register Citizen Account <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

