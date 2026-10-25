'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import Link from 'next/link';
import { Search, Loader2, ListChecks, FilePlus } from 'lucide-react';
import TrackingSearch from '@/components/features/tracking/TrackingSearch';
import TrackingTimeline from '@/components/features/tracking/TrackingTimeline';
import ComplaintDetails from '@/components/features/tracking/ComplaintDetails';
import AdditionalInfoReply from '@/components/features/tracking/AdditionalInfoReply';
import { getComplaintByTrackingId } from '@/services/complaints';

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
    <>
      <div className="page-band">
        <div className="page-band-inner">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span>›</span> <span>Track status</span>
          </nav>
          <h1>Track a complaint</h1>
          <p className="lead">Enter the tracking ID from your confirmation to see the current status and every action taken.</p>
          <TrackingSearch
            onSearch={handleSearch}
            initialValue={trackingId}
            isLoading={loading}
          />
        </div>
      </div>

    <div className={styles.container}>
      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} />
          <p>Looking it up…</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>!</div>
          <h2>No complaint found</h2>
          <p>{error}</p>
          <button onClick={() => setError('')} className={styles.retryBtn}>Try again</button>
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
              {complaint.status === 'INFO_REQUESTED' && !complaint.isPublicView && (
                <div className={styles.replyBlock}>
                  <AdditionalInfoReply complaintId={complaint.id} />
                </div>
              )}
              <ComplaintDetails complaint={complaint} />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.helpGrid}>
          <div className={styles.helpCard}>
            <Search size={20} />
            <h2>Where to find your ID</h2>
            <p>It is shown after you submit a complaint and in your dashboard. It looks like <code>VDK-2026-123456</code>.</p>
          </div>
          <div className={styles.helpCard}>
            <ListChecks size={20} />
            <h2>What you will see</h2>
            <p>The current status, the department handling it, and a dated history of every update from officers.</p>
          </div>
          <div className={styles.helpCard}>
            <FilePlus size={20} />
            <h2>No complaint yet?</h2>
            <p><Link href="/file-complaint">File a complaint</Link> in about 3 minutes and get a tracking ID straight away.</p>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default function TrackComplaintPage() {
  return (
    <div className={styles.pageWrapper}>
      <Suspense fallback={
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} />
            <p>Loading…</p>
          </div>
        </div>
      }>
        <TrackComplaintInner />
      </Suspense>
    </div>
  );
}
