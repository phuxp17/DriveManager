import { describe, it, expect } from 'vitest';
import { driveApi } from '../api/driveApi';

describe('driveApi', () => {
  it('generates correct content download URL without export format', () => {
    const url = driveApi.getContentUrl('acc-123', 'file-456');
    expect(url).toBe('/api/drive-accounts/acc-123/files/file-456/content');
  });

  it('generates correct content download URL with export format for Google Docs/Sheets', () => {
    const url = driveApi.getContentUrl('acc-123', 'file-456', 'pdf');
    expect(url).toBe('/api/drive-accounts/acc-123/files/file-456/content?export=pdf');
  });
});
