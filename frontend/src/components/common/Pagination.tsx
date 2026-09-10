import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import styles from './Pagination.module.css';

export interface PaginationProps {
  page: number; // 0-indexed as per backend
  size: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSizeChange?: (newSize: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
}) => {
  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  return (
    <div className={styles.pagination}>
      <div className={styles.left}>
        <span>
          Hiển thị <strong>{from}</strong> - <strong>{to}</strong> trên <strong>{totalElements}</strong> mục
        </span>
        {onSizeChange && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Số hàng:</span>
            <select
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              className={styles.select}
              aria-label="Chọn số mục trên mỗi trang"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        )}
      </div>

      <div className={styles.right}>
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Trang trước"
          icon={<ChevronLeft size={16} />}
        >
          Trước
        </Button>
        <span className={styles.pageInfo}>
          Trang {totalPages > 0 ? page + 1 : 0} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Trang sau"
          icon={<ChevronRight size={16} />}
        >
          Sau
        </Button>
      </div>
    </div>
  );
};
