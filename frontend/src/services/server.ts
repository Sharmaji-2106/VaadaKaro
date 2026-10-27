/**
 * Data loaders for server components. They call the backend directly with the
 * user's token and never throw, so pages render an empty state if the API is down.
 */
import { serverApi } from '@/lib/api/server';
import type { Authority } from './legal';
import type { Grievance } from './privacy';

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

/** Open URGENT and HIGH complaints in the officer's scope, newest first. */
export async function getHighPriorityComplaints(limit = 5) {
  const res = await serverApi<{ items: any[]; total: number }>(
    `/officer/complaints?priority=URGENT&priority=HIGH&open=true&limit=${limit}`
  );
  return { success: res.ok, complaints: res.data?.items ?? [], total: res.data?.total ?? 0, error: res.error };
}

// Lawyer consultations

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface BookingParty {
  id: string;
  name: string | null;
  /** Only shared once the consultation is confirmed. */
  email: string | null;
  phone: string | null;
}

interface BookingBase {
  id: string;
  lawyerId: string;
  date: string;
  timeSlot: string;
  description: string;
  status: BookingStatus;
  isOffline: boolean;
  lawyerNote: string | null;
  createdAt: string;
}

export interface CitizenBooking extends BookingBase {
  lawyer: BookingParty;
}

export interface LawyerBooking extends BookingBase {
  citizen: BookingParty;
}

export async function getMyBookings() {
  const res = await serverApi<CitizenBooking[]>('/bookings');
  return { success: res.ok, bookings: res.data ?? [], error: res.error };
}

export async function cancelMyBooking(bookingId: string) {
  const res = await serverApi(`/bookings/${encodeURIComponent(bookingId)}/cancel`, { method: 'POST' });
  return { success: res.ok, error: res.error };
}

export interface LawyerProfile {
  id: string;
  barNumber: string;
  specialization: string[];
  location: string;
  pincode: string;
  fees: number;
  experience: number;
  isAvailable: boolean;
  isVerified: boolean;
  languages: string[];
  bio: string | null;
  stateBarCouncil: string | null;
  enrolmentYear: number | null;
}

export type LawyerProfileInput = Omit<LawyerProfile, 'id' | 'isVerified' | 'stateBarCouncil' | 'enrolmentYear'> & {
  stateBarCouncil: string;
  enrolmentYear: number;
};

/** The lawyer's own profile, or null if they haven't created one yet. */
export async function getMyLawyerProfile() {
  const res = await serverApi<LawyerProfile>('/lawyer/profile');
  return { success: res.ok || res.status === 404, profile: res.data, error: res.status === 404 ? undefined : res.error };
}

export async function saveMyLawyerProfile(profile: LawyerProfileInput) {
  const res = await serverApi<LawyerProfile>('/lawyer/profile', { method: 'PUT', json: profile });
  return { success: res.ok, profile: res.data, error: res.error };
}

export async function getLawyerStats() {
  const res = await serverApi<{ pending: number; upcoming: number; completed: number; cancelled: number }>(
    '/lawyer/stats'
  );
  return { success: res.ok, stats: res.data, error: res.error };
}

export async function getLawyerBookings(params: { status?: BookingStatus; upcoming?: boolean; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.upcoming) qs.set('upcoming', 'true');
  if (params.limit) qs.set('limit', String(params.limit));
  const res = await serverApi<LawyerBooking[]>(`/lawyer/bookings${qs.size ? `?${qs}` : ''}`);
  return { success: res.ok, bookings: res.data ?? [], error: res.error };
}

export async function updateLawyerBooking(bookingId: string, status: BookingStatus, note?: string) {
  const res = await serverApi(`/lawyer/bookings/${encodeURIComponent(bookingId)}`, {
    method: 'PATCH',
    json: { status, note: note ?? null },
  });
  return { success: res.ok, error: res.error };
}

export interface AdminLawyer extends LawyerProfile {
  email: string | null;
  createdAt: string;
  user: { name: string | null };
}

