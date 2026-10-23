"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "../booking.module.css";
import { Calendar, Clock, FileText, CheckCircle, ArrowLeft } from "lucide-react";
import { getLawyerById, createBooking } from "@/actions/lawyer-actions";
import Link from "next/link";

const TIME_SLOTS = [
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM"
];

export default function BookLawyerPage() {
  const { lawyerId } = useParams();
  const router = useRouter();
  const [lawyer, setLawyer] = useState<any>(null);
  const [formData, setFormData] = useState({
    date: "",
    timeSlot: "",
    description: "",
    isOffline: false
  });
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (lawyerId) {
      getLawyerById(lawyerId as string).then(setLawyer);
    }
  }, [lawyerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setIsPending(true);
    try {
      await createBooking({
        lawyerId: lawyerId as string,
        ...formData
      });
      setIsSuccess(true);
    } catch (error) {
      alert("Failed to book consultation. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.container}>
        <div className={styles.success}>
          <CheckCircle className={styles.successIcon} size={64} />
          <h2 className={styles.successTitle}>Booking Successful!</h2>
          <p>Your consultation has been booked. You and the lawyer will receive a confirmation email shortly.</p>
          <Link href="/find-lawyer" className={styles.backBtn}>
            Return to Lawyer Directory
          </Link>
        </div>
      </div>
    );
  }

  if (!lawyer) return <div className={styles.container}>Loading lawyer details...</div>;

  return (
    <div className={styles.container}>
      <Link href="/find-lawyer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', marginBottom: '1.5rem', textDecoration: 'none' }}>
        <ArrowLeft size={16} /> Back to directory
      </Link>

      <h1 className={styles.title}>Book Consultation</h1>
      <p className={styles.subtitle}>Secure a professional session for your legal matters</p>

      <div className={styles.lawyerPreview}>
        <div className={styles.avatar}>
          {lawyer.user.name?.[0] || "L"}
        </div>
        <div className={styles.lawyerDetails}>
          <h3>{lawyer.user.name}</h3>
          <p>{lawyer.specialization.join(", ")} · {lawyer.location}</p>
          <p style={{ fontWeight: 700, color: 'var(--brand-navy)', marginTop: '0.25rem' }}>₹{lawyer.fees} Consultation Fee</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Preferred Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={18} style={{ position: 'absolute', left: 12, top: 14, color: '#64748B' }} />
              <input 
                type="date" 
                className={styles.input} 
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Time Slot</label>
            <div style={{ position: 'relative' }}>
              <Clock size={18} style={{ position: 'absolute', left: 12, top: 14, color: '#64748B' }} />
              <select 
                className={styles.select} 
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                required
                value={formData.timeSlot}
                onChange={(e) => setFormData(prev => ({ ...prev, timeSlot: e.target.value }))}
              >
                <option value="">Select a slot</option>
                {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Case Description</label>
          <div style={{ position: 'relative' }}>
            <FileText size={18} style={{ position: 'absolute', left: 12, top: 14, color: '#64748B' }} />
            <textarea 
              className={styles.textarea} 
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Briefly describe your case and legal requirement..."
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            ></textarea>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.toggleWrapper} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={formData.isOffline}
              onChange={(e) => setFormData(prev => ({ ...prev, isOffline: e.target.checked }))}
            />
            <span className={styles.label} style={{ fontSize: '0.9rem' }}>Request In-Person Meeting (Offline)</span>
          </label>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isPending}>
          {isPending ? "Confirming Booking..." : `Confirm Booking • ₹${lawyer.fees}`}
        </button>
      </form>
    </div>
  );
}
