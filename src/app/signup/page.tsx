"use client";

import styles from "../login/login.module.css";
import Link from "next/link";
import { User, Mail, Lock, UserCircle, ShieldCheck, Clock, FileText, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useActionState } from "react";
import { registerUser } from "@/lib/actions/auth-actions";

export default function SignupPage() {
  const [state, action, isPending] = useActionState(registerUser, undefined);

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authContainer}>
        {/* Left Side: Guidance */}
        <div className={styles.guidanceSide}>
          <div className={styles.guidanceIcon}>
            <ShieldCheck size={48} />
          </div>
          <h2 className={styles.guidanceTitle}>Official Citizen Account</h2>
          <p className={styles.guidanceText}>
            Access the National Citizen Redressal Portal to file grievances, track department actions, and receive official legal guidance.
          </p>
          
          <ul className={styles.benefitsList}>
            <li>
              <div className={styles.benefitIcon}><ShieldCheck size={18} /></div>
              <span>Official redressal tracking</span>
            </li>
            <li>
              <div className={styles.benefitIcon}><Clock size={18} /></div>
              <span>Faster department response</span>
            </li>
            <li>
              <div className={styles.benefitIcon}><FileText size={18} /></div>
              <span>Generate legal drafts instantly</span>
            </li>
          </ul>

          <div className={styles.trustShield}>
            <ShieldCheck size={20} /> Data Encrypted & Protected
          </div>
        </div>

        {/* Right Side: Form */}
        <div className={styles.formSide}>
          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>Create Citizen Account</h1>
            <p className={styles.formSubtitle}>Join the portal for official grievance redressal</p>
          </div>

          <form action={action} className={styles.form}>
            {state?.error && (
              <div className={styles.errorMessage}>
                <AlertCircle size={18} /> {state.error}
              </div>
            )}

            {state?.success && (
              <div className={styles.successMessage}>
                <CheckCircle2 size={18} /> {state.success}
              </div>
            )}

            <div className={styles.field}>
              <label>Full Name</label>
              <div className={styles.inputWrapper}>
                <User className={styles.inputIcon} size={20} />
                <input name="name" type="text" placeholder="John Doe" required />
              </div>
            </div>

            <div className={styles.field}>
              <label>Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={20} />
                <input name="email" type="email" placeholder="name@domain.gov" required />
              </div>
            </div>

            <div className={styles.field}>
              <label>Password</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={20} />
                <input name="password" type="password" placeholder="••••••••" required />
              </div>
            </div>
            
            <div className={styles.field} style={{ marginTop: '0.5rem' }}>
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  name="consent" 
                  required 
                />
                <span>
                  I agree to the <Link href="/terms" target="_blank" style={{ color: 'var(--brand-navy)', fontWeight: 700 }}>Terms & Conditions</Link> and <Link href="/privacy" target="_blank" style={{ color: 'var(--brand-navy)', fontWeight: 700 }}>Privacy Policy</Link>.
                </span>
              </label>
            </div>
            
            <button type="submit" disabled={isPending} className={styles.submitBtn}>
              {isPending ? "Connecting to portal..." : "Create Account"} <ArrowRight size={20} />
            </button>
          </form>
          
          <div className={styles.formFooter}>
            Already registered? <Link href="/login">Sign In to Portal</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
