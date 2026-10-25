"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import styles from "../booking.module.css";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { getLawyerById, createBooking } from "@/services/lawyers";
import Link from "next/link";

const TIME_SLOTS = [
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM"
];

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Slots depend on the date: for today, only slots that haven't started yet. */
function slotsFor(date: string): string[] {
  if (!date) return [];
  if (date !== localDate()) return TIME_SLOTS;
  const now = new Date();
  return TIME_SLOTS.filter((slot) => {
    const [, h, m, ampm] = slot.match(/^(\d{2}):(\d{2}) (AM|PM)/)!;
    const hour = (Number(h) % 12) + (ampm === "PM" ? 12 : 0);
    return hour * 60 + Number(m) > now.getHours() * 60 + now.getMinutes();
  });
}

export default function BookLawyerPage() {
  const { lawyerId } = useParams();
  const [lawyer, setLawyer] = useState<any>(null);
  const [formData, setFormData] = useState({
    date: "",
    timeSlot: "",
    description: "",
    isOffline: false
  });
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lawyerId) {
      getLawyerById(lawyerId as string).then(setLawyer);
    }
  }, [lawyerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setIsPending(true);
    setError(null);
    try {
      await createBooking({
        lawyerId: lawyerId as string,
        ...formData
      });
      setIsSuccess(true);
    } catch (error) {
      setError("Could not book the consultation. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.page}>
        <div className={`${styles.container} ${styles.success}`}>
          <CheckCircle2 className={styles.successIcon} size={52} strokeWidth={1.5} />
          <h2 className={styles.successTitle}>You're booked.</h2>
          <p>You and the lawyer will receive a confirmation email shortly.</p>
          <Link href="/find-lawyer" className={styles.backBtn}>
            Back to lawyers
          </Link>
        </div>
      </div>
    );
  }

  if (!lawyer) return <div className={styles.page}><div className={styles.loading}>Loading…</div></div>;

  const slots = slotsFor(formData.date);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/find-lawyer" className={styles.backLink}>
          <ChevronLeft size={16} /> Lawyers
        </Link>

        <h1 className={styles.title}>Book a consultation</h1>

        <div className={styles.lawyerPreview}>
          <div className={styles.avatar}>
            {lawyer.user.name?.[0] || "L"}
          </div>
          <div className={styles.lawyerDetails}>
            <h3>{lawyer.user.name}</h3>
            <p>{lawyer.specialization.join(", ")} · {lawyer.location}</p>
          </div>
          <div className={styles.fee}>₹{lawyer.fees}</div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Date</label>
              <input
                type="date"
                className={styles.input}
                required
                min={localDate()}
                value={formData.date}
                onChange={(e) => {
                  const date = e.target.value;
                  // The slot list depends on the date, so drop a slot that's no longer offered.
                  setFormData(prev => ({
                    ...prev,
                    date,
                    timeSlot: slotsFor(date).includes(prev.timeSlot) ? prev.timeSlot : "",
                  }));
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="booking-slot">Time</label>
              <select
                id="booking-slot"
                className={styles.select}
                required
                disabled={!formData.date || slots.length === 0}
                value={formData.timeSlot}
                onChange={(e) => setFormData(prev => ({ ...prev, timeSlot: e.target.value }))}
              >
                <option value="">
                  {!formData.date ? "Choose a date first" : slots.length === 0 ? "No slots left today" : "Choose a slot"}
                </option>
                {slots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>About your case</label>
            <textarea
              className={styles.textarea}
              placeholder="A short summary helps the lawyer prepare."
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            ></textarea>
          </div>

          <label className={styles.toggleWrapper}>
            <input
              type="checkbox"
              checked={formData.isOffline}
              onChange={(e) => setFormData(prev => ({ ...prev, isOffline: e.target.checked }))}
            />
            <span>Meet in person</span>
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={isPending}>
            {isPending ? "Booking…" : `Book for ₹${lawyer.fees}`}
          </button>
        </form>
      </div>
    </div>
  );
}
