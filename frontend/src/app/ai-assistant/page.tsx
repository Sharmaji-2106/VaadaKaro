"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ai-assistant.module.css";
import { Send, Bot, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getLegalAdvice } from "@/services/legal";
import { getPrivacyStatus, isAiConsentError } from "@/services/privacy";
import { AiConsentPrompt } from "@/components/features/privacy/AiConsentPrompt";

interface Message {
  role: "user" | "bot";
  content: string;
}

const formatMessage = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");

const SUGGESTIONS = [
  "How do I file an RTI application?",
  "My landlord won't return my deposit. What can I do?",
  "What are my rights if a shop sells me a faulty product?",
  "Whom should I contact about a broken streetlight?",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "Hi, I'm **VaadaAI**. Ask me about your rights, grievance procedures, RTI filing, consumer protection, or any civic legal matter." }
  ]);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isConstitutionMode, setIsConstitutionMode] = useState(false);
  // null until we know; guests tick consent per question, signed-in users have a saved choice.
  const [account, setAccount] = useState<{ signedIn: boolean; aiConsent: boolean } | null>(null);
  const [guestConsent, setGuestConsent] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPrivacyStatus().then((r) =>
      setAccount(r.success ? { signedIn: true, aiConsent: r.data.aiConsent } : { signedIn: false, aiConsent: false })
    );
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isPending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    if (account?.signedIn && !account.aiConsent) {
      setNeedsConsent(true);
      return;
    }

    const userQuery = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userQuery }]);
    setIsPending(true);

    try {
      const result = await getLegalAdvice(userQuery, isConstitutionMode, guestConsent);
      if (result.response) {
        setMessages(prev => [...prev, { role: "bot", content: result.response! }]);
      } else if (isAiConsentError(result.error)) {
        setNeedsConsent(true);
        setMessages(prev => prev.slice(0, -1));
        setInput(userQuery);
      } else {
        setMessages(prev => [...prev, { role: "bot", content: result.error || "I encountered an error. Please try again." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "bot", content: "Couldn't reach the assistant. Please try again in a moment." }]);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="page-band">
        <div className="page-band-inner">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span>›</span> <span>Legal help</span>
          </nav>
          <h1>Legal assistant</h1>
          <p className="lead">Ask about your rights and the right procedure in plain language. Answers are informational, not legal advice.</p>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.chatWrapper}>
          <div className={styles.chatHeader}>
            <div className={styles.botBadge}><Bot size={18} /></div>
            <div>
              <b>VaadaAI</b>
              <small>Powered by Gemini</small>
            </div>
            <div className={styles.segmented} role="tablist" aria-label="Answer mode">
              <button
                role="tab"
                aria-selected={!isConstitutionMode}
                className={`${styles.toggleBtn} ${!isConstitutionMode ? styles.toggleBtnActive : ""}`}
                onClick={() => setIsConstitutionMode(false)}
              >
                General
              </button>
              <button
                role="tab"
                aria-selected={isConstitutionMode}
                className={`${styles.toggleBtn} ${isConstitutionMode ? styles.toggleBtnActive : ""}`}
                onClick={() => setIsConstitutionMode(true)}
              >
                Constitution
              </button>
            </div>
          </div>

          <div className={styles.messages} ref={scrollRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.message} ${msg.role === "user" ? styles.userMessage : styles.botMessage}`}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
            ))}
            {isPending && (
              <div className={styles.typing} aria-label="VaadaAI is typing">
                <div className={styles.dotPulse}></div>
                <div className={styles.dotPulse}></div>
                <div className={styles.dotPulse}></div>
              </div>
            )}
          </div>

          <div className={styles.inputArea}>
            {needsConsent && account?.signedIn && (
              <div className={styles.consentWrap}>
                <AiConsentPrompt
                  onGranted={() => {
                    setAccount({ signedIn: true, aiConsent: true });
                    setNeedsConsent(false);
                  }}
                />
              </div>
            )}
            {account && !account.signedIn && (
              <label className={styles.consentLine}>
                <input type="checkbox" checked={guestConsent} onChange={(e) => setGuestConsent(e.target.checked)} />
                <span>
                  Send my question to Google Gemini (which may process it outside India) to get an answer. Don&apos;t
                  include names, phone numbers or ID numbers. <Link href="/privacy#ai-processing">Privacy notice</Link>
                </span>
              </label>
            )}
            {needsConsent && account && !account.signedIn && !guestConsent && (
              <p className={styles.consentHint} role="alert">Tick the box above to send your question.</p>
            )}
            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="text"
                placeholder="Type your question"
                aria-label="Your question"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isPending}
              />
              <button type="submit" className={styles.sendBtn} disabled={isPending || !input.trim()}>
                <Send size={16} /> Send
              </button>
            </form>
          </div>
        </div>

        <aside className={styles.aside}>
          <div className={styles.asideCard}>
            <h2>Try asking</h2>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className={styles.suggestion} onClick={() => setInput(s)} disabled={isPending}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className={`${styles.asideCard} ${styles.note}`}>
            <h2><AlertTriangle size={17} /> Good to know</h2>
            <p>AI can be wrong or out of date. For anything serious, <Link href="/find-lawyer">consult a lawyer</Link>. Read the <Link href="/disclaimer">full disclaimer</Link>.</p>
          </div>
        </aside>
      </div>
    </>
  );
}