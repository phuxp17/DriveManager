import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
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

  const googleConnections = useMemo(
    () => connections.filter((c) => c.provider === 'GOOGLE' && c.status === 'CONNECTED'),
    [connections]
  );

  // Selected Account ID
  const urlAccountId = searchParams.get('accountId');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    if (googleConnections.length > 0) {
      if (urlAccountId && googleConnections.some((c) => c.id === urlAccountId)) {
        setSelectedAccountId(urlAccountId);
      } else if (!selectedAccountId || !googleConnections.some((c) => c.id === selectedAccountId)) {
        setSelectedAccountId(googleConnections[0].id);
      }
    } else {
      setSelectedAccountId('');
    }
  }, [googleConnections, urlAccountId, selectedAccountId]);

  const handleSelectAccount = (accId: string) => {
    setSelectedAccountId(accId);
    const next = new URLSearchParams(searchParams);
    next.set('accountId', accId);
    setSearchParams(next);
    // Reset path
    setBreadcrumbs([{ id: 'root', name: 'Drive của tôi' }]);
    setSearchQuery('');
  };

  const activeConnection = googleConnections.find((c) => c.id === selectedAccountId);

  // Detect whether connection was granted with drive.file only (cannot see existing Drive files)
  const isDriveFileOnly = Boolean(
    activeConnection?.grantedScopes &&
    !activeConnection.grantedScopes.includes('https://www.googleapis.com/auth/drive')
  );

  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async (connId?: string) => {
    const targetId = connId || selectedAccountId;
    if (!targetId) return;
    setIsReconnecting(true);
    try {
      const res = await connectionsApi.reconnectGoogle(targetId);
      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể khởi tạo liên kết cấp lại quyền Google Drive.');
      setIsReconnecting(false);
    }
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

  const currentRootView: 'root' | 'sharedWithMe' | 'all' =
    breadcrumbs[0]?.id === 'sharedWithMe'
      ? 'sharedWithMe'
      : breadcrumbs[0]?.id === 'all'
      ? 'all'
      : 'root';

  const handleSelectRootView = (view: 'root' | 'sharedWithMe' | 'all') => {
    const titles: Record<'root' | 'sharedWithMe' | 'all', string> = {
      root: 'Drive của tôi',
      sharedWithMe: 'Được chia sẻ',
      all: 'Tất cả tệp',
    };
    setBreadcrumbs([{ id: view, name: titles[view] }]);
    setSearchQuery('');
  };

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

      {/* Scope Restriction Warning Banner */}
      {isDriveFileOnly && (
        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <AlertTriangle size={24} color="var(--color-warning)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                Tài khoản đang bị giới hạn quyền truy cập (chỉ đọc tệp do ứng dụng tạo)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Tài khoản này được liên kết với quyền giới hạn (<code>drive.file</code>). Google chỉ cho phép hiển thị các tệp do ứng dụng này tải lên và <strong>ẩn toàn bộ các tệp có sẵn</strong> trên Google Drive của bạn. Vui lòng cấp lại quyền để xem toàn bộ tệp và thư mục.
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            isLoading={isReconnecting}
            onClick={() => handleReconnect()}
            style={{ flexShrink: 0 }}
          >
            Cấp lại quyền ngay (Re-authorize)
          </Button>
        </div>
      )}

      {/* Toolbar (Breadcrumbs + Actions + Search + View toggle) */}
      <DriveToolbar
        breadcrumbs={breadcrumbs}
        onNavigateBreadcrumb={handleNavigateBreadcrumb}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        layoutMode={layoutMode}
        onLayoutChange={handleLayoutChange}
        currentRootView={currentRootView}
        onSelectRootView={handleSelectRootView}
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
          title={
            isSearching
              ? 'Không tìm thấy tệp nào phù hợp'
              : isDriveFileOnly
              ? 'Chưa thể hiển thị tệp có sẵn trên Google Drive'
              : 'Thư mục này hiện đang trống'
          }
          description={
            isSearching
              ? 'Hãy thử thay đổi từ khóa tìm kiếm.'
              : isDriveFileOnly
              ? 'Tài khoản của bạn được cấp quyền giới hạn (drive.file). Google không cho phép ứng dụng đọc các tệp đã có từ trước trên Drive. Hãy bấm nút dưới đây để cấp lại quyền truy cập đầy đủ.'
              : currentRootView === 'root'
              ? 'Thư mục gốc "Drive của tôi" không có tệp nào. Bạn có thể bấm "Xem tất cả tệp" để duyệt tất cả tệp nằm trong các thư mục con hoặc tải tệp mới lên.'
              : 'Không có tệp nào trong mục này.'
          }
          action={
            isSearching ? (
              <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                Xóa tìm kiếm
              </Button>
            ) : isDriveFileOnly ? (
              <Button
                variant="primary"
                size="sm"
                isLoading={isReconnecting}
                onClick={() => handleReconnect()}
              >
                Cấp lại quyền Google Drive ngay
              </Button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {currentRootView === 'root' && (
                  <Button variant="secondary" size="sm" onClick={() => handleSelectRootView('all')}>
                    Xem tất cả tệp trong Drive
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={16} />}
                  onClick={() => setUploadModalOpen(true)}
                >
                  Tải tệp tin lên
                </Button>
              </div>
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
