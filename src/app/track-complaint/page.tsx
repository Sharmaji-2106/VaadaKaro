'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import { Search, Loader2, Shield } from 'lucide-react';
import TrackingSearch from '@/components/features/tracking/TrackingSearch';
import TrackingTimeline from '@/components/features/tracking/TrackingTimeline';
import ComplaintDetails from '@/components/features/tracking/ComplaintDetails';
import AdditionalInfoReply from '@/components/features/tracking/AdditionalInfoReply';
import { getComplaintByTrackingId } from '@/lib/actions/complaintActions';

function TrackComplaintInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [trackingId, setTrackingId] = useState(searchParams.get('id') || '');
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError('');
    
    // Update URL without refreshing
    const params = new URLSearchParams(searchParams);
    params.set('id', id);
    router.push(`?${params.toString()}`, { scroll: false });

    try {
      const result = await getComplaintByTrackingId(id);
      
      if (result.success) {
        setComplaint(result.complaint);
      } else {
        setError(result.error || 'No complaint found with this Tracking ID.');
        setComplaint(null);
      }
    } catch (err) {
      setError('An error occurred while fetching the complaint.');
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      handleSearch(id);
    }
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Grievance Tracking Portal</h1>
        <p>Monitor the real-time status of your official complaints and legal inquiries.</p>
        
        <div style={{ 
          background: '#f0f7ff', 
          border: '1px solid #dbeafe', 
          borderRadius: 'var(--radius-sm)', 
          padding: '0.85rem 1.25rem',
          marginTop: '1.5rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#1e3a8a',
          fontSize: '0.85rem',
          fontWeight: 700
        }}>
          <Shield size={18} /> 
          <span>Service Status: Secure Connection Active. Data accessed under RTI compliance guidelines.</span>
        </div>
      </div>

      <TrackingSearch 
        onSearch={handleSearch} 
        initialValue={trackingId} 
        isLoading={loading} 
      />

      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} />
          <p>Connecting to Central Database...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>!</div>
          <h2>Record Not Found</h2>
          <p>{error}</p>
          <button onClick={() => setError('')} className={styles.retryBtn}>New Search</button>
        </div>
      ) : complaint ? (
        <div className={styles.resultsArea}>
          <div className={styles.mainGrid}>
            <div className={styles.timelineColumn}>
              <TrackingTimeline 
                currentStatus={complaint.status} 
                updates={complaint.updates} 
              />
            </div>
            <div className={styles.detailsColumn}>
              {complaint.status === 'INFO_REQUESTED' && (
                <div style={{ marginBottom: '2rem' }}>
                  <AdditionalInfoReply complaintId={complaint.id} />
                </div>
              )}
              <ComplaintDetails complaint={complaint} />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Search size={48} className={styles.emptyIcon} />
          <h2>Track Your Grievance</h2>
          <p>Enter your 16-character Tracking ID (e.g. VDK-2026-XXXXXX) to view current progress and department notes.</p>
        </div>
      )}
    </div>
  );
}

export default function TrackComplaintPage() {
  return (
    <div className={styles.pageWrapper}>
      <Suspense fallback={
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} />
            <p>Loading tracking interface...</p>
          </div>
        </div>
      }>
        <TrackComplaintInner />
      </Suspense>
    </div>
  );
}
