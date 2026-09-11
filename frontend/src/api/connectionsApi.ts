import { apiClient } from './client';
import { ConnectResponse, StorageConnection } from './types';

export const connectionsApi = {
  async list(): Promise<StorageConnection[]> {
    return apiClient<StorageConnection[]>('/api/v1/storage-connections');
  },

  async connectGoogle(): Promise<ConnectResponse> {
    return apiClient<ConnectResponse>('/api/v1/storage-connections/google/connect', {
      method: 'POST',
    });
  },

  async reconnectGoogle(id: string): Promise<ConnectResponse> {
    return apiClient<ConnectResponse>(`/api/v1/storage-connections/${id}/reconnect`, {
      method: 'POST',
    });
  },

  async completeGoogleCallback(state: string, code: string, signal?: AbortSignal): Promise<void> {
    const params = new URLSearchParams({ state, code });
    return apiClient<void>(`/api/v1/storage-connections/google/callback?${params}`, { signal });
  },

  async disconnect(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/storage-connections/${id}`, {
      method: 'DELETE',
    });
  },

  async sync(id: string): Promise<{ newItems: number; updatedItems: number; totalItems: number }> {
    return apiClient<{ newItems: number; updatedItems: number; totalItems: number }>(
      `/api/v1/storage-connections/${id}/sync`,
      { method: 'POST' }
    );
  },

  async syncAll(): Promise<{ newItems: number; updatedItems: number; totalItems: number }> {
    return apiClient<{ newItems: number; updatedItems: number; totalItems: number }>(
      '/api/v1/storage-connections/sync-all',
      { method: 'POST' }
    );
  },
};
