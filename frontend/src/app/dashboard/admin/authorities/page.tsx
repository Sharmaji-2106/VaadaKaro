import React from 'react';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DEPARTMENTS } from '@/lib/departments';
import { getAllAuthorities, saveAuthority } from '@/services/server';
import { AuthorityCard } from '@/components/features/authorities/AuthorityCard';
import authorityCards from '@/components/features/authorities/AuthorityCard.module.css';
import cards from '@/components/features/bookings/BookingCard.module.css';
import table from '../../officer/complaints/complaints.module.css';
import form from '../../lawyer/profile/profile.module.css';

const RECHECK_DAYS = 180;
const text = (fd: FormData, key: string) => String(fd.get(key) || '').trim();
const optional = (fd: FormData, key: string) => text(fd, key) || null;

export default async function AdminAuthoritiesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const { authorities, error: loadError } = await getAllAuthorities();
  const editing = sp.edit === 'new' ? null : authorities.find((a) => a.id === sp.edit) ?? null;
  const showForm = sp.edit === 'new' || !!editing;
  // Snapshot of "now" for this render, used for the recheck flags.
  const renderedAt = new Date().getTime();

  async function save(fd: FormData) {
    'use server';
    const id = optional(fd, 'id');
    const res = await saveAuthority(id, {
      name: text(fd, 'name'),
      department: text(fd, 'department'),
      categories: text(fd, 'categories').split(',').map((c) => c.trim()).filter(Boolean),
      state: optional(fd, 'state'),
      district: optional(fd, 'district'),
      howToSubmit: text(fd, 'howToSubmit'),
      submissionUrl: optional(fd, 'submissionUrl'),
      email: optional(fd, 'email'),
      phone: optional(fd, 'phone'),
      address: optional(fd, 'address'),
      sourceUrl: text(fd, 'sourceUrl'),
      verifiedNow: fd.get('verifiedNow') === 'on',
      // An unchecked box sends nothing, so the edit form marks that the box was there.
      isActive: fd.get('hasIsActive') ? fd.get('isActive') === 'on' : true,
    });
    revalidatePath('/dashboard/admin/authorities');
    if (!res.success) {
      redirect(`/dashboard/admin/authorities?edit=${id ?? 'new'}&error=${encodeURIComponent(res.error || 'Could not save')}`);
    }
    redirect('/dashboard/admin/authorities?saved=1');
  }

  const needsCheck = (lastVerifiedAt: string | null) =>
    !lastVerifiedAt || renderedAt - new Date(lastVerifiedAt).getTime() > RECHECK_DAYS * 86_400_000;
  const dueCount = authorities.filter((a) => a.isActive && needsCheck(a.lastVerifiedAt)).length;

  return (
    <div className={table.container}>
      <header className={table.header}>
        <h1>Authority directory</h1>
        <p>
          Where citizens are told to send each kind of complaint. Only add an office after checking it on its official
          website, and recheck entries every {RECHECK_DAYS} days: citizens see a warning on entries that are overdue.
        </p>
      </header>

      {sp.error && <div className={`${cards.banner} ${cards.bannerError}`} role="alert">{sp.error}</div>}
      {sp.saved && <div className={`${cards.banner} ${cards.bannerOk}`} role="status">Saved.</div>}
      {loadError && <div className={`${cards.banner} ${cards.bannerError}`} role="alert">Couldn&apos;t load the directory: {loadError}</div>}
      {dueCount > 0 && !showForm && (
        <div className={`${cards.banner} ${cards.bannerInfo}`}>
          {dueCount} {dueCount === 1 ? 'entry needs' : 'entries need'} checking against the official source.
        </div>
      )}

      {showForm ? (
        <form action={save} className={form.form}>
          <input type="hidden" name="id" value={editing?.id ?? ''} />
          <fieldset className={form.group}>
            <legend>{editing ? 'Edit entry' : 'New entry'}</legend>
            <label className={form.field}>
              <span>Office or portal name</span>
              <input name="name" required minLength={3} maxLength={200} defaultValue={editing?.name} />
            </label>
            <div className={form.row}>
              <label className={form.field}>
                <span>Department</span>
                <select name="department" required defaultValue={editing?.department ?? ''} className={table.select}>
                  <option value="" disabled>Choose</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className={form.field}>
                <span>Problems it handles</span>
                <input name="categories" maxLength={600} defaultValue={editing?.categories.join(', ')} placeholder="Comma-separated; empty means all" />
              </label>
            </div>
            <div className={form.row}>
              <label className={form.field}>
                <span>State or UT</span>
                <input name="state" maxLength={60} defaultValue={editing?.state ?? ''} placeholder="Empty means nationwide" />
              </label>
              <label className={form.field}>
                <span>District</span>
                <input name="district" maxLength={80} defaultValue={editing?.district ?? ''} placeholder="Empty means the whole state" />
              </label>
            </div>
            <label className={form.field}>
              <span>How to submit</span>
              <textarea name="howToSubmit" required minLength={10} maxLength={2000} rows={3} defaultValue={editing?.howToSubmit} />
            </label>
            <div className={form.row}>
              <label className={form.field}>
                <span>Submission link</span>
                <input name="submissionUrl" type="url" maxLength={500} defaultValue={editing?.submissionUrl ?? ''} />
              </label>
              <label className={form.field}>
                <span>Official source you checked</span>
                <input name="sourceUrl" type="url" required maxLength={500} defaultValue={editing?.sourceUrl} />
              </label>
            </div>
            <div className={form.row}>
              <label className={form.field}>
                <span>Phone</span>
                <input name="phone" maxLength={40} defaultValue={editing?.phone ?? ''} />
              </label>
              <label className={form.field}>
                <span>Email</span>
                <input name="email" type="email" maxLength={200} defaultValue={editing?.email ?? ''} />
              </label>
            </div>
            <label className={form.field}>
              <span>Address</span>
              <input name="address" maxLength={500} defaultValue={editing?.address ?? ''} />
            </label>
            <label className={form.toggle}>
              <input type="checkbox" name="verifiedNow" defaultChecked={!editing} />
              <span>I checked these details against the official source today</span>
            </label>
            {editing && (
              <label className={form.toggle}>
                <input type="hidden" name="hasIsActive" value="1" />
                <input type="checkbox" name="isActive" defaultChecked={editing.isActive} />
                <span>Show this entry to citizens</span>
              </label>
            )}
          </fieldset>
          <div className={cards.buttons}>
            <button type="submit" className={cards.primaryBtn}>Save</button>
            <Link href="/dashboard/admin/authorities" className={cards.secondaryBtn}>Cancel</Link>
          </div>
        </form>
      ) : (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <Link href="/dashboard/admin/authorities?edit=new" className={cards.primaryBtn}>Add an office</Link>
          </div>
          {authorities.length === 0 ? (
            <div className={cards.empty}>
              The directory is empty. Add offices here, or load the nationwide portals with{' '}
              <code>python -m app.cli seed-authorities</code> and check each one.
            </div>
          ) : (
            <div className={authorityCards.list}>
              {authorities.map((a) => (
                <div key={a.id} style={{ opacity: a.isActive ? 1 : 0.55 }}>
                  <AuthorityCard authority={{ ...a, needsRecheck: needsCheck(a.lastVerifiedAt) }}>
                    <div className={cards.actions}>
                      <div className={cards.buttons}>
                        <Link href={`/dashboard/admin/authorities?edit=${a.id}`} className={cards.secondaryBtn}>
                          {needsCheck(a.lastVerifiedAt) ? 'Check and update' : 'Edit'}
                        </Link>
                        {!a.isActive && <span className={table.secondaryText}>Hidden from citizens</span>}
                      </div>
                    </div>
                  </AuthorityCard>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
