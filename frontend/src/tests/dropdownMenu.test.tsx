import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DropdownMenu, DropdownMenuItem } from '../components/common/DropdownMenu';

describe('DropdownMenu component', () => {
  it('renders trigger, opens menu items, and handles actions and disabled states', () => {
    const handleOpen = vi.fn();
    const handleDownload = vi.fn();
    const handleDetail = vi.fn();
    const handleDisabled = vi.fn();

    const items: (DropdownMenuItem | 'separator')[] = [
      { label: 'Mở trên Google Drive', onClick: handleOpen },
      { label: 'Tải xuống máy', onClick: handleDownload },
      'separator',
      { label: 'Xem chi tiết', onClick: handleDetail },
      { label: 'Hành động bị khóa', onClick: handleDisabled, disabled: true },
    ];

    render(
      <DropdownMenu
        trigger={<button type="button">Mở tùy chọn</button>}
        items={items}
      />
    );

    const triggerBtn = screen.getByRole('button', { name: 'Mở tùy chọn' });
    expect(triggerBtn).toBeInTheDocument();

    // Menu should initially be closed
    expect(screen.queryByText('Mở trên Google Drive')).not.toBeInTheDocument();

    // Open menu
    fireEvent.keyDown(triggerBtn, { key: 'Enter' });

    expect(screen.getByText('Mở trên Google Drive')).toBeInTheDocument();
    expect(screen.getByText('Tải xuống máy')).toBeInTheDocument();
    expect(screen.getByText('Xem chi tiết')).toBeInTheDocument();

    const disabledItem = screen.getByText('Hành động bị khóa').closest('[role="menuitem"]');
    expect(disabledItem).toHaveAttribute('data-disabled');

    // Click enabled item
    fireEvent.click(screen.getByText('Xem chi tiết'));
    expect(handleDetail).toHaveBeenCalledTimes(1);
  });
});
