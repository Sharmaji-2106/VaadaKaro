import { api, ApiError, query } from '@/lib/api/client';

export interface LegalDocument {
  id: string;
  complaintId: string | null;
  title: string;
  content: string;
  type: string;
  category: string | null;
  riskLevel: string | null;
  analysis: string | null;
  /** The citizen's own record; VaadaKaro never submits a letter for them. */
  submissionStatus: SubmissionStatus;
  submittedTo: string | null;
  submissionReference: string | null;
  submittedOn: string | null;
  responseNote: string | null;
  respondedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'RESPONDED';

export interface LegalAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedAction: string;
  category: string;
  missingEvidence: string[];
}

/** `aiConsent` is the guest's per-question agreement; signed-in users' saved choice applies instead. */
export async function getLegalAdvice(query: string, constitutionMode = false, aiConsent = false) {
  try {
    const res = await api<{ response: string }>('/ai/legal-advice', {
      method: 'POST',
      json: { query, constitutionMode, aiConsent },
    });
    return { response: res.response };
  } catch (err) {
    const e = err as ApiError;
    return { error: e.status === 429 ? 'You are asking too quickly. Please wait a minute.' : e.message };
  }
}

export async function generateLegalDrafts(data: { issue: string; description: string; category?: string; complaintId?: string }) {
  try {
    const res = await api<{ analysis: LegalAnalysis; documents: LegalDocument[] }>('/ai/legal-documents', {
      method: 'POST',
      json: { ...data, category: data.category || undefined },
    });
    return { success: true as const, analysis: res.analysis, documents: res.documents };
  } catch (err) {
    return { success: false as const, error: (err as ApiError).message };
  }
}

export type LetterLanguage = 'en' | 'hi' | 'mr';

export interface LetterDraft {
  detectedLanguage: LetterLanguage;
  englishSummary: string;
  category: string;
  suggestedDepartment: string;
  authorityNote: string;
  subject: string;
  body: string;
  missingInformation: string[];
  placeholders: string[];
  assumptions: string[];
  factCheck: { missingFacts: string[]; passed: boolean };
  disclaimer: string;
  /** Matching entries from the maintained authority directory, most local first. */
  authorities: Authority[];
}

export async function draftLetter(data: {
  description: string;
  outputLanguage: LetterLanguage;
  location?: string;
}) {
  try {
    const draft = await api<LetterDraft>('/ai/draft-letter', {
      method: 'POST',
      json: { ...data, location: data.location || undefined },
    });
    return { success: true as const, draft };
  } catch (err) {
    const e = err as ApiError;
    if (e.status === 429) return { success: false as const, error: 'You are drafting too quickly. Please wait a minute.' };
    return { success: false as const, error: e.message };
  }
}

/** Saves an edited letter to the user's documents so it can be downloaded as PDF. */
export async function saveDocument(data: { title: string; content: string; category?: string; editedFromAi?: boolean }) {
  try {
    const doc = await api<LegalDocument>('/documents', { method: 'POST', json: data });
    return { success: true as const, document: doc };
  } catch (err) {
    return { success: false as const, error: (err as ApiError).message };
  }
}

/** Same-origin links: the proxy attaches the session and passes the PDF through. */
export const documentPdfUrl = (id: string) => `/api/v1/documents/${encodeURIComponent(id)}/pdf`;
export const complaintPdfUrl = (id: string) => `/api/v1/complaints/${encodeURIComponent(id)}/pdf`;

export async function fetchUserLegalDocs(): Promise<LegalDocument[]> {
  try {
    return await api<LegalDocument[]>('/documents');
  } catch {
    return [];
  }
}

export async function deleteLegalDoc(id: string) {
  try {
    await api(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return { success: true as const };
  } catch {
    return { success: false as const, error: 'Deletion failed' };
  }
}

export async function updateLegalDoc(id: string, content: string) {
  try {
    await api(`/documents/${encodeURIComponent(id)}`, { method: 'PATCH', json: { content } });
    return { success: true as const };
  } catch {
    return { success: false as const, error: 'Update failed' };
  }
}

export async function recordSubmission(
  id: string,
  data: {
    status: SubmissionStatus;
    submittedTo?: string;
    submissionReference?: string;
    submittedOn?: string;
    responseNote?: string;
    respondedOn?: string;
  }
) {
  try {
    const doc = await api<LegalDocument>(`/documents/${encodeURIComponent(id)}/submission`, {
      method: 'PUT',
      json: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '' && v !== undefined)),
    });
    return { success: true as const, document: doc };
  } catch (err) {
    return { success: false as const, error: (err as ApiError).message };
  }
}

export interface Authority {
  id: string;
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
  lastVerifiedAt: string | null;
  isActive: boolean;
  updatedAt: string;
  scope?: 'DISTRICT' | 'STATE' | 'NATIONAL';
  needsRecheck?: boolean;
}

export async function findAuthorities(filters: {
  department?: string;
  category?: string;
  state?: string;
  district?: string;
}): Promise<Authority[]> {
  return api<Authority[]>(`/authorities${query(filters)}`);
}
