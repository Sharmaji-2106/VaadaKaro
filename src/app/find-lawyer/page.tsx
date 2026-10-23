"use client";

import { useState, useEffect } from "react";
import styles from "./find-lawyer.module.css";
import { Search, MapPin, Briefcase, IndianRupee, Star, Languages, Bot, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getLawyers } from "@/actions/lawyer-actions";

const SPECIALIZATIONS = ["All", "Criminal", "Civil", "Consumer", "RTI", "Labour", "Family", "Property"];
const LANGUAGES = ["Any", "Hindi", "Marathi", "English"];

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

  useEffect(() => {
    fetchLawyers();
  }, [filters]);

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
    <div className={styles.container}>
      {/* Sidebar Filters */}
      <aside className={styles.sidebar}>
        <h2 className={styles.title}>Filters</h2>
        
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Location</label>
          <div style={{ position: 'relative' }}>
            <MapPin size={16} style={{ position: 'absolute', left: 12, top: 14, color: '#64748B' }} />
            <input 
              type="text" 
              placeholder="Enter city or pincode" 
              className={styles.input} 
              style={{ paddingLeft: '2.5rem' }}
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Specialization</label>
          <select 
            className={styles.select}
            value={filters.specialization}
            onChange={(e) => setFilters(prev => ({ ...prev, specialization: e.target.value }))}
          >
            {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Max Consultation Fee: ₹{filters.maxFees}</label>
          <input 
            type="range" 
            min="0" 
            max="5000" 
            step="100" 
            value={filters.maxFees}
            onChange={(e) => setFilters(prev => ({ ...prev, maxFees: parseInt(e.target.value) }))}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Language</label>
          <select 
            className={styles.select}
            value={filters.language}
            onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.toggleWrapper}>
            <input 
              type="checkbox" 
              checked={filters.isAvailable}
              onChange={(e) => setFilters(prev => ({ ...prev, isAvailable: e.target.checked }))}
            />
            <span>Available Today</span>
          </label>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.content}>
        <div className={styles.searchBar}>
          <Search size={20} style={{ color: '#64748B' }} />
          <input 
            type="text" 
            placeholder="Search lawyers by name or specialization..." 
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <div className={styles.aiCard}>
          <div className={styles.aiCardContent}>
            <h3>Need Quick Legal Guidance?</h3>
            <p>Our AI Legal Assistant is available 24/7 for free preliminary support.</p>
          </div>
          <Link href="/ai-assistant" className={styles.aiBtn}>
            Try AI Assistant <ArrowRight size={18} style={{ marginLeft: 8, display: 'inline' }} />
          </Link>
        </div>

        {loading ? (
          <div>Loading legal professionals...</div>
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
                      <Star size={14} fill="currentColor" />
                      <span>{lawyer.rating}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.specialization}>
                  {lawyer.specialization.map((s: string) => <span key={s} className={styles.tag}>{s}</span>)}
                </div>

                <div className={styles.cardDetails}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem', color: '#64748B' }}>
                    <MapPin size={14} /> {lawyer.location}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem', color: '#64748B', marginTop: '0.25rem' }}>
                    <Languages size={14} /> {lawyer.languages.join(", ")}
                  </div>
                </div>

                <div className={styles.fees}>
                  ₹{lawyer.fees} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748B' }}>/ consultation</span>
                </div>

                <Link href={`/book-lawyer/${lawyer.id}`} className={styles.bookBtn}>
                  Book Consultation
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
