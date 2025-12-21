import type { AuthResponse, UserResponse } from '@/types';
import { apiFetch } from '@/lib/api-client';

export const signup = async (email: string, password: string, displayName?: string): Promise<AuthResponse> => {
  return apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const logout = async (): Promise<void> => {
  await apiFetch('/auth/logout', { method: 'POST' });
};

export const getCurrentUser = async (): Promise<UserResponse> => {
  return apiFetch<UserResponse>('/auth/me');
};
