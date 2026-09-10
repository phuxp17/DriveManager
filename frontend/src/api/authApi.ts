import { apiClient } from './client';
import { clearCsrf, fetchCsrf, setCsrf } from './csrf';
import { UserResponse } from './types';

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  async getCsrf() {
    return fetchCsrf();
  },

  async register(payload: RegisterPayload): Promise<UserResponse> {
    return apiClient<UserResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: LoginPayload): Promise<UserResponse> {
    const user = await apiClient<UserResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    // Refresh CSRF token after login since Spring session is rotated
    try {
      const csrf = await fetchCsrf();
      setCsrf(csrf.headerName, csrf.token);
    } catch {
      // ignore
    }
    return user;
  },

  async me(): Promise<UserResponse> {
    return apiClient<UserResponse>('/api/v1/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await apiClient<void>('/api/v1/auth/logout', {
        method: 'POST',
      });
    } finally {
      clearCsrf();
      // fetch a fresh CSRF token for next session
      try {
        await fetchCsrf();
      } catch {
        // ignore
      }
    }
  },
};
