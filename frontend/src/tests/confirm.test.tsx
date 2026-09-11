import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { confirm, ConfirmProvider } from '../components/common/ConfirmDialog';

describe('ConfirmDialog verification system', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog and resolves true on confirm', async () => {
    render(
      <ConfirmProvider>
        <div>App Root</div>
      </ConfirmProvider>
    );

    let confirmPromise: Promise<boolean>;
    act(() => {
      confirmPromise = confirm({
        title: 'Xóa tệp tin',
        message: 'Bạn có chắc chắn muốn xóa vĩnh viễn tệp này không?',
        confirmText: 'Xóa vĩnh viễn',
        cancelText: 'Giữ lại',
        variant: 'danger',
      });
    });

    expect(screen.getByText('Xóa tệp tin')).toBeInTheDocument();
    expect(screen.getByText('Bạn có chắc chắn muốn xóa vĩnh viễn tệp này không?')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Xóa vĩnh viễn' });
    const cancelBtn = screen.getByRole('button', { name: 'Giữ lại' });

    expect(confirmBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(confirmBtn);

    const result = await confirmPromise!;
    expect(result).toBe(true);

    expect(screen.queryByText('Xóa tệp tin')).not.toBeInTheDocument();
  });

  it('resolves false on cancel', async () => {
    render(
      <ConfirmProvider>
        <div>App Root</div>
      </ConfirmProvider>
    );

    let confirmPromise: Promise<boolean>;
    act(() => {
      confirmPromise = confirm({
        title: 'Hủy liên kết tài khoản',
        message: 'Bạn có chắc chắn muốn ngắt kết nối?',
        confirmText: 'Ngắt kết nối',
        cancelText: 'Đóng',
        variant: 'warning',
      });
    });

    expect(screen.getByText('Hủy liên kết tài khoản')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(cancelBtn);

    const result = await confirmPromise!;
    expect(result).toBe(false);

    expect(screen.queryByText('Hủy liên kết tài khoản')).not.toBeInTheDocument();
  });

  it('requires matching keyword before allowing confirmation when requireMatchText is specified', async () => {
    render(
      <ConfirmProvider>
        <div>App Root</div>
      </ConfirmProvider>
    );

    let confirmPromise: Promise<boolean>;
    act(() => {
      confirmPromise = confirm({
        title: 'Xóa bộ sưu tập nhạy cảm',
        message: 'Thao tác này không thể hoàn tác.',
        confirmText: 'Xóa vĩnh viễn',
        requireMatchText: 'DELETE-COLLECTION',
      });
    });

    expect(screen.getByText('Xóa bộ sưu tập nhạy cảm')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: 'Xóa vĩnh viễn' });
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByPlaceholderText('DELETE-COLLECTION');
    fireEvent.change(input, { target: { value: 'WRONG_INPUT' } });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: 'DELETE-COLLECTION' } });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);
    const result = await confirmPromise!;
    expect(result).toBe(true);
  });

  it('falls back to window.confirm when provider is not mounted', async () => {
    const windowConfirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const result = await confirm({
      title: 'Xác nhận fallback',
      message: 'Thông báo fallback',
    });

    expect(windowConfirmSpy).toHaveBeenCalledWith('Thông báo fallback');
    expect(result).toBe(true);

    windowConfirmSpy.mockRestore();
  });
});
