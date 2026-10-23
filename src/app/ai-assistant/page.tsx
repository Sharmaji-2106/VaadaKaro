"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ai-assistant.module.css";
import { Send, Bot, User, Sparkles, AlertCircle, Scale } from "lucide-react";
import { getLegalAdvice } from "@/actions/legal-assistant";

interface Message {
  role: "user" | "bot";
  content: string;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "Welcome. I am **VaadaAI**, your AI-powered legal consultation assistant. You may ask me about your rights, grievance procedures, RTI filing, consumer protection, or any other civic legal matter." }
  ]);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isConstitutionMode, setIsConstitutionMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isPending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userQuery = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userQuery }]);
    setIsPending(true);

    try {
      const result = await getLegalAdvice(userQuery, isConstitutionMode);
      if (result.response) {
        setMessages(prev => [...prev, { role: "bot", content: result.response! }]);
      } else {
        setMessages(prev => [...prev, { role: "bot", content: "I encountered an error. Please try again." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "bot", content: "Connection error. Please ensure your Gemini API key is configured." }]);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Official Header Bar */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><Scale size={22} /></div>
          <div>
            <h1 className={styles.title}>AI Legal Consultation</h1>
            <p className={styles.subtitle}>Powered by Gemini · For informational purposes only</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={`${styles.toggleBtn} ${isConstitutionMode ? styles.toggleBtnActive : ""}`}
            onClick={() => setIsConstitutionMode(!isConstitutionMode)}
          >
            Constitution Mode {isConstitutionMode ? "ON" : "OFF"}
          </button>
          <div className={styles.headerBadge}>
            <Sparkles size={14} /> AI Verified
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className={styles.chatWrapper}>
        <div className={styles.messages} ref={scrollRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.message} ${msg.role === "user" ? styles.userMessage : styles.botMessage}`}>
              <div className={styles.messageMeta}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                <span>{msg.role === 'user' ? 'YOUR QUERY' : 'VAADAAI RESPONSE'}</span>
              </div>
              <div
                dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }}
              />
            </div>
          ))}
          {isPending && (
            <div className={styles.typing}>
              <Bot size={14} />
              <span>VaadaAI is preparing a response</span>
              <div className={styles.dotPulse}></div>
              <div className={styles.dotPulse} style={{ animationDelay: '0.2s' }}></div>
              <div className={styles.dotPulse} style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
        </div>

        <div className={styles.inputArea}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="text"
              placeholder="Ask about your rights, RTI procedures, consumer complaints..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isPending}
            />
            <button type="submit" className={styles.sendBtn} disabled={isPending || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
          <p className={styles.disclaimer}>
            <AlertCircle size={12} />
            Guidance is informational only and not a substitute for professional legal advice.
          </p>
        </div>
      </div>
    </div>
  );
}

