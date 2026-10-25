import React from 'react';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import { getCurrentUser } from '@/lib/session';
import { changeUserRole, listUsers, type UserRole } from '@/services/server';
import { RoleDepartmentFields } from './RoleDepartmentFields';
import table from '../../officer/complaints/complaints.module.css';
import styles from '../admin.module.css';

const ROLES: UserRole[] = ['CITIZEN', 'OFFICER', 'LAWYER', 'ADMIN'];
const toLabel = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string; error?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const [me, { users, error: loadError }] = await Promise.all([
    getCurrentUser(),
    listUsers({ search: sp.search, role: sp.role }),
  ]);

  async function saveRole(formData: FormData) {
    'use server';
    const userId = String(formData.get('userId'));
    const role = String(formData.get('role')) as UserRole;
    const department = role === 'OFFICER' ? String(formData.get('department') || '') || null : null;
    const res = await changeUserRole(userId, role, department);

    const qs = new URLSearchParams();
    if (sp.search) qs.set('search', sp.search);
    if (sp.role) qs.set('role', sp.role);
    qs.set(res.success ? 'saved' : 'error', res.success ? userId : res.error || 'Could not change the role');
    revalidatePath('/dashboard/admin/users');
    redirect(`/dashboard/admin/users?${qs}`);
  }

  return (
    <div className={table.container}>
      <header className={table.header}>
        <h1>Users &amp; roles</h1>
        <p>Signup always creates citizens. Promote officers here and give them a department: they only see that department&apos;s complaints.</p>
      </header>

      {sp.error && <div className={styles.errorBanner} role="alert">{sp.error}</div>}
      {loadError && <div className={styles.errorBanner} role="alert">Couldn&apos;t load users: {loadError}</div>}

      <form className={table.controls} method="GET">
        <div className={table.searchWrapper}>
          <Search className={table.searchIcon} size={15} />
          <input
            name="search"
            type="text"
            placeholder="Search name or email"
            className={table.searchInput}
            defaultValue={sp.search}
          />
        </div>
        <div className={table.filters}>
          <select className={table.select} name="role" defaultValue={sp.role || ''}>
            <option value="">Any role</option>
            {ROLES.map((r) => <option key={r} value={r}>{toLabel(r)}</option>)}
          </select>
          <button type="submit" className={table.searchBtn}>Apply</button>
        </div>
      </form>

      <div className={table.tableWrapper}>
        <table className={table.table}>
          <thead>
            <tr>
              <th className={table.th}>User</th>
              <th className={table.th}>Role and department</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={2} className={table.emptyCell}>No users match.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className={table.tr}>
                  <td className={table.td}>
                    <div className={table.primaryText}>{u.name || 'No name'}</div>
                    <div className={table.secondaryText}>{u.email}</div>
                  </td>
                  <td className={table.td}>
                    {u.id === me?.id ? (
                      <span className={table.secondaryText}>Administrator (you)</span>
                    ) : (
                      <form action={saveRole} className={styles.roleForm}>
                        <input type="hidden" name="userId" value={u.id} />
                        <RoleDepartmentFields
                          userId={u.id}
                          role={u.role}
                          department={u.department}
                          selectClassName={table.select}
                        />
                        <button type="submit" className={styles.saveBtn}>Save</button>
                        {sp.saved === u.id && <span className={styles.saved}>Saved</span>}
                      </form>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
