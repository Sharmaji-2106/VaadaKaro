/**
 * Data loaders for server components. They call the backend directly with the
 * user's token and never throw, so pages render an empty state if the API is down.
 */
import { serverApi } from '@/lib/api/server';

export type ComplaintStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'INFO_REQUESTED' | 'RESOLVED' | 'REJECTED';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export async function getUserComplaints() {
  const res = await serverApi<any[]>('/complaints');
  return { success: res.ok, complaints: res.data ?? [], error: res.error };
}

export async function getChatHistory() {
  const res = await serverApi<any[]>('/ai/history');
  return res.data ?? [];
}

export async function getOfficerStats() {
  const res = await serverApi<{
    total: number;
    pending: number;
    underReview: number;
    inProgress: number;
    resolved: number;
    resolvedToday: number;
  }>('/officer/stats');
  return { success: res.ok, stats: res.data, error: res.error };
}

export async function getOfficerComplaints(params: {
  status?: ComplaintStatus;
  priority?: PriorityLevel;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  }
  const res = await serverApi<{ items: any[]; total: number; page: number; pages: number }>(
    `/officer/complaints${qs.size ? `?${qs}` : ''}`
  );
  if (!res.ok || !res.data) {
    return { success: false, complaints: [], pagination: { total: 0, pages: 1, currentPage: 1 }, error: res.error };
  }
  return {
    success: true,
    complaints: res.data.items,
    pagination: { total: res.data.total, pages: res.data.pages, currentPage: res.data.page },
  };
}

export async function getComplaintDetails(id: string) {
  const res = await serverApi<any>(`/officer/complaints/${encodeURIComponent(id)}`);
  return { success: res.ok, complaint: res.data, error: res.error };
}

export interface Officer {
  id: string;
  name: string | null;
  email: string;
  department: string | null;
}

/** Officers this user may assign the complaint to (the backend limits officers to their department). */
export async function getAssignableOfficers(department: string) {
  const res = await serverApi<Officer[]>(`/officer/officers?department=${encodeURIComponent(department)}`);
  return res.data ?? [];
}

export async function assignOfficer(complaintId: string, officerId: string) {
  const res = await serverApi(`/officer/complaints/${encodeURIComponent(complaintId)}/assign`, {
    method: 'POST',
    json: { officerId },
  });
  return { success: res.ok, error: res.error };
}

export interface DepartmentReport {
  department: string;
  filed: number;
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  officers: number;
}

export async function getMonthlyReport(year: number, month: number) {
  const res = await serverApi<{
    departments: DepartmentReport[];
    totalFiled: number;
    totalResolved: number;
  }>(`/admin/reports?year=${year}&month=${month}`);
  return { success: res.ok, report: res.data, error: res.error };
}

export type UserRole = 'CITIZEN' | 'OFFICER' | 'LAWYER' | 'ADMIN';

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  department: string | null;
}

export async function listUsers(params: { search?: string; role?: string }) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.role) qs.set('role', params.role);
  const res = await serverApi<AdminUser[]>(`/admin/users${qs.size ? `?${qs}` : ''}`);
  return { success: res.ok, users: res.data ?? [], error: res.error };
}

export async function changeUserRole(userId: string, role: UserRole, department: string | null) {
  const res = await serverApi(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    json: { role, department },
  });
  return { success: res.ok, error: res.error };
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata: string | null;
  createdAt: string;
}

export async function getAuditLogs(entityId?: string) {
  const res = await serverApi<AuditEntry[]>(
    `/admin/audit-logs?limit=200${entityId ? `&entityId=${encodeURIComponent(entityId)}` : ''}`
  );
  return { success: res.ok, logs: res.data ?? [], error: res.error };
}

export async function updateComplaintStatus(params: {
  complaintId: string;
  status: ComplaintStatus;
  remarks: string;
  internalNotes?: string;
}) {
  const res = await serverApi(`/officer/complaints/${encodeURIComponent(params.complaintId)}/status`, {
    method: 'PATCH',
    json: { status: params.status, remarks: params.remarks, internalNotes: params.internalNotes ?? null },
  });
  return { success: res.ok, error: res.error };
}
