"use client";

import styles from "../login/login.module.css";
import Link from "next/link";
import { ChevronLeft, Info } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo/Logo";

export default function ForgotPasswordPage() {
  return (
    <div className={styles.authWrapper}>
      <div className={`${styles.authContainer} ${styles.single}`}>
        <div className={styles.formSide}>
          <div className={styles.formHeader}>
            <LogoMark size={40} />
            <h1 className={styles.formTitle}>Reset your password</h1>
            <p className={styles.formSubtitle}>Enter your email and we will send you a reset link.</p>
          </div>

          <div className={styles.noticeMessage}>
            <Info size={18} /> Password reset is coming soon. Contact support if you need access urgently.
          </div>

          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.field}>
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" disabled />
            </div>

            <button type="submit" disabled className={styles.submitBtn}>
              Send reset link
            </button>
          </form>

          <div className={styles.formFooter}>
            <Link href="/login" className={styles.backLink}>
              <ChevronLeft size={16} /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