export async function getAdminLawyers(verified?: boolean) {
  const res = await serverApi<AdminLawyer[]>(`/admin/lawyers${verified === undefined ? '' : `?verified=${verified}`}`);
  return { success: res.ok, lawyers: res.data ?? [], error: res.error };
}

// Authority directory (admin)

export type AuthorityInput = {
  name: string;
  department: string;
  categories: string[];
  state: string | null;
  district: string | null;
  howToSubmit: string;
  submissionUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  sourceUrl: string;
  verifiedNow: boolean;
  isActive?: boolean;
};

export async function getAllAuthorities() {
  const res = await serverApi<Authority[]>('/admin/authorities');
  return { success: res.ok, authorities: res.data ?? [], error: res.error };
}

export async function saveAuthority(id: string | null, data: AuthorityInput) {
  const res = await serverApi<Authority>(id ? `/admin/authorities/${encodeURIComponent(id)}` : '/admin/authorities', {
    method: id ? 'PUT' : 'POST',
    json: data,
  });
  return { success: res.ok, authority: res.data, error: res.error };
}

export interface PilotMetrics {
  days: number;
  usersRegistered: number;
  lettersDrafted: number;
  medianSecondsToDraft: number | null;
  factCheckPassRate: number | null;
  inputLanguages: { language: string; count: number }[];
  draftsSaved: number;
  draftCompletionRate: number | null;
  draftCorrectionRate: number | null;
  documentsExported: number;
  documentsMarkedSubmitted: number;
  documentsWithResponse: number;
  complaintsFiled: number;
  complaintsResolved: number;
  medianDaysToResolution: number | null;
  bookingsRequested: number;
  bookingsConfirmed: number;
  authoritiesListed: number;
  authoritiesNeedingRecheck: number;
}

export async function getPilotMetrics(days: number) {
  const res = await serverApi<PilotMetrics>(`/admin/metrics?days=${days}`);
  return { success: res.ok, metrics: res.data, error: res.error };
}

// Grievance Officer queue and breach notices (admin)

export interface AdminGrievance extends Grievance {
  name: string;
  email: string;
  userId: string | null;
  overdue: boolean;
}

export async function getAdminGrievances(openOnly: boolean) {
  const res = await serverApi<AdminGrievance[]>(`/admin/grievances?open=${openOnly}`);
  return { success: res.ok, grievances: res.data ?? [], error: res.error };
}

export async function updateGrievance(id: string, status: Grievance['status'], response: string) {
  const res = await serverApi(`/admin/grievances/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    json: { status, response: response || null },
  });
  return { success: res.ok, error: res.error };
}

export interface BreachNotice {
  id: string;
  title: string;
  description: string;
  likelyConsequences: string;
  mitigation: string;
  occurredAt: string | null;
  detectedAt: string;
  allUsers: boolean;
  notifiedCount: number;
  certInReportedAt: string | null;
  boardReportedAt: string | null;
  certInDueAt: string;
  boardDueAt: string;
  createdAt: string;
}

export async function getBreachNotices() {
  const res = await serverApi<BreachNotice[]>('/admin/breach-notices');
  return { success: res.ok, notices: res.data ?? [], error: res.error };
}

export async function reportBreach(data: {
  title: string;
  description: string;
  likelyConsequences: string;
  mitigation: string;
  occurredAt: string | null;
  detectedAt: string;
  allUsers: boolean;
  affectedEmails: string[];
}) {
  const res = await serverApi<BreachNotice>('/admin/breach-notices', { method: 'POST', json: data });
  return { success: res.ok, notice: res.data, error: res.error };
}

export async function markBreachReported(id: string, which: 'certIn' | 'board') {
  const now = new Date().toISOString();
  const res = await serverApi(`/admin/breach-notices/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    json: which === 'certIn' ? { certInReportedAt: now } : { boardReportedAt: now },
  });
  return { success: res.ok, error: res.error };
}

export async function setLawyerVerified(profileId: string, isVerified: boolean) {
  const res = await serverApi(`/admin/lawyers/${encodeURIComponent(profileId)}/verify`, {
    method: 'PATCH',
    json: { isVerified },
  });
  return { success: res.ok, error: res.error };
}
