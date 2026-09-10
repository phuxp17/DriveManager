import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient, ApiError } from '../api/client';
import { clearCsrf, setCsrf } from '../api/csrf';

describe('API Client', () => {
  beforeEach(() => {
    clearCsrf();
    vi.restoreAllMocks();
  });

  it('attaches CSRF header and credentials on mutations', async () => {
    setCsrf('X-CSRF-TOKEN', 'secret-csrf-token');

    let capturedHeaders: Headers | undefined;
    let capturedCredentials: RequestCredentials | undefined;

    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedHeaders = new Headers(init.headers);
      capturedCredentials = init.credentials;
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      });
    });

    const res = await apiClient<{ success: boolean }>('/api/v1/test', {
      method: 'POST',
      body: JSON.stringify({ data: 123 }),
    });

    expect(res).toEqual({ success: true });
    expect(capturedCredentials).toBe('include');
    expect(capturedHeaders?.get('X-CSRF-TOKEN')).toBe('secret-csrf-token');
    expect(capturedHeaders?.get('Content-Type')).toBe('application/json');
  });

  it('throws ApiError with correct status and message on 401', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        timestamp: '2026-09-09T10:00:00Z',
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      }),
    });

    await expect(apiClient('/api/v1/items')).rejects.toThrow(ApiError);
    await global.fetch;
  });

  it('throws ApiError on 409 version conflict', async () => {
    setCsrf('X-CSRF-TOKEN', 'token');
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        timestamp: '2026-09-09T10:00:00Z',
        status: 409,
        code: 'VERSION_CONFLICT',
        message: 'The item changed. Reload before updating.',
      }),
    });

    try {
      await apiClient('/api/v1/items/123', {
        method: 'PATCH',
        body: JSON.stringify({ expectedVersion: 0 }),
      });
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
      expect(err.code).toBe('VERSION_CONFLICT');
    }
  });

  it('handles 204 No Content response gracefully', async () => {
    setCsrf('X-CSRF-TOKEN', 'token');
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    const res = await apiClient<void>('/api/v1/items/123/review', {
      method: 'PUT',
    });

    expect(res).toBeUndefined();
  });
});
