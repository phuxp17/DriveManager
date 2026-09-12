import { apiClient } from './client';
import {
  AdminAuthStatus,
  AdminStats,
  AdminAccessLogEntry,
  AdminUserEntry,
} from './types';

export interface SendOtpResponse {
  message: string;
  email: string;
  expiresAt: string;
}

export interface VerifyKeyResponse {
  success: boolean;
  message: string;
}

export interface PaginatedLogs {
  content: AdminAccessLogEntry[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const adminApi = {
  async getAuthStatus(): Promise<AdminAuthStatus> {
    return apiClient<AdminAuthStatus>('/api/v1/admin/auth/status');
  },

  async sendOtp(): Promise<SendOtpResponse> {
    return apiClient<SendOtpResponse>('/api/v1/admin/auth/send-otp', {
      method: 'POST',
    });
  },

  async verify(key: string): Promise<VerifyKeyResponse> {
    return apiClient<VerifyKeyResponse>('/api/v1/admin/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
  },

  async getStats(): Promise<AdminStats> {
    return apiClient<AdminStats>('/api/v1/admin/stats');
  },

  async getLogs(params: {
    path?: string;
    status?: number;
    ip?: string;
    page?: number;
    size?: number;
  } = {}): Promise<PaginatedLogs> {
    const searchParams = new URLSearchParams();
    if (params.path) searchParams.set('path', params.path);
    if (params.status != null) searchParams.set('status', String(params.status));
    if (params.ip) searchParams.set('ip', params.ip);
    if (params.page != null) searchParams.set('page', String(params.page));
    if (params.size != null) searchParams.set('size', String(params.size));

    const qs = searchParams.toString();
    return apiClient<PaginatedLogs>(`/api/v1/admin/logs${qs ? `?${qs}` : ''}`);
  },

  async getUsers(): Promise<AdminUserEntry[]> {
    return apiClient<AdminUserEntry[]>('/api/v1/admin/users');
  },

  async updateUserRole(userId: string, role: string): Promise<{ success: boolean; message: string }> {
    return apiClient<{ success: boolean; message: string }>(`/api/v1/admin/users/${userId}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },
};
