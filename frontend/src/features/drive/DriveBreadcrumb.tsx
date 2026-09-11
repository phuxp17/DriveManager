import React from 'react';
import { ChevronRight, HardDrive } from 'lucide-react';
import styles from './DriveExplorer.module.css';

export interface BreadcrumbItem {
  id: string;
  name: string;
}

interface DriveBreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem, index: number) => void;
}

export const DriveBreadcrumb: React.FC<DriveBreadcrumbProps> = ({ items, onNavigate }) => {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.id}>
            {index > 0 && <ChevronRight size={14} color="var(--color-text-muted)" />}
            <button
              type="button"
              className={`${styles.breadcrumbItem} ${isLast ? styles.breadcrumbActive : ''}`}
              onClick={() => !isLast && onNavigate(item, index)}
              disabled={isLast}
              title={item.name}
            >
              {index === 0 && <HardDrive size={14} color="var(--color-primary)" />}
              <span>{item.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
