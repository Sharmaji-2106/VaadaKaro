'use client';

import { useState } from 'react';
import styles from './TrackingSearch.module.css';
import { Search, Loader2 } from 'lucide-react';

interface TrackingSearchProps {
  onSearch: (id: string) => void;
  initialValue?: string;
  isLoading?: boolean;
}

export default function TrackingSearch({ onSearch, initialValue = '', isLoading = false }: TrackingSearchProps) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value.toUpperCase().trim());
    }
  };

  return (
    <div className={styles.searchContainer}>
      <form onSubmit={handleSubmit} className={styles.searchBox}>
        <div className={styles.inputWrapper}>
          <Search className={styles.searchIcon} size={20} />
          <input
            type="text"
            placeholder="Enter Tracking ID (e.g. VDK-2026-123456)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={styles.input}
            disabled={isLoading}
          />
        </div>
        <button type="submit" className={styles.searchBtn} disabled={isLoading || !value}>
          {isLoading ? <Loader2 className={styles.spinner} size={20} /> : 'Track Progress'}
        </button>
      </form>
      <div className={styles.helperText}>
        Format: VDK-YYYY-XXXXXX
      </div>
    </div>
  );
}
