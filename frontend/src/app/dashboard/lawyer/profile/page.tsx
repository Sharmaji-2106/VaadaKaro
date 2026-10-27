import React from 'react';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { BadgeCheck, Clock } from 'lucide-react';
import { getMyLawyerProfile, saveMyLawyerProfile } from '@/services/server';
import cards from '@/components/features/bookings/BookingCard.module.css';
import table from '../../officer/complaints/complaints.module.css';
import styles from './profile.module.css';

// Same areas as the public lawyer directory's filter, so every profile can be found by it.
const SPECIALIZATIONS = ['Criminal', 'Civil', 'Consumer', 'RTI', 'Labour', 'Family', 'Property'];
const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali'];

const list = (formData: FormData, key: string) => formData.getAll(key).map(String).filter(Boolean);

export default async function LawyerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const { profile, error: loadError } = await getMyLawyerProfile();

  async function save(formData: FormData) {
    'use server';
    const res = await saveMyLawyerProfile({
      barNumber: String(formData.get('barNumber') || '').trim(),
      stateBarCouncil: String(formData.get('stateBarCouncil') || '').trim(),
      enrolmentYear: Number(formData.get('enrolmentYear') || 0),
      specialization: list(formData, 'specialization'),
      languages: list(formData, 'languages'),
      location: String(formData.get('location') || '').trim(),
      pincode: String(formData.get('pincode') || '').trim(),
      fees: Number(formData.get('fees') || 0),
      experience: Number(formData.get('experience') || 0),
      bio: String(formData.get('bio') || '').trim() || null,
      isAvailable: formData.get('isAvailable') === 'on',
    });
    revalidatePath('/dashboard/lawyer', 'layout');
    redirect(
      res.success
        ? '/dashboard/lawyer/profile?saved=1'
        : `/dashboard/lawyer/profile?error=${encodeURIComponent(res.error || 'Could not save your profile')}`
    );
  }

  const chosenSpecs = new Set(profile?.specialization ?? []);
  const chosenLangs = new Set(profile?.languages ?? []);

  return (
    <div className={table.container}>
      <header className={table.header}>
        <h1>Public profile</h1>
        <p>
          What citizens see in the directory. It is listed in a neutral order with no ratings, as Bar Council of India
          rules require.
        </p>
      </header>

      {sp.error && <div className={`${cards.banner} ${cards.bannerError}`} role="alert">{sp.error}</div>}
      {sp.saved && <div className={`${cards.banner} ${cards.bannerOk}`} role="status">Profile saved.</div>}
      {loadError && <div className={`${cards.banner} ${cards.bannerError}`} role="alert">Couldn&apos;t load your profile: {loadError}</div>}

      {profile && (
        <div className={styles.verification} data-verified={profile.isVerified}>
          {profile.isVerified ? <BadgeCheck size={18} /> : <Clock size={18} />}
          <span>
            {profile.isVerified
              ? 'Verified. Citizens see a verified badge on your profile.'
              : 'Waiting for an administrator to check your bar number. You are listed without a verified badge until then.'}
          </span>
        </div>
      )}

      <form action={save} className={styles.form}>
        <fieldset className={styles.group}>
          <legend>Registration</legend>
          <label className={styles.field}>
            <span>Bar Council enrolment number</span>
            <input name="barNumber" required minLength={3} maxLength={40} defaultValue={profile?.barNumber} placeholder="MAH/1234/2015" />
            <small>Changing it removes your verified badge until it is checked again.</small>
          </label>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>State Bar Council</span>
              <input
                name="stateBarCouncil"
                required
                minLength={3}
                maxLength={120}
                defaultValue={profile?.stateBarCouncil ?? ''}
                placeholder="Bar Council of Maharashtra and Goa"
              />
            </label>
            <label className={styles.field}>
              <span>Year of enrolment</span>
              <input
                name="enrolmentYear"
                type="number"
                min={1961}
                max={new Date().getFullYear()}
                required
                defaultValue={profile?.enrolmentYear ?? ''}
              />
            </label>
          </div>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>Years of practice</span>
              <input name="experience" type="number" min={0} max={70} required defaultValue={profile?.experience ?? ''} />
            </label>
            <label className={styles.field}>
              <span>Consultation fee (₹)</span>
              <input name="fees" type="number" min={0} max={100000} step={50} required defaultValue={profile?.fees ?? ''} />
            </label>
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Where you practise</legend>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>City</span>
              <input name="location" required minLength={2} maxLength={100} defaultValue={profile?.location} />
            </label>
            <label className={styles.field}>
              <span>PIN code</span>
              <input name="pincode" required pattern="\d{6}" inputMode="numeric" maxLength={6} defaultValue={profile?.pincode} />
            </label>
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Areas of practice</legend>
          <div className={styles.chips}>
            {SPECIALIZATIONS.map((s) => (
              <label key={s} className={styles.chip}>
                <input type="checkbox" name="specialization" value={s} defaultChecked={chosenSpecs.has(s)} />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Languages you consult in</legend>
          <div className={styles.chips}>
            {LANGUAGES.map((l) => (
              <label key={l} className={styles.chip}>
                <input type="checkbox" name="languages" value={l} defaultChecked={chosenLangs.has(l)} />
                <span>{l}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>About you</legend>
          <label className={styles.field}>
            <span>Short bio</span>
            <textarea name="bio" rows={4} maxLength={2000} defaultValue={profile?.bio ?? ''} placeholder="Courts you appear in, the kinds of matters you take on." />
            <small>
              Facts only. Bar Council of India Rules (rule 36) don&apos;t allow advertising or soliciting work: no
              self-praise (&ldquo;best&rdquo;, &ldquo;expert&rdquo;), past results, client names or testimonials.
            </small>
          </label>
          <label className={styles.toggle}>
            <input type="checkbox" name="isAvailable" defaultChecked={profile?.isAvailable ?? true} />
            <span>Taking new consultation requests</span>
          </label>
        </fieldset>

        <div>
          <button type="submit" className={cards.primaryBtn}>{profile ? 'Save changes' : 'Create profile'}</button>
        </div>
      </form>
    </div>
  );
}
