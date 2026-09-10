import { beforeEach, describe, expect, it, vi } from 'vitest';
import { connectionsApi } from '../api/connectionsApi';

describe('connectionsApi OAuth callback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards the Google code and state to the backend callback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await connectionsApi.completeGoogleCallback('state+/=', 'code & value');

    expect(global.fetch).toHaveBeenCalledOnce();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/storage-connections/google/callback?state=state%2B%2F%3D&code=code+%26+value',
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
  });
});
