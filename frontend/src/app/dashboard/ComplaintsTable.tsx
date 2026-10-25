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
        <h2>Your complaints</h2>
        <div className={styles.searchBar}>
          <Search size={15} />
          <input
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Tracking ID</span>
          <span>Category</span>
          <span>Status</span>
          <span>Filed</span>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertCircle size={28} />
            <p>
              {complaints.length === 0
                ? "No complaints yet. Ones you file will appear here."
                : `No results for "${query}".`}
            </p>
            {complaints.length === 0 && (
              <Link
                href="/file-complaint"
                className={styles.emptyLink}
              >
                File your first complaint
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
                {complaint.status.replace(/_/g, " ").toLowerCase()}
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
