import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { toast, ToastContainer } from '../components/common/Toast';

describe('Toast notification system', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toast.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders success and error toasts', () => {
    render(<ToastContainer />);

    act(() => {
      toast.success('Thành công rồi!');
      toast.error('Có lỗi xảy ra!');
    });

    expect(screen.getByText('Thành công rồi!')).toBeInTheDocument();
    expect(screen.getByText('Có lỗi xảy ra!')).toBeInTheDocument();
  });

  it('removes toast when close button is clicked', () => {
    render(<ToastContainer />);

    act(() => {
      toast.info('Thông báo thử nghiệm');
    });

    expect(screen.getByText('Thông báo thử nghiệm')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Đóng thông báo');
    fireEvent.click(closeBtn);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByText('Thông báo thử nghiệm')).not.toBeInTheDocument();
  });

  it('auto-dismisses toast after duration', () => {
    render(<ToastContainer />);

    act(() => {
      toast.warning('Cảnh báo tự biến mất', 3000);
    });

    expect(screen.getByText('Cảnh báo tự biến mất')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3200);
    });

    expect(screen.queryByText('Cảnh báo tự biến mất')).not.toBeInTheDocument();
  });
});
