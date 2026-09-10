import { apiClient } from './client';
import { CreateTagRequest, MergeTagRequest, Tag } from './types';

export const tagsApi = {
  async list(): Promise<Tag[]> {
    return apiClient<Tag[]>('/api/v1/tags');
  },

  async create(payload: CreateTagRequest): Promise<Tag> {
    return apiClient<Tag>('/api/v1/tags', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async rename(id: string, payload: CreateTagRequest): Promise<Tag> {
    return apiClient<Tag>(`/api/v1/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async addItemTag(tagId: string, itemId: string): Promise<void> {
    return apiClient<void>(`/api/v1/tags/${tagId}/items/${itemId}`, {
      method: 'PUT',
    });
  },

  async removeItemTag(tagId: string, itemId: string): Promise<void> {
    return apiClient<void>(`/api/v1/tags/${tagId}/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  async merge(id: string, payload: MergeTagRequest): Promise<void> {
    return apiClient<void>(`/api/v1/tags/${id}/merge`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async delete(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/tags/${id}`, {
      method: 'DELETE',
    });
  },
};
