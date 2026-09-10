import { apiClient } from './client';
import { AddContactRequest, ContactResponse } from './types';

export const contactsApi = {
  async list(): Promise<ContactResponse[]> {
    return apiClient<ContactResponse[]>('/api/v1/contacts');
  },

  async add(payload: AddContactRequest): Promise<ContactResponse> {
    return apiClient<ContactResponse>('/api/v1/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async remove(contactUserId: string): Promise<void> {
    return apiClient<void>(`/api/v1/contacts/${contactUserId}`, {
      method: 'DELETE',
    });
  },
};
