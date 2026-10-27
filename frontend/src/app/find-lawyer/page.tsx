"use client";

import { useState, useEffect } from "react";
import styles from "./find-lawyer.module.css";
import { Search, BadgeCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getLawyers } from "@/services/lawyers";

const SPECIALIZATIONS = ["All", "Criminal", "Civil", "Consumer", "RTI", "Labour", "Family", "Property"];
const LANGUAGES = ["Any", "Hindi", "Marathi", "English"];
const BCI_ACCEPTED_KEY = "vk_bci_disclaimer";

export default function FindLawyerPage() {
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    location: "",
    specialization: "All",
    maxFees: 2000,
    language: "Any",
    isAvailable: true,
    search: ""
  });
  const [loading, setLoading] = useState(true);
  // Bar Council of India Rules (Part VI, Ch. II, r.36): advocates may not solicit work, so visitors
  // confirm they are looking on their own initiative before seeing any listing.
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    let value = false;
    try {
      value = sessionStorage.getItem(BCI_ACCEPTED_KEY) === "1";
    } catch {}
    setAccepted(value);
  }, []);

  const accept = () => {
    try {
      sessionStorage.setItem(BCI_ACCEPTED_KEY, "1");
    } catch {}
    setAccepted(true);
  };

  useEffect(() => {
    if (accepted) fetchLawyers();
  }, [filters, accepted]);

  const fetchLawyers = async () => {
    setLoading(true);
    try {
      const data = await getLawyers({
        ...filters,
        specialization: filters.specialization === "All" ? undefined : filters.specialization,
        language: filters.language === "Any" ? undefined : filters.language,
      });
      setLawyers(data);
    } catch (error) {
      console.error("Error fetching lawyers:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="page-band">
      <div className="page-band-inner">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link> <span>›</span> <span>Find a lawyer</span>
        </nav>
        <h1>Find a lawyer</h1>
        <p className="lead">
          Advocates who have listed themselves on VaadaKaro, in a neutral order. Need a quick answer instead?{" "}
          <Link href="/ai-assistant" className={styles.inlineLink}>
            Ask the legal assistant <ChevronRight size={16} />
          </Link>
        </p>
      </div>
    </div>
    {accepted === null ? null : !accepted ? (
      <div className={styles.container}>
        <section className={styles.disclaimer} aria-labelledby="bci-title">
          <h2 id="bci-title">Before you continue</h2>
          <p>
            The Bar Council of India does not permit advocates to advertise or solicit work. By continuing, you
            confirm that:
          </p>
          <ul>
            <li>you are looking for information about advocates on your own initiative, and no one has solicited you;</li>
            <li>the profiles are information the advocates gave about themselves (name, enrolment, areas of practice, languages and fees), not advertisements or recommendations;</li>
            <li>VaadaKaro does not rank, rate or endorse any advocate, and is not a party to any engagement you make;</li>
            <li>contacting an advocate through this page does not by itself create an advocate–client relationship.</li>
          </ul>
          <div className={styles.disclaimerActions}>
            <button type="button" className={styles.bookBtn} onClick={accept}>I agree, show advocates</button>
            <Link href="/ai-assistant" className={styles.inlineLink}>Ask the legal assistant instead</Link>
          </div>
        </section>
      </div>
    ) : (
    <div className={styles.container}>

      <div className={styles.searchBar}>
        <Search size={16} />
        <input
          type="text"
          placeholder="Search by name or specialization"
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
        />
      </div>

      <div className={styles.chips}>
        {SPECIALIZATIONS.map(s => (
          <button
            key={s}
            className={`${styles.chip} ${filters.specialization === s ? styles.chipActive : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, specialization: s }))}
          >
            {s}
          </button>
        ))}
      </div>

      <div className={styles.sidebar}>
        <input
          type="text"
          placeholder="City or PIN"
          className={styles.input}
          value={filters.location}
          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
        />
        <select
          className={styles.select}
          value={filters.language}
          onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
        >
          {LANGUAGES.map(l => <option key={l} value={l}>{l === "Any" ? "Any language" : l}</option>)}
        </select>
        <label className={styles.rangeGroup}>
          <span>Up to ₹{filters.maxFees}</span>
          <input
            type="range"
            min="0"
            max="5000"
            step="100"
            value={filters.maxFees}
            onChange={(e) => setFilters(prev => ({ ...prev, maxFees: parseInt(e.target.value) }))}
          />
        </label>
        <label className={styles.toggleWrapper}>
          <input
            type="checkbox"
            checked={filters.isAvailable}
            onChange={(e) => setFilters(prev => ({ ...prev, isAvailable: e.target.checked }))}
          />
          <span>Available today</span>
        </label>
      </div>

      {loading ? (
        <div className={styles.status}>Loading…</div>
      ) : lawyers.length === 0 ? (
        <div className={styles.status}>No lawyers match these filters.</div>
      ) : (
        <div className={styles.lawyerGrid}>
          {lawyers.map((lawyer) => (
            <div key={lawyer.id} className={styles.lawyerCard}>
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>
                  {lawyer.user.name?.[0] || "L"}
                </div>
                <div className={styles.lawyerInfo}>
                  <h4>{lawyer.user.name}</h4>
                  <div className={styles.rating}>
                    {lawyer.isVerified ? (
                      <span className={styles.verified} title="Enrolment checked by VaadaKaro">
                        <BadgeCheck size={13} /> Enrolment checked
                      </span>
                    ) : (
                      <span className={styles.muted}>Not yet checked</span>
                    )}
                    <span className={styles.dotSep}>·</span>
                    <span className={styles.muted}>{lawyer.location}</span>
                  </div>
                  {lawyer.stateBarCouncil && (
                    <div className={styles.enrolment}>
                      {lawyer.stateBarCouncil}
                      {lawyer.enrolmentYear ? `, enrolled ${lawyer.enrolmentYear}` : ''}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.specialization}>
                {lawyer.specialization.map((s: string) => <span key={s} className={styles.tag}>{s}</span>)}
              </div>

              <div className={styles.cardDetails}>{lawyer.languages.join(", ")}</div>

              <div className={styles.cardFooter}>
                <div className={styles.fees}>
                  ₹{lawyer.fees} <span>/ consultation</span>
                </div>
                <Link href={`/book-lawyer/${lawyer.id}`} className={styles.bookBtn}>
                  Book
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    )}
    </>
  );
}
