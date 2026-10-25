"use client";

import styles from "./login.module.css";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { loginUser } from "@/services/auth";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo/Logo";
import AuthAside from "./AuthAside";

/** Carries ?callbackUrl= into the form so the user lands back where they started. */
function CallbackField() {
  const callbackUrl = useSearchParams().get("callbackUrl") || "";
  return <input type="hidden" name="callbackUrl" value={callbackUrl} />;
}

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginUser, undefined);

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authContainer}>
        <div className={styles.formSide}>
          <div className={styles.formHeader}>
            <LogoMark size={40} />
            <h1 className={styles.formTitle}>Sign in</h1>
            <p className={styles.formSubtitle}>Use the email and password you registered with.</p>
          </div>

          <form action={action} className={styles.form}>
            <Suspense fallback={null}>
              <CallbackField />
            </Suspense>
            {state?.error && (
              <div className={styles.errorMessage} role="alert">
                <AlertCircle size={18} /> {state.error}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required />
              <Link href="/forgot-password" className={styles.forgotLink}>Forgot your password?</Link>
            </div>

            <button type="submit" disabled={isPending} className={styles.submitBtn}>
              {isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className={styles.formFooter}>
            New to VaadaKaro? <Link href="/signup">Create an account</Link>
          </div>
        </div>

        <AuthAside
          title="With your account you can"
          points={[
            "Track every complaint you have filed",
            "Get notified when an officer updates your case",
            "Save legal drafts in your document vault",
            "Reply to officers when they need more details",
          ]}
        />
      </div>
    </div>
  );
}
