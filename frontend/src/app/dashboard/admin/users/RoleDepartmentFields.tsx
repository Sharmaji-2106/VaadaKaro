'use client';

import { useState } from 'react';
import { DEPARTMENTS } from '@/lib/departments';
import type { UserRole } from '@/services/server';

const ROLES: UserRole[] = ['CITIZEN', 'OFFICER', 'LAWYER', 'ADMIN'];
const toLabel = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

/**
 * Role and department for one user. Department depends on role: only officers have one, so it is
 * enabled (and required) for Officer and cleared for every other role.
 */
export function RoleDepartmentFields({
  userId,
  role: initialRole,
  department: initialDepartment,
  selectClassName,
}: {
  userId: string;
  role: UserRole;
  department: string | null;
  selectClassName: string;
}) {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [department, setDepartment] = useState(initialDepartment ?? '');
  const isOfficer = role === 'OFFICER';

  return (
    <>
      <select
        name="role"
        value={role}
        onChange={(e) => {
          const next = e.target.value as UserRole;
          setRole(next);
          if (next !== 'OFFICER') setDepartment('');
        }}
        className={selectClassName}
        aria-label="Role"
      >
        {ROLES.map((r) => <option key={r} value={r}>{toLabel(r)}</option>)}
      </select>
      <select
        name="department"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        className={selectClassName}
        disabled={!isOfficer}
        required={isOfficer}
        aria-label={isOfficer ? 'Department' : 'Department (officers only)'}
        aria-describedby={`dept-hint-${userId}`}
      >
        <option value="">{isOfficer ? 'Select department' : 'Officers only'}</option>
        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <span id={`dept-hint-${userId}`} hidden>
        Officers see only complaints from their department.
      </span>
    </>
  );
}
