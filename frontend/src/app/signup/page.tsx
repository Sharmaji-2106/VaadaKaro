"use client";

import styles from "../login/login.module.css";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { registerUser } from "@/services/auth";
import { LogoMark } from "@/components/ui/Logo/Logo";
import AuthAside from "../login/AuthAside";

export default function SignupPage() {
  const [state, action, isPending] = useActionState(registerUser, undefined);

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authContainer}>
        <div className={styles.formSide}>
          <div className={styles.formHeader}>
            <LogoMark size={40} />
            <h1 className={styles.formTitle}>Create an account</h1>
            <p className={styles.formSubtitle}>Free for every citizen. Takes under a minute.</p>
          </div>

          <form action={action} className={styles.form}>
            {state?.error && (
              <div className={styles.errorMessage} role="alert">
                <AlertCircle size={18} /> {state.error}
              </div>
            )}

            {state?.success && (
              <div className={styles.successMessage}>
                <CheckCircle2 size={18} /> {state.success}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="name">Full name</label>
              <input id="name" name="name" type="text" autoComplete="name" required />
            </div>

            <div className={styles.field}>
              <label htmlFor="email">Email address</label>
              <span className={styles.hint}>We will send complaint updates here.</span>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Create a password</label>
              <span className={styles.hint}>Use at least 8 characters.</span>
              <input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>

            <label className={styles.checkboxLabel}>
              <input type="checkbox" name="consent" required />
              <span>
                I agree to the <Link href="/terms" target="_blank">Terms of service</Link> and <Link href="/privacy" target="_blank">Privacy policy</Link>.
              </span>
            </label>

            <button type="submit" disabled={isPending} className={styles.submitBtn}>
              {isPending ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className={styles.formFooter}>
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </div>

        <AuthAside
          title="Why create an account"
          points={[
            "File complaints routed to the right department",
            "Follow every action with a dated history",
            "AI checks your complaint before you submit",
            "Free legal guidance and document drafts",
          ]}
        />
      </div>
    </div>
  );
}
