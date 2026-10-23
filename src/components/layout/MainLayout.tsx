import { Header } from "@/components/layout/Header";
import { Logo } from "@/components/ui/Logo/Logo";
import Link from "next/link";
import styles from "./layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.appWrapper}>
      <Header />
      <main className={styles.mainContent}>
        {children}
      </main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.brand}>
            <Logo size="md" theme="dark" />
            <p className={styles.tagline}>
              Empowering India's citizens through technology-driven legal transparency.
            </p>
          </div>
          
          <div className={styles.footerCol}>
            <h4>Platform</h4>
            <div className={styles.footerLinks}>
              <Link href="/file-complaint">File Complaint</Link>
              <Link href="/track-complaint">Track Issue</Link>
              <Link href="/ai-assistant">AI Assistant</Link>
              <Link href="/dashboard">Dashboard</Link>
            </div>
          </div>

          <div className={styles.footerCol}>
            <h4>Legal</h4>
            <div className={styles.footerLinks}>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/disclaimer">Legal Disclaimer</Link>
            </div>
          </div>

          <div className={styles.footerCol}>
            <h4>Contact</h4>
            <div className={styles.footerLinks}>
              <Link href="/support">Help Center</Link>
              <Link href="/about">About Us</Link>
              <Link href="/contact">Get in Touch</Link>
            </div>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            &copy; {new Date().getFullYear()} VaadaKaro Technologies. All rights reserved.
          </div>
          <div className={styles.copyright}>
            Made with trust in India.
          </div>
        </div>
      </footer>
    </div>
  );
}
