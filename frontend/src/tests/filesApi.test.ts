import { describe, it, expect } from 'vitest';
import { filesApi, MAX_FILE_SIZE_BYTES } from '../api/filesApi';
import { ApiError } from '../api/client';

describe('filesApi client-side validation', () => {
  it('rejects file larger than MAX_FILE_SIZE_BYTES (50MB) before network request', async () => {
    // Create dummy file with size 52,428,801 bytes (50MB + 1 byte)
    const largeFile = new File([''], 'too-large.dat');
    Object.defineProperty(largeFile, 'size', { value: MAX_FILE_SIZE_BYTES + 1 });

    await expect(
      filesApi.uploadFile('conn-123', largeFile)
    ).rejects.toThrow(ApiError);

    try {
      await filesApi.uploadFile('conn-123', largeFile);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('FILE_TOO_LARGE');
      expect(err.status).toBe(400);
    }
  });
});
