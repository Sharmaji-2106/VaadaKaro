import { api, ApiError } from '@/lib/api/client';

/** Prefix of the API's 403 detail when AI processing hasn't been consented to. */
export const AI_CONSENT_REQUIRED = 'AI consent required';
export const isAiConsentError = (message: string | undefined) => !!message?.startsWith(AI_CONSENT_REQUIRED);

export interface Nominee {
  name: string;
  relation: string;
  email: string | null;
  phone: string | null;
  addedAt: string;
}

export interface PrivacyStatus {
  noticeVersion: string;
  currentNoticeVersion: string;
  aiConsent: boolean;
  adultConfirmed: boolean;
  nominee: Nominee | null;
  history: { purpose: 'ACCOUNT' | 'AI_PROCESSING'; granted: boolean; noticeVersion: string; createdAt: string }[];
}

async function call<T>(path: string, init?: RequestInit & { json?: unknown }) {
  try {
    return { success: true as const, data: await api<T>(path, init) };
  } catch (err) {
    return { success: false as const, error: (err as ApiError).message };
  }
}

export const getPrivacyStatus = () => call<PrivacyStatus>('/account/privacy');

export const setAiConsent = (granted: boolean) =>
  call<PrivacyStatus>('/account/consents/ai', { method: 'PUT', json: { granted } });

export const setNominee = (nominee: { name: string; relation: string; email?: string; phone?: string }) =>
  call<PrivacyStatus>('/account/nominee', {
    method: 'PUT',
    json: { ...nominee, email: nominee.email || null, phone: nominee.phone || null },
  });

export const removeNominee = () => call<PrivacyStatus>('/account/nominee', { method: 'DELETE' });

export type RequestType =
  | 'ACCESS'
  | 'CORRECTION'
  | 'ERASURE'
  | 'NOMINATION'
  | 'PRIVACY_GRIEVANCE'
  | 'CONTENT_COMPLAINT'
  | 'OTHER';

export interface GrievanceOfficer {
  name: string | null;
  email: string;
  address: string | null;
  acknowledgeWithinHours: number;
  resolveWithinDays: number;
}

export interface Grievance {
  id: string;
  reference: string;
  type: RequestType;
  details: string;
  status: 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  dueAt: string;
  response: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export const getGrievanceOfficer = () => call<GrievanceOfficer>('/grievance-officer');
export const getMyGrievances = () => call<Grievance[]>('/grievances');

export const submitGrievance = (data: { type: RequestType; details: string; name?: string; email?: string }) =>
  call<Grievance>('/grievances', { method: 'POST', json: data });

export const trackGrievance = (reference: string, email: string) =>
  call<Grievance>(`/grievances/track/${encodeURIComponent(reference.trim())}?email=${encodeURIComponent(email.trim())}`);
