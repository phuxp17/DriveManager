import { apiClient } from './client';

export const lifecycleApi = {
  async review(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/items/${id}/review`, { method: 'PUT' });
  },

  async inbox(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/items/${id}/review`, { method: 'DELETE' });
  },

  async archive(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/items/${id}/archive`, { method: 'PUT' });
  },

  async unarchive(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/items/${id}/archive`, { method: 'DELETE' });
  },

  async trash(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/items/${id}`, { method: 'DELETE' });
  },

  async restore(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/trash/items/${id}/restore`, { method: 'POST' });
  },

  async purge(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/trash/items/${id}`, { method: 'DELETE' });
  },

  async favorite(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/users/me/favorites/${id}`, { method: 'PUT' });
  },

  async unfavorite(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/users/me/favorites/${id}`, { method: 'DELETE' });
  },

  async recordOpen(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/items/${id}/opens`, { method: 'POST' });
  },
};
