import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearCsrf, fetchCsrf, getCsrfHeaderName, getCsrfToken, setCsrf } from '../api/csrf';

describe('CSRF Token Management', () => {
  beforeEach(() => {
    clearCsrf();
    vi.restoreAllMocks();
  });

  it('initializes with null token and default header name', () => {
    expect(getCsrfToken()).toBeNull();
    expect(getCsrfHeaderName()).toBe('X-CSRF-TOKEN');
  });

  it('sets and gets token correctly', () => {
    setCsrf('X-CUSTOM-CSRF', 'test-token-123');
    expect(getCsrfHeaderName()).toBe('X-CUSTOM-CSRF');
    expect(getCsrfToken()).toBe('test-token-123');
  });

  it('clears token correctly', () => {
    setCsrf('X-CSRF-TOKEN', 'token-abc');
    clearCsrf();
    expect(getCsrfToken()).toBeNull();
    expect(getCsrfHeaderName()).toBe('X-CSRF-TOKEN');
  });

  it('fetches CSRF from backend and caches in memory', async () => {
    const mockCsrf = {
      headerName: 'X-CSRF-TOKEN',
      parameterName: '_csrf',
      token: 'backend-token-xyz',
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockCsrf,
    });

    const result = await fetchCsrf();

    expect(result.token).toBe('backend-token-xyz');
    expect(getCsrfToken()).toBe('backend-token-xyz');
    expect(getCsrfHeaderName()).toBe('X-CSRF-TOKEN');
  });
});
