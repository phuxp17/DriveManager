import { apiClient } from './client';
import {
  Collection,
  CreateCollectionRequest,
  MoveCollectionRequest,
  MoveItemCollectionRequest,
  RenameCollectionRequest,
} from './types';

export const collectionsApi = {
  async list(parentId?: string | null): Promise<Collection[]> {
    const qs = parentId ? `?parentId=${encodeURIComponent(parentId)}` : '';
    return apiClient<Collection[]>(`/api/v1/collections${qs}`);
  },

  async get(id: string): Promise<Collection> {
    return apiClient<Collection>(`/api/v1/collections/${id}`);
  },

  async ancestors(id: string): Promise<Collection[]> {
    return apiClient<Collection[]>(`/api/v1/collections/${id}/ancestors`);
  },

  async create(payload: CreateCollectionRequest): Promise<Collection> {
    return apiClient<Collection>('/api/v1/collections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async rename(id: string, payload: RenameCollectionRequest): Promise<Collection> {
    return apiClient<Collection>(`/api/v1/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async moveParent(id: string, payload: MoveCollectionRequest): Promise<void> {
    return apiClient<void>(`/api/v1/collections/${id}/parent`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async addItem(collectionId: string, itemId: string): Promise<void> {
    return apiClient<void>(`/api/v1/collections/${collectionId}/items/${itemId}`, {
      method: 'PUT',
    });
  },

  async removeItem(collectionId: string, itemId: string): Promise<void> {
    return apiClient<void>(`/api/v1/collections/${collectionId}/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  async moveItem(itemId: string, payload: MoveItemCollectionRequest): Promise<void> {
    return apiClient<void>(`/api/v1/collections/items/${itemId}/move`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async delete(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/collections/${id}`, {
      method: 'DELETE',
    });
  },

  async restore(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/collections/${id}/restore`, {
      method: 'POST',
    });
  },
};
