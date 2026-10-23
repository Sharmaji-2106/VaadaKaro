"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, AlertCircle } from "lucide-react";
import styles from "./dashboard.module.css";

interface ComplaintData {
  id: string;
  trackingId: string;
  category: string;
  status: string;
  createdAt: Date | string;
}

export default function ComplaintsTable({ complaints }: { complaints: ComplaintData[] }) {
  const [query, setQuery] = useState("");

  const filtered = complaints.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.trackingId.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className={styles.sectionHeader}>
        <h2>Official Grievance History</h2>
        <div className={styles.searchBar}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by Record ID, Category or Status..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Record Reference</span>
          <span>Classification</span>
          <span>Current Status</span>
          <span>Filing Date</span>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertCircle size={48} />
            <p>
              {complaints.length === 0
                ? "No official records found. Your filed grievances will appear here for tracking."
                : `No results for "${query}".`}
            </p>
            {complaints.length === 0 && (
              <Link
                href="/file-complaint"
                style={{ color: "var(--brand-navy)", fontWeight: 800, textDecoration: "underline" }}
              >
                Lodge your first grievance
              </Link>
            )}
          </div>
        ) : (
          filtered.map((complaint) => (
            <div key={complaint.id} className={styles.tableRow}>
              <Link href={`/track-complaint?id=${complaint.trackingId}`} className={styles.id}>
                {complaint.trackingId}
              </Link>
              <span>{complaint.category}</span>
              <span className={(styles as any)[`status${complaint.status}`] || styles.statusSUBMITTED}>
                {complaint.status.replace(/_/g, " ")}
              </span>
              <span>
                {new Date(complaint.createdAt).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
