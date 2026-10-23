"use client";

import { useState, useEffect } from "react";
import styles from "./reports.module.css";
import { Download, FileText, Send, Calendar as CalendarIcon } from "lucide-react";

export default function AdminReportsPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchReportData = async () => {
    // In a real app, this would be a server action
    // For now, let's simulate the data
    const mockData = [
      { id: 1, department: "Water Supply", filed: 45, resolved: 32, pending: 13, officer: "Rahul Deshmukh" },
      { id: 2, department: "Roads & Transport", filed: 78, resolved: 40, pending: 38, officer: "Amit Sharma" },
      { id: 3, department: "Electricity", filed: 30, resolved: 28, pending: 2, officer: "Sanjay Patil" },
      { id: 4, department: "Sanitation", filed: 22, resolved: 15, pending: 7, officer: "Priya Kulkarni" },
    ];
    setReportData(mockData);
  };

  useEffect(() => {
    fetchReportData();
  }, [month, year]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    // Simulate API call to generate PDF/Email
    setTimeout(() => {
      alert(`Monthly Grievance Report for ${MONTHS[month-1]} ${year} has been generated and sent to government authorities.`);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Monthly Performance Report</h1>
        <div className={styles.controls}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={18} color="#64748B" />
            <select className={styles.select} value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select className={styles.select} value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className={styles.generateBtn} onClick={handleGenerateReport} disabled={isGenerating}>
            {isGenerating ? "Generating..." : <><Send size={18} /> Send to Government</>}
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>SR</th>
              <th>Department / Category</th>
              <th>Cases Filed</th>
              <th>Status</th>
              <th>Assigned Officer</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td style={{ fontWeight: 600 }}>{item.department}</td>
                <td>{item.filed}</td>
                <td>
                  <div className={styles.statusInfo}>
                    <div className={styles.statusItem}>
                      <span className={`${styles.dot} ${styles.resolvedDot}`}></span>
                      {item.resolved} Resolved
                    </div>
                    <div className={styles.statusItem}>
                      <span className={`${styles.dot} ${styles.pendingDot}`}></span>
                      {item.pending} Pending
                    </div>
                  </div>
                </td>
                <td>{item.officer}</td>
                <td>
                  <button style={{ background: 'none', border: 'none', color: 'var(--brand-navy)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Download size={14} /> Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
