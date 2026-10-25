import { api, ApiError, query } from '@/lib/api/client';

export interface Lawyer {
  id: string;
  specialization: string[];
  location: string;
  pincode: string;
  fees: number;
  experience: number;
  isAvailable: boolean;
  isVerified: boolean;
  languages: string[];
  bio: string | null;
  rating: number;
  user: { name: string | null; image?: string | null };
}

export async function getLawyers(filters: {
  location?: string;
  specialization?: string;
  maxFees?: number;
  language?: string;
  isAvailable?: boolean;
  search?: string;
}): Promise<Lawyer[]> {
  return api<Lawyer[]>(`/lawyers${query(filters)}`);
}

export async function getLawyerById(id: string): Promise<Lawyer | null> {
  try {
    return await api<Lawyer>(`/lawyers/${encodeURIComponent(id)}`);
  } catch (err) {
    if ((err as ApiError).status === 404) return null;
    throw err;
  }
}

export async function createBooking(data: {
  lawyerId: string;
  date: string;
  timeSlot: string;
  description: string;
  isOffline: boolean;
}) {
  const { lawyerId, ...body } = data;
  return api(`/lawyers/${encodeURIComponent(lawyerId)}/bookings`, { method: 'POST', json: body });
}
