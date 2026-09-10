import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatRelativeTime, formatBytes } from '../utils/dateUtils';

describe('dateUtils', () => {
  it('formatBytes returns formatted sizes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(null)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(52428800)).toBe('50 MB');
  });

  it('formatDate formats ISO string to vi-VN date', () => {
    expect(formatDate(null)).toBe('Chưa có');
    const formatted = formatDate('2026-09-09T14:30:00Z');
    expect(formatted).toMatch(/09\/09\/2026/);
  });

  it('formatDateTime formats ISO string to vi-VN date and time', () => {
    expect(formatDateTime(null)).toBe('Chưa có');
    const formatted = formatDateTime('2026-09-09T14:30:00Z');
    expect(formatted).toContain('2026');
  });

  it('formatRelativeTime returns relative string', () => {
    expect(formatRelativeTime(null)).toBe('Chưa có');
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('vừa xong');

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatRelativeTime(tenMinutesAgo)).toBe('10 phút trước');

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2 giờ trước');
  });
});
