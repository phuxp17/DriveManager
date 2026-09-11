import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Cloud,
  FolderOpen,
  HardDrive,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { connectionsApi } from '../../api/connectionsApi';
import { DriveItem, driveApi } from '../../api/driveApi';
import { StorageConnection } from '../../api/types';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { confirm } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { GridSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import { toast } from '../../components/common/Toast';
import { BreadcrumbItem } from './DriveBreadcrumb';
import { DriveCopyModal } from './DriveCopyModal';
import { DriveCreateFolderModal } from './DriveCreateFolderModal';
import { DriveFileGrid } from './DriveFileGrid';
import { DriveFileList } from './DriveFileList';
import { DriveMoveModal } from './DriveMoveModal';
import { DrivePreviewModal } from './DrivePreviewModal';
import { DriveRenameModal } from './DriveRenameModal';
import { DriveShareModal } from './DriveShareModal';
import { DriveToolbar } from './DriveToolbar';
import { DriveUploadModal } from './DriveUploadModal';
import styles from './DriveExplorer.module.css';

export const DriveExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Storage Connections
  const {
    data: connections = [],
    isLoading: loadingConnections,
    error: connectionsError,
  } = useQuery<StorageConnection[]>({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list(),
  });

  const googleConnections = connections.filter(
    (c) => c.provider === 'GOOGLE' && c.status === 'CONNECTED'
  );

  // Selected Account ID
  const urlAccountId = searchParams.get('accountId');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    if (googleConnections.length > 0) {
      if (urlAccountId && googleConnections.some((c) => c.id === urlAccountId)) {
        setSelectedAccountId(urlAccountId);
      } else {
        setSelectedAccountId(googleConnections[0].id);
      }
    } else {
      setSelectedAccountId('');
    }
  }, [googleConnections, urlAccountId]);

  const handleSelectAccount = (accId: string) => {
    setSelectedAccountId(accId);
    const next = new URLSearchParams(searchParams);
    next.set('accountId', accId);
    setSearchParams(next);
    // Reset path
    setBreadcrumbs([{ id: 'root', name: 'Drive của tôi' }]);
    setSearchQuery('');
  };

  // Layout Preference
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('dm_drive_layout') as 'list' | 'grid') || 'grid';
  });

  const handleLayoutChange = (mode: 'list' | 'grid') => {
    setLayoutMode(mode);
    localStorage.setItem('dm_drive_layout', mode);
  };

  // Breadcrumbs & Navigation
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Drive của tôi' },
  ]);
  const currentFolderId = breadcrumbs[breadcrumbs.length - 1]?.id || 'root';

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Files Data Fetching via TanStack Query
  const isSearching = debouncedSearch.length > 0;

  const {
    data: fileListData,
    isLoading: loadingFiles,
    isFetching: fetchingFiles,
    error: filesError,
    refetch: refetchFiles,
  } = useQuery({
    queryKey: ['drive-files', selectedAccountId, currentFolderId, debouncedSearch],
    queryFn: ({ signal }) => {
      if (!selectedAccountId) return Promise.resolve({ files: [], nextPageToken: undefined });
      if (isSearching) {
        return driveApi.searchFiles(selectedAccountId, debouncedSearch, currentFolderId, undefined, 50, signal);
      }
      return driveApi.listFiles(selectedAccountId, currentFolderId, undefined, 50, signal);
    },
    enabled: !!selectedAccountId,
  });

  // Additional pages state for pagination
  const [extraFiles, setExtraFiles] = useState<DriveItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setExtraFiles([]);
    setNextPageToken(fileListData?.nextPageToken);
  }, [fileListData, currentFolderId, debouncedSearch]);

  const allFiles = [...(fileListData?.files || []), ...extraFiles];

  const handleLoadMore = async () => {
    if (!nextPageToken || !selectedAccountId || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = isSearching
        ? await driveApi.searchFiles(selectedAccountId, debouncedSearch, currentFolderId, nextPageToken, 50)
        : await driveApi.listFiles(selectedAccountId, currentFolderId, nextPageToken, 50);

      setExtraFiles((prev) => [...prev, ...res.files]);
      setNextPageToken(res.nextPageToken);
    } catch {
      toast.error('Không thể tải thêm tệp tin.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Modals state
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [previewTab, setPreviewTab] = useState<'preview' | 'details'>('preview');
  const [renameItem, setRenameItem] = useState<DriveItem | null>(null);
  const [moveItem, setMoveItem] = useState<DriveItem | null>(null);
  const [copyItem, setCopyItem] = useState<DriveItem | null>(null);
  const [shareItem, setShareItem] = useState<DriveItem | null>(null);

  const handleOpenPreview = (item: DriveItem) => {
    setPreviewItem(item);
    setPreviewTab('preview');
  };

  const handleOpenDetails = (item: DriveItem) => {
    setPreviewItem(item);
    setPreviewTab('details');
  };

  // Folder navigation handler
  const handleOpenItem = (item: DriveItem) => {
    if (item.isFolder) {
      setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
      setSearchQuery('');
    } else if (item.mimeType.startsWith('application/vnd.google-apps.') && item.webViewLink) {
      window.open(item.webViewLink, '_blank', 'noopener,noreferrer');
    } else {
      handleOpenPreview(item);
    }
  };

  const handleNavigateBreadcrumb = (item: BreadcrumbItem, index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSearchQuery('');
  };

  const handleDownload = (item: DriveItem) => {
    if (item.mimeType.startsWith('application/vnd.google-apps.')) {
      setPreviewItem(item);
    } else {
      const url = driveApi.getContentUrl(selectedAccountId, item.id);
      window.open(url, '_blank');
    }
  };

  const handleDelete = async (item: DriveItem) => {
    const ok = await confirm({
      title: item.isFolder ? 'Xóa thư mục' : 'Xóa tệp tin',
      message: `Bạn có chắc muốn chuyển "${item.name}" vào thùng rác trên Google Drive?`,
      confirmText: 'Chuyển vào thùng rác',
      variant: 'danger',
    });

    if (ok) {
      try {
        await driveApi.trashFile(selectedAccountId, item.id, true);
        toast.success(`Đã chuyển "${item.name}" vào thùng rác.`);
        refetchFiles();
      } catch (err: any) {
        toast.error(err?.message || 'Không thể xóa mục trên Google Drive.');
      }
    }
  };

  const activeConnection = googleConnections.find((c) => c.id === selectedAccountId);

  const formatQuota = (used?: number | null, total?: number | null) => {
    if (!total || total <= 0) return '';
    const usedGb = ((used || 0) / (1024 * 1024 * 1024)).toFixed(1);
    const totalGb = (total / (1024 * 1024 * 1024)).toFixed(0);
    return `(${usedGb} GB / ${totalGb} GB)`;
  };

  if (loadingConnections) {
    return (
      <div className={styles.container}>
        <div style={{ backgroundColor: 'var(--color-surface)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
          <TableSkeleton rows={6} />
        </div>
      </div>
    );
  }

  if (googleConnections.length === 0) {
    return (
      <div className={styles.container}>
        <EmptyState
          title="Chưa có tài khoản Google Drive nào được kết nối"
          description="Để sử dụng tính năng duyệt và quản lý file Google Drive, bạn cần kết nối ít nhất một tài khoản Google Drive."
          action={
            <Button
              variant="primary"
              size="md"
              icon={<Cloud size={16} />}
              onClick={() => navigate('/app/connections')}
            >
              Kết nối Google Drive ngay
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header & Account Bar */}
      <div className={styles.headerBar}>
        <div className={styles.accountSection}>
          <div className={styles.accountIcon}>
            <HardDrive size={22} />
          </div>
          <div className={styles.accountTitleGroup}>
            <h1>Google Drive Explorer</h1>
            <div className={styles.accountSubtitle}>
              {activeConnection
                ? `${activeConnection.displayName} ${formatQuota(activeConnection.quotaUsageInDriveBytes, activeConnection.quotaTotalBytes)}`
                : 'Khám phá và quản lý tệp trên Google Drive'}
            </div>
          </div>
        </div>

        {/* Multi-account selector */}
        {googleConnections.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Tài khoản:</span>
            <select
              className={styles.accountSelect}
              value={selectedAccountId}
              onChange={(e) => handleSelectAccount(e.target.value)}
              aria-label="Chọn tài khoản Google Drive"
            >
              {googleConnections.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  📁 {acc.displayName || 'Google Drive'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Toolbar (Breadcrumbs + Actions + Search + View toggle) */}
      <DriveToolbar
        breadcrumbs={breadcrumbs}
        onNavigateBreadcrumb={handleNavigateBreadcrumb}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        layoutMode={layoutMode}
        onLayoutChange={handleLayoutChange}
        onCreateFolder={() => setCreateFolderOpen(true)}
        onUploadFile={() => setUploadModalOpen(true)}
        onRefresh={() => refetchFiles()}
        isRefreshing={fetchingFiles}
      />

      {/* Error alert */}
      {filesError && (
        <Alert
          type="error"
          message={(filesError as any)?.message || 'Không thể tải danh sách tệp tin từ Google Drive.'}
          action={
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => refetchFiles()}>
              Thử lại
            </Button>
          }
        />
      )}

      {/* Main Files Display */}
      {loadingFiles ? (
        layoutMode === 'list' ? (
          <div className={styles.tableWrapper}>
            <TableSkeleton rows={8} />
          </div>
        ) : (
          <GridSkeleton count={8} />
        )
      ) : allFiles.length === 0 ? (
        <EmptyState
          title={isSearching ? 'Không tìm thấy tệp nào phù hợp' : 'Thư mục này hiện đang trống'}
          description={
            isSearching
              ? 'Hãy thử thay đổi từ khóa tìm kiếm.'
              : 'Bạn có thể tải tệp lên hoặc tạo thư mục mới để bắt đầu.'
          }
          action={
            isSearching ? (
              <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                Xóa tìm kiếm
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setUploadModalOpen(true)}
              >
                Tải tệp tin lên
              </Button>
            )
          }
        />
      ) : (
        <>
          {layoutMode === 'list' ? (
            <DriveFileList
              files={allFiles}
              onOpenItem={handleOpenItem}
              onPreview={handleOpenPreview}
              onViewDetails={handleOpenDetails}
              onDownload={handleDownload}
              onRename={(item) => setRenameItem(item)}
              onMove={(item) => setMoveItem(item)}
              onCopy={(item) => setCopyItem(item)}
              onShare={(item) => setShareItem(item)}
              onDelete={handleDelete}
            />
          ) : (
            <DriveFileGrid
              files={allFiles}
              onOpenItem={handleOpenItem}
              onPreview={handleOpenPreview}
              onViewDetails={handleOpenDetails}
              onDownload={handleDownload}
              onRename={(item) => setRenameItem(item)}
              onMove={(item) => setMoveItem(item)}
              onCopy={(item) => setCopyItem(item)}
              onShare={(item) => setShareItem(item)}
              onDelete={handleDelete}
            />
          )}

          {/* Pagination / Load more */}
          {nextPageToken && (
            <div className={styles.loadMoreArea}>
              <Button
                variant="secondary"
                size="md"
                isLoading={loadingMore}
                onClick={handleLoadMore}
              >
                Tải thêm tệp tin...
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <DriveCreateFolderModal
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        accountId={selectedAccountId}
        parentId={currentFolderId}
        onSuccess={() => refetchFiles()}
      />

      <DriveUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        accountId={selectedAccountId}
        parentId={currentFolderId}
        onSuccess={() => refetchFiles()}
      />

      <DrivePreviewModal
        open={!!previewItem}
        onOpenChange={(isOpen) => !isOpen && setPreviewItem(null)}
        accountId={selectedAccountId}
        accountName={activeConnection?.displayName || 'Google Drive'}
        currentPath={breadcrumbs.map((b) => b.name).join(' > ')}
        item={previewItem}
        defaultTab={previewTab}
      />

      <DriveRenameModal
        open={!!renameItem}
        onOpenChange={(isOpen) => !isOpen && setRenameItem(null)}
        accountId={selectedAccountId}
        item={renameItem}
        onSuccess={() => refetchFiles()}
      />

      <DriveMoveModal
        open={!!moveItem}
        onOpenChange={(isOpen) => !isOpen && setMoveItem(null)}
        accountId={selectedAccountId}
        item={moveItem}
        onSuccess={() => refetchFiles()}
      />

      <DriveCopyModal
        open={!!copyItem}
        onOpenChange={(isOpen) => !isOpen && setCopyItem(null)}
        accountId={selectedAccountId}
        item={copyItem}
        onSuccess={() => refetchFiles()}
      />

      <DriveShareModal
        open={!!shareItem}
        onOpenChange={(isOpen) => !isOpen && setShareItem(null)}
        accountId={selectedAccountId}
        item={shareItem}
      />
    </div>
  );
};
