import { apiClient } from './client';
import { CreateShareRequest, ShareResponse } from './types';

export const sharesApi = {
  async listIncoming(): Promise<ShareResponse[]> {
    return apiClient<ShareResponse[]>('/api/v1/shares/incoming');
  },

  async listOutgoing(): Promise<ShareResponse[]> {
    return apiClient<ShareResponse[]>('/api/v1/shares/outgoing');
  },

  async create(payload: CreateShareRequest): Promise<ShareResponse> {
    return apiClient<ShareResponse>('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async accept(id: string): Promise<ShareResponse> {
    return apiClient<ShareResponse>(`/api/v1/shares/${id}/accept`, {
      method: 'POST',
    });
  },

  async reject(id: string): Promise<ShareResponse> {
    return apiClient<ShareResponse>(`/api/v1/shares/${id}/reject`, {
      method: 'POST',
    });
  },

  async revokeOrLeave(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/shares/${id}`, {
      method: 'DELETE',
    });
  },
};
