'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { TOKEN_COOKIE } from '@/lib/api/config';
import { serverApi } from '@/lib/api/server';

type FormState = { error?: string; success?: string } | undefined;

interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: { role: string };
}

export async function registerUser(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get('adult') !== 'on') {
    // DPDP Act s.9: without a verifiable parental-consent process, accounts are for adults only.
    return { error: 'You must be 18 or older to create an account. A parent or guardian can file on your behalf.' };
  }
  if (formData.get('consent') !== 'on') {
    return { error: 'You must agree to the privacy notice and Terms of service.' };
  }

  const res = await serverApi('/auth/signup', {
    method: 'POST',
    json: {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
      consent: true,
      adult: true,
      aiConsent: formData.get('aiConsent') === 'on',
    },
  });

  if (res.ok) return { success: 'Account created. You can now sign in.' };
  if (res.status === 429) return { error: 'Too many attempts. Please wait a minute and try again.' };
  return { error: res.error };
}

export async function loginUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  if (!email || !password) return { error: 'Enter your email and password.' };

  const res = await serverApi<LoginResponse>('/auth/login', { method: 'POST', json: { email, password } });

  if (!res.ok || !res.data) {
    if (res.status === 401) return { error: 'Incorrect email or password.' };
    if (res.status === 429) return { error: 'Too many attempts. Please wait a minute and try again.' };
    if (res.status === 422) return { error: 'Enter a valid email address.' };
    return { error: res.error };
  }

  (await cookies()).set(TOKEN_COOKIE, res.data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: res.data.expiresIn,
  });

  const callbackUrl = String(formData.get('callbackUrl') || '');
  const role = res.data.user.role;
  const fallback =
    role === 'OFFICER' || role === 'ADMIN' ? '/dashboard/officer' : role === 'LAWYER' ? '/dashboard/lawyer' : '/dashboard';
  // Only same-site paths, never an absolute URL from the query string.
  redirect(callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : fallback);
}

export async function logoutUser() {
  (await cookies()).delete(TOKEN_COOKIE);
  redirect('/login');
}

/** Records that the signed-in person has seen the current privacy notice. */
export async function acknowledgeNotice() {
  await serverApi('/account/notice/acknowledge', { method: 'POST' });
  revalidatePath('/', 'layout');
}

/** Permanently deletes the signed-in account (password required), then signs out. */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get('confirm') !== 'DELETE') return { error: 'Type DELETE to confirm.' };
  const res = await serverApi('/account', { method: 'DELETE', json: { password: String(formData.get('password') || '') } });
  if (!res.ok) return { error: res.status === 403 ? 'That password is incorrect.' : res.error };
  (await cookies()).delete(TOKEN_COOKIE);
  redirect('/?accountDeleted=1');
}
