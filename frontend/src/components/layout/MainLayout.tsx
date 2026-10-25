import { Header } from "@/components/layout/Header";
import { Logo } from "@/components/ui/Logo/Logo";
import Link from "next/link";
import styles from "./layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.appWrapper}>
      <a href="#main" className={styles.skipLink}>Skip to main content</a>
      <Header />
      <main id="main" className={styles.mainContent}>
        {children}
      </main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.brand}>
            <Logo size="sm" theme="dark" />
            <p className={styles.tagline}>
              A citizen platform to report civic issues, understand your legal options, and follow every complaint to resolution.
            </p>
          </div>

          <div className={styles.footerCol}>
            <h4>Services</h4>
            <div className={styles.footerLinks}>
              <Link href="/file-complaint">File a complaint</Link>
              <Link href="/track-complaint">Track status</Link>
              <Link href="/ai-assistant">Legal assistant</Link>
              <Link href="/generate-docs">Draft legal documents</Link>
              <Link href="/find-lawyer">Find a lawyer</Link>
            </div>
          </div>

          <div className={styles.footerCol}>
            <h4>Account</h4>
            <div className={styles.footerLinks}>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/dashboard/settings">Settings</Link>
              <Link href="/login">Sign in</Link>
            </div>
          </div>

          <div className={styles.footerCol}>
            <h4>Legal</h4>
            <div className={styles.footerLinks}>
              <Link href="/privacy">Privacy policy</Link>
              <Link href="/terms">Terms of service</Link>
              <Link href="/disclaimer">AI disclaimer</Link>
            </div>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            &copy; {new Date().getFullYear()} VaadaKaro. Not affiliated with any government body.
          </div>
          <div className={styles.emergency}>
            In an emergency, call <strong>112</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}
