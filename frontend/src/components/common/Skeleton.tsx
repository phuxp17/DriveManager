import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius,
  className = '',
}) => {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
      }}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.tableRowSkeleton}>
          <Skeleton width={24} height={24} borderRadius="4px" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton width="40%" height={16} />
            <Skeleton width="20%" height={12} />
          </div>
          <Skeleton width={80} height={16} />
          <Skeleton width={120} height={16} />
        </div>
      ))}
    </div>
  );
};

export const GridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.cardSkeleton}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Skeleton width={40} height={40} borderRadius="8px" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton width="70%" height={16} />
              <Skeleton width="40%" height={12} />
            </div>
          </div>
          <Skeleton width="100%" height={32} />
        </div>
      ))}
    </div>
  );
};
