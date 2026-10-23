"use client";

import styles from "./login.module.css";
import Link from "next/link";
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, Clock, FileText } from "lucide-react";
import { loginUser } from "@/lib/actions/auth-actions";
import { useActionState } from "react";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginUser, undefined);

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authContainer}>
        {/* Left Side: Guidance */}
        <div className={styles.guidanceSide}>
          <div className={styles.guidanceIcon}>
            <ShieldCheck size={48} />
          </div>
          <h2 className={styles.guidanceTitle}>Secure Citizen Access</h2>
          <p className={styles.guidanceText}>
            Access your personalized dashboard to track grievances, manage legal documents, and communicate with department officers securely.
          </p>
          
          <ul className={styles.benefitsList}>
            <li>
              <div className={styles.benefitIcon}><Clock size={18} /></div>
              <span>Real-time status updates</span>
            </li>
            <li>
              <div className={styles.benefitIcon}><FileText size={18} /></div>
              <span>Digital legal document vault</span>
            </li>
            <li>
              <div className={styles.benefitIcon}><Lock size={18} /></div>
              <span>Bank-grade data security</span>
            </li>
          </ul>

          <div className={styles.trustShield}>
            <ShieldCheck size={20} /> Signed & Verified Security
          </div>
        </div>

        {/* Right Side: Form */}
        <div className={styles.formSide}>
          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>Sign In</h1>
            <p className={styles.formSubtitle}>Enter your credentials to access the portal</p>
          </div>

          <form action={action} className={styles.form}>
            {state?.error && (
              <div className={styles.errorMessage}>
                <AlertCircle size={18} /> {state.error}
              </div>
            )}

            <div className={styles.field}>
              <label>Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={20} />
                <input name="email" type="email" placeholder="name@domain.gov" required />
              </div>
            </div>

            <div className={styles.field}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                <Link href="/forgot-password" className={styles.forgotLink}>Forgot Password?</Link>
              </div>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={20} />
                <input name="password" type="password" placeholder="••••••••" required />
              </div>
            </div>

            <button type="submit" disabled={isPending} className={styles.submitBtn}>
              {isPending ? "Verifying..." : "Sign In to Portal"} <ArrowRight size={20} />
            </button>
          </form>

          <div className={styles.formFooter}>
            New user? <Link href="/signup">Request a Citizen Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
