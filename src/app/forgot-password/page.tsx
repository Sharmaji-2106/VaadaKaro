"use client";

import styles from "../login/login.module.css";
import Link from "next/link";
import { ShieldCheck, Mail, ArrowRight, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <ShieldCheck size={48} color="var(--brand-gold)" />
        </div>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>Enter your email to receive a reset link</p>
        
        <div style={{ 
          padding: '1.25rem', 
          background: 'rgba(212, 175, 55, 0.1)', 
          border: '1px solid var(--brand-gold)', 
          borderRadius: 'var(--radius-md)',
          color: 'var(--brand-navy)',
          fontSize: '0.9rem',
          lineHeight: '1.5',
          marginBottom: '1.5rem'
        }}>
          <strong>Note:</strong> Password reset functionality is currently being implemented. Please contact support if you need urgent access.
        </div>

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.field}>
            <label>Email Address</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={20} />
              <input type="email" placeholder="name@domain.gov" disabled />
            </div>
          </div>
          
          <button type="submit" disabled className={styles.submitBtn}>
            Send Reset Link <ArrowRight size={20} />
          </button>
        </form>
        
        <div className={styles.footer}>
          <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <ArrowLeft size={16} /> Back to Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
