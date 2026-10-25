import { api, ApiError } from '@/lib/api/client';

export interface UploadedAttachment {
  key: string;
  filename: string;
  mimeType: string;
  fileSize: number;
}

/** File types the backend accepts for evidence uploads. */
export const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function submitComplaint(data: Record<string, unknown> & { attachments?: UploadedAttachment[] }) {
  try {
    const created = await api<{ id: string; trackingId: string; department: string }>('/complaints', {
      method: 'POST',
      json: data,
    });
    return { success: true as const, trackingId: created.trackingId, department: created.department };
  } catch (err) {
    const e = err as ApiError;
    const isDuplicate = e.status === 409;
    return {
      success: false as const,
      isDuplicate,
      error: e.status === 401 ? 'Please sign in to file a complaint.' : e.message,
    };
  }
}

export async function getComplaintByTrackingId(trackingId: string) {
  try {
    const complaint = await api<any>(`/complaints/track/${encodeURIComponent(trackingId)}`);
    return { success: true as const, complaint };
  } catch (err) {
    const e = err as ApiError;
    return {
      success: false as const,
      error: e.status === 404 ? 'No complaint found with this tracking ID.' : e.message,
    };
  }
}

/** AI quality check. Throws ApiError('Unauthorized') for guests, like the old server action. */
export async function analyzeComplaint(title: string, description: string, department: string, category: string) {
  return api<{
    reliabilityScore: number;
    reliabilityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    feedback: string;
    suggestedCategory: string;
    suggestedDepartment: string;
    missingDetails: string[];
  }>('/ai/analyze', { method: 'POST', json: { title, description, department, category } });
}

export async function replyToInfoRequest(formData: FormData) {
  try {
    await api(`/complaints/${encodeURIComponent(String(formData.get('complaintId')))}/reply`, {
      method: 'POST',
      json: { message: formData.get('message') },
    });
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: (err as ApiError).message };
  }
}

/**
 * Uploads one evidence file: ask the API for a presigned URL, then PUT the file
 * straight to storage. Returns null if uploads are disabled or the upload fails.
 */
export async function uploadEvidence(file: File): Promise<UploadedAttachment | null> {
  try {
    const presign = await api<{ key: string; uploadUrl: string; headers: Record<string, string> }>(
      '/uploads/presign',
      { method: 'POST', json: { filename: file.name, contentType: file.type, size: file.size } }
    );
    const put = await fetch(presign.uploadUrl, { method: 'PUT', headers: presign.headers, body: file });
    if (!put.ok) return null;
    return { key: presign.key, filename: file.name, mimeType: file.type, fileSize: file.size };
  } catch (err) {
    console.warn('Evidence upload failed:', err);
    return null;
  }
}
