import { apiClient } from './client';
import {
  CreateLinkRequest,
  ItemDetail,
  ItemPage,
  LibraryFilters,
  PatchItemRequest,
} from './types';

export const itemsApi = {
  async createLink(payload: CreateLinkRequest): Promise<ItemDetail> {
    return apiClient<ItemDetail>('/api/v1/items/links', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async list(filters: LibraryFilters = {}, signal?: AbortSignal): Promise<ItemPage> {
    const params = new URLSearchParams();

    if (filters.view) params.set('view', filters.view);
    if (filters.page !== undefined) params.set('page', filters.page.toString());
    if (filters.size !== undefined) params.set('size', filters.size.toString());
    if (filters.q && filters.q.trim()) params.set('q', filters.q.trim());
    if (filters.type) params.set('type', filters.type);
    if (filters.collectionId) params.set('collectionId', filters.collectionId);
    if (filters.favorite !== undefined) params.set('favorite', String(filters.favorite));
    if (filters.createdFrom) params.set('createdFrom', filters.createdFrom);
    if (filters.createdBefore) params.set('createdBefore', filters.createdBefore);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.connectionId) params.set('connectionId', filters.connectionId);

    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach((tag) => params.append('tags', tag));
    }

    const qs = params.toString();
    return apiClient<ItemPage>(`/api/v1/items${qs ? `?${qs}` : ''}`, {
      signal,
    });
  },

  async get(id: string): Promise<ItemDetail> {
    return apiClient<ItemDetail>(`/api/v1/items/${id}`);
  },

  async patch(id: string, payload: PatchItemRequest): Promise<ItemDetail> {
    return apiClient<ItemDetail>(`/api/v1/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getContentUrl(id: string): string {
    return `/api/v1/items/${id}/content`;
  },
};
