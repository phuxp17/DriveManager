import React from 'react';
import {
  FolderPlus,
  Grid,
  LayoutList,
  RefreshCw,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { BreadcrumbItem, DriveBreadcrumb } from './DriveBreadcrumb';
import styles from './DriveExplorer.module.css';

interface DriveToolbarProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigateBreadcrumb: (item: BreadcrumbItem, index: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  layoutMode: 'list' | 'grid';
  onLayoutChange: (mode: 'list' | 'grid') => void;
  onCreateFolder: () => void;
  onUploadFile: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const DriveToolbar: React.FC<DriveToolbarProps> = ({
  breadcrumbs,
  onNavigateBreadcrumb,
  searchQuery,
  onSearchChange,
  layoutMode,
  onLayoutChange,
  onCreateFolder,
  onUploadFile,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className={styles.toolbarCard}>
      {/* Top row: Breadcrumb navigation and primary actions */}
      <div className={styles.toolbarTop}>
        <DriveBreadcrumb items={breadcrumbs} onNavigate={onNavigateBreadcrumb} />

        <div className={styles.actionControls}>
          {/* Search box */}
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="search"
              placeholder="Tìm trong Drive này..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={styles.searchInput}
              aria-label="Tìm kiếm trong Drive"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <Button
            variant="secondary"
            size="sm"
            icon={<FolderPlus size={15} />}
            onClick={onCreateFolder}
          >
            Thư mục mới
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<UploadCloud size={15} />}
            onClick={onUploadFile}
          >
            Tải tệp lên
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />}
            onClick={onRefresh}
            title="Tải lại danh sách"
          />

          {/* Grid / List toggle */}
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${layoutMode === 'list' ? styles.toggleBtnActive : ''}`}
              onClick={() => onLayoutChange('list')}
              title="Xem dạng bảng"
              aria-label="Xem dạng bảng"
            >
              <LayoutList size={16} />
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${layoutMode === 'grid' ? styles.toggleBtnActive : ''}`}
              onClick={() => onLayoutChange('grid')}
              title="Xem dạng lưới"
              aria-label="Xem dạng lưới"
            >
              <Grid size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
