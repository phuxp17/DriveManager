import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Clock,
  Filter,
  FolderOpen,
  Grid,
  Inbox,
  LayoutList,
  Plus,
  RefreshCw,
  Share2,
  Star,
  Tag as TagIcon,
  Trash2,
} from 'lucide-react';
import { connectionsApi } from '../../api/connectionsApi';
import { itemsApi } from '../../api/itemsApi';
import { lifecycleApi } from '../../api/lifecycleApi';
import { tagsApi } from '../../api/tagsApi';
import { ItemEntry, LibraryView } from '../../api/types';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { GridSkeleton, TableSkeleton } from '../../components/common/Skeleton';
import { CreateLinkModal } from '../../components/items/CreateLinkModal';
import { ItemCard } from '../../components/items/ItemCard';
import { ItemDetailDrawer } from '../../components/items/ItemDetailDrawer';
import { ItemTableRow } from '../../components/items/ItemTableRow';
import { MembershipDialog } from '../../components/items/MembershipDialog';
import { ShareModal } from '../../components/shares/ShareModal';
import { toast } from '../../components/common/Toast';
import { confirm } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

export const ExplorerPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state
  const view = (searchParams.get('view') as LibraryView) || 'active';
  const page = parseInt(searchParams.get('page') || '0', 10);
  const size = parseInt(searchParams.get('size') || '20', 10);
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || '';
  const sort = searchParams.get('sort') as 'added' | 'modified' | undefined;
  const tagParam = searchParams.get('tags') || '';
  const connectionId = searchParams.get('connectionId') || '';

  // View preference: 'list' | 'grid'
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('dm_layout_pref') as 'list' | 'grid') || 'list';
  });

  const handleLayoutChange = (mode: 'list' | 'grid') => {
    setLayoutMode(mode);
    localStorage.setItem('dm_layout_pref', mode);
  };

  // Dialogs state
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [membershipItem, setMembershipItem] = useState<ItemEntry | null>(null);
  const [shareTargetItem, setShareTargetItem] = useState<ItemEntry | null>(null);
  const [createLinkOpen, setCreateLinkOpen] = useState(false);

  // TanStack Query: Fetch items (BUG-003, BUG-004, MISS-003)
  const {
    data,
    isLoading,
    error: queryError,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ['items', { view, page, size, q, type, sort, tags: tagParam, connectionId }],
    queryFn: ({ signal }) =>
      itemsApi.list(
        {
          view,
          page,
          size,
          q: q || undefined,
          type: type || undefined,
          sort: sort || undefined,
          tags: tagParam ? [tagParam] : undefined,
          connectionId: connectionId || undefined,
        },
        signal
      ),
  });

  // TanStack Query: Fetch tags list for filter (MISS-002)
  const { data: tagsList } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  });

  // TanStack Query: Fetch connections list for filter
  const { data: connectionsList } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list(),
  });

  // Mutations for lifecycle actions
  const invalidateItems = () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
  };

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorited }: { id: string; isFavorited: boolean }) =>
      isFavorited ? lifecycleApi.unfavorite(id) : lifecycleApi.favorite(id),
    onSuccess: invalidateItems,
    onError: (err: any) => toast.error(err?.message || 'Không thể cập nhật yêu thích.'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, isReviewed }: { id: string; isReviewed: boolean }) =>
      isReviewed ? lifecycleApi.inbox(id) : lifecycleApi.review(id),
    onSuccess: invalidateItems,
    onError: (err: any) => toast.error(err?.message || 'Không thể cập nhật trạng thái xem xét.'),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      isArchived ? lifecycleApi.unarchive(id) : lifecycleApi.archive(id),
    onSuccess: invalidateItems,
    onError: (err: any) => toast.error(err?.message || 'Không thể cập nhật trạng thái lưu trữ.'),
  });

  const trashMutation = useMutation({
    mutationFn: (id: string) => lifecycleApi.trash(id),
    onSuccess: () => {
      invalidateItems();
      toast.success('Đã chuyển mục vào thùng rác.');
    },
    onError: (err: any) => toast.error(err?.message || 'Không thể chuyển vào thùng rác.'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => lifecycleApi.restore(id),
    onSuccess: () => {
      invalidateItems();
      toast.success('Đã khôi phục mục thành công.');
    },
    onError: (err: any) => toast.error(err?.message || 'Không thể khôi phục mục.'),
  });

  const purgeMutation = useMutation({
    mutationFn: (id: string) => lifecycleApi.purge(id),
    onSuccess: () => {
      invalidateItems();
      toast.success('Đã xóa vĩnh viễn mục.');
    },
    onError: (err: any) => toast.error(err?.message || 'Không thể xóa vĩnh viễn mục.'),
  });

  // URL Helpers
  const updateQuery = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set('page', '0');
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', newPage.toString());
    setSearchParams(next);
  };

  const handleSizeChange = (newSize: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('size', newSize.toString());
    next.set('page', '0');
    setSearchParams(next);
  };

  // Lifecycle Action Handlers
  const handleOpenItem = async (item: ItemEntry) => {
    try {
      await lifecycleApi.recordOpen(item.id);
      queryClient.invalidateQueries({ queryKey: ['items', 'recent'] });
    } catch {
      // ignore
    }

    const targetUrl = item.driveUrl || (item.storageFileId ? `https://drive.google.com/file/d/${item.storageFileId}/view` : item.url);
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.open(itemsApi.getContentUrl(item.id), '_blank');
    }
  };

  const handleDownloadItem = (item: ItemEntry) => {
    window.open(itemsApi.getContentUrl(item.id), '_blank');
  };

  const handleToggleFavorite = (item: ItemEntry) => {
    favoriteMutation.mutate({ id: item.id, isFavorited: !!item.favoritedAt });
  };

  const handleToggleReview = (item: ItemEntry) => {
    reviewMutation.mutate({ id: item.id, isReviewed: !!item.reviewedAt });
  };

  const handleToggleArchive = (item: ItemEntry) => {
    archiveMutation.mutate({ id: item.id, isArchived: !!item.archivedAt });
  };

  const handleTrash = async (item: ItemEntry) => {
    const isDriveFile = item.type !== 'LINK' && (item.storageFileId || item.driveUrl);
    const ok = await confirm({
      title: 'Chuyển vào thùng rác',
      message: isDriveFile
        ? `Bạn có chắc muốn chuyển tệp "${item.name}" vào thùng rác? Tệp cũng sẽ được chuyển vào thùng rác trên Google Drive.`
        : `Bạn có chắc muốn chuyển mục "${item.name}" vào thùng rác?`,
      confirmText: 'Chuyển vào thùng rác',
      variant: 'warning',
    });
    if (ok) {
      trashMutation.mutate(item.id);
    }
  };

  // Confirmation dialog for restore (MISS-010)
  const handleRestore = async (item: ItemEntry) => {
    const ok = await confirm({
      title: 'Khôi phục mục',
      message: `Xác nhận khôi phục mục "${item.name}" về thư viện hoạt động?`,
      confirmText: 'Khôi phục',
      variant: 'primary',
    });
    if (ok) {
      restoreMutation.mutate(item.id);
    }
  };

  const handlePurge = async (item: ItemEntry) => {
    const isDriveFile = item.type !== 'LINK' && (item.storageFileId || item.driveUrl);
    const ok = await confirm({
      title: isDriveFile ? 'Xóa vĩnh viễn khỏi Google Drive' : 'Xóa vĩnh viễn mục',
      message: isDriveFile
        ? `Xác nhận xóa VĨNH VIỄN tệp "${item.name}"? Tệp này sẽ bị xóa hoàn toàn khỏi tài khoản Google Drive và hệ thống, không thể khôi phục.`
        : `Xác nhận xóa VĨNH VIỄN mục "${item.name}"? Thao tác này sẽ xóa toàn bộ liên kết, tệp và dữ liệu liên quan và không thể khôi phục.`,
      confirmText: isDriveFile ? 'Xóa vĩnh viễn khỏi Drive' : 'Xóa vĩnh viễn',
      variant: 'danger',
    });
    if (ok) {
      purgeMutation.mutate(item.id);
    }
  };

  const actionHandlers = {
    onOpen: handleOpenItem,
    onDownload: handleDownloadItem,
    onViewDetails: (item: ItemEntry) => setDetailItemId(item.id),
    onToggleFavorite: handleToggleFavorite,
    onToggleReview: handleToggleReview,
    onToggleArchive: handleToggleArchive,
    onTrash: handleTrash,
    onRestore: handleRestore,
    onPurge: handlePurge,
    onManageMemberships: (item: ItemEntry) => setMembershipItem(item),
    onShare: (item: ItemEntry) => setShareTargetItem(item),
  };

  const viewTitles: Record<LibraryView, { title: string; desc: string; icon: React.ReactNode }> = {
    active: {
      title: 'Tất cả mục',
      desc: 'Toàn bộ liên kết và tệp tin đang hoạt động của bạn',
      icon: <BookOpen size={22} color="var(--color-primary)" />,
    },
    inbox: {
      title: 'Hộp thư đến (Inbox)',
      desc: 'Các mục mới thêm cần bạn xem xét và phân loại',
      icon: <Inbox size={22} color="var(--color-warning)" />,
    },
    uncategorized: {
      title: 'Chưa phân loại',
      desc: 'Các mục chưa được gán vào bất kỳ bộ sưu tập nào',
      icon: <FolderOpen size={22} color="var(--color-text-muted)" />,
    },
    favorites: {
      title: 'Mục yêu thích',
      desc: 'Danh sách các liên kết và tệp tin được bạn đánh dấu sao',
      icon: <Star size={22} color="#EAB308" />,
    },
    recent: {
      title: 'Mở gần đây',
      desc: 'Lịch sử các liên kết và tệp tin được bạn mở gần đây',
      icon: <Clock size={22} color="var(--color-primary)" />,
    },
    shared: {
      title: 'Được chia sẻ với tôi',
      desc: 'Các tài nguyên được người dùng khác chia sẻ quyền xem',
      icon: <Share2 size={22} color="var(--color-primary)" />,
    },
    archive: {
      title: 'Kho lưu trữ',
      desc: 'Các tài liệu, liên kết ít sử dụng được cất giữ ngăn nắp',
      icon: <Archive size={22} color="var(--color-text-muted)" />,
    },
    trash: {
      title: 'Thùng rác',
      desc: 'Mục đã xóa tạm thời. Bạn có thể khôi phục hoặc xóa vĩnh viễn',
      icon: <Trash2 size={22} color="var(--color-danger)" />,
    },
  };

  const currentInfo = viewTitles[view] || viewTitles.active;
  const hasFilter = !!(type || sort || q || tagParam || connectionId);
  const errorMessage = queryError ? (queryError as any)?.message || 'Không thể tải danh sách mục.' : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {currentInfo.icon}
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
              {currentInfo.title}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {currentInfo.desc}
            </p>
          </div>
        </div>

        {view === 'inbox' && data && data.totalElements > 0 && (
          <Button
            variant="secondary"
            size="sm"
            icon={<CheckCircle2 size={16} />}
            onClick={async () => {
              const ok = await confirm({
                title: 'Đánh dấu đã xem xét',
                message: 'Xác nhận đánh dấu toàn bộ mục trong trang hiện tại là ĐÃ XEM XÉT?',
                confirmText: 'Đánh dấu tất cả',
                variant: 'primary',
              });
              if (ok) {
                for (const item of data.content) {
                  if (!item.reviewedAt) {
                    try {
                      await lifecycleApi.review(item.id);
                    } catch {
                      // ignore
                    }
                  }
                }
                invalidateItems();
                toast.success('Đã cập nhật trạng thái xem xét cho toàn bộ trang.');
              }
            }}
          >
            Đánh dấu đã duyệt trang này
          </Button>
        )}
      </div>

      {/* Toolbar: Filters & View Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '10px 14px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {/* Filter controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            <Filter size={14} />
            <span>Lọc:</span>
          </div>

          {/* Storage Connection Filter */}
          {connectionsList && connectionsList.length > 0 && (
            <select
              value={connectionId}
              onChange={(e) => updateQuery('connectionId', e.target.value || null)}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                fontSize: '13px',
                maxWidth: '200px',
              }}
              aria-label="Lọc theo tài khoản lưu trữ"
            >
              <option value="">Tất cả tài khoản Drive</option>
              {connectionsList.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  📁 {conn.displayName || 'Google Drive'}
                </option>
              ))}
            </select>
          )}

          {/* Type filter (MISS-005 - Added NOTE) */}
          <select
            value={type}
            onChange={(e) => updateQuery('type', e.target.value || null)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              fontSize: '13px',
            }}
            aria-label="Lọc theo loại tệp"
          >
            <option value="">Tất cả định dạng</option>
            <option value="LINK">Liên kết (LINK)</option>
            <option value="FILE">Tệp tin (FILE)</option>
            <option value="DOCUMENT">Tài liệu (PDF/DOC)</option>
            <option value="IMAGE">Hình ảnh (IMAGE)</option>
            <option value="VIDEO">Video (VIDEO)</option>
            <option value="AUDIO">Âm thanh (AUDIO)</option>
            <option value="NOTE">Ghi chú (NOTE)</option>
            <option value="ARCHIVE">Tệp nén (ARCHIVE)</option>
          </select>

          {/* Tags filter UI (MISS-002) */}
          <select
            value={tagParam}
            onChange={(e) => updateQuery('tags', e.target.value || null)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              fontSize: '13px',
            }}
            aria-label="Lọc theo thẻ (tag)"
          >
            <option value="">Tất cả thẻ (Tags)</option>
            {(tagsList || []).map((t) => (
              <option key={t.id} value={t.name}>
                Thẻ: {t.name}
              </option>
            ))}
          </select>

          {/* Sort selector */}
          <select
            value={sort || ''}
            onChange={(e) => updateQuery('sort', e.target.value || null)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              fontSize: '13px',
            }}
            aria-label="Sắp xếp theo"
          >
            <option value="">Sắp xếp mặc định</option>
            <option value="added">Thời gian thêm mới</option>
            <option value="modified">Thời gian chỉnh sửa</option>
          </select>

          {hasFilter && (
            <button
              onClick={() => {
                const next = new URLSearchParams();
                next.set('view', view);
                setSearchParams(next);
              }}
              style={{
                fontSize: '12px',
                color: 'var(--color-primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* View layout toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => handleLayoutChange('list')}
            className={`iconBtn ${layoutMode === 'list' ? 'active' : ''}`}
            aria-label="Hiển thị dạng bảng"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: layoutMode === 'list' ? 'var(--color-primary-subtle)' : 'transparent',
              color: layoutMode === 'list' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              border: '1px solid',
              borderColor: layoutMode === 'list' ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            <LayoutList size={16} />
          </button>

          <button
            onClick={() => handleLayoutChange('grid')}
            aria-label="Hiển thị dạng lưới"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: layoutMode === 'grid' ? 'var(--color-primary-subtle)' : 'transparent',
              color: layoutMode === 'grid' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              border: '1px solid',
              borderColor: layoutMode === 'grid' ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            <Grid size={16} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <Alert
          type="error"
          message={errorMessage}
          action={
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => refetchItems()}>
              Thử lại
            </Button>
          }
        />
      )}

      {/* Main List / Grid Display */}
      {isLoading ? (
        layoutMode === 'list' ? (
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <TableSkeleton rows={8} />
          </div>
        ) : (
          <GridSkeleton count={8} />
        )
      ) : !data || data.content.length === 0 ? (
        <EmptyState
          title={hasFilter ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có mục nào trong danh sách này'}
          description={
            hasFilter
              ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ các bộ lọc đang chọn.'
              : 'Bạn có thể bắt đầu bằng việc lưu liên kết web hoặc tải tệp tin lên.'
          }
          action={
            hasFilter ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const next = new URLSearchParams();
                  next.set('view', view);
                  setSearchParams(next);
                }}
              >
                Xóa tất cả bộ lọc
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setCreateLinkOpen(true)}
              >
                Thêm liên kết mới
              </Button>
            )
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {layoutMode === 'list' ? (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
              }}
            >
              {/* Table header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px minmax(200px, 3fr) 100px 140px 140px 110px',
                  gap: '12px',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-bg)',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <div></div>
                <div>Tên mục / Liên kết</div>
                <div>Loại</div>
                <div>Trạng thái</div>
                <div>Ngày tạo</div>
                <div style={{ textAlign: 'right' }}>Thao tác</div>
              </div>

              {data.content.map((item) => (
                <ItemTableRow
                  key={item.id}
                  item={item}
                  currentUserId={user?.id}
                  actions={actionHandlers}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {data.content.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  currentUserId={user?.id}
                  actions={actionHandlers}
                />
              ))}
            </div>
          )}

          {/* Pagination with size change selector */}
          <Pagination
            page={data.page}
            size={data.size}
            totalElements={data.totalElements}
            totalPages={data.totalPages}
            onPageChange={handlePageChange}
            onSizeChange={handleSizeChange}
          />
        </div>
      )}

      {/* Item Detail Drawer */}
      <ItemDetailDrawer
        itemId={detailItemId}
        currentUserId={user?.id}
        onClose={() => setDetailItemId(null)}
        onUpdated={invalidateItems}
      />

      {/* Membership Dialog */}
      <MembershipDialog
        item={membershipItem}
        onClose={() => setMembershipItem(null)}
        onUpdated={invalidateItems}
      />

      {/* Share Modal */}
      {shareTargetItem && (
        <ShareModal
          open={!!shareTargetItem}
          onOpenChange={(open) => {
            if (!open) setShareTargetItem(null);
          }}
          targetType="ITEM"
          targetId={shareTargetItem.id}
          targetName={shareTargetItem.name}
          onSuccess={invalidateItems}
        />
      )}

      {/* Create Link Modal */}
      <CreateLinkModal
        open={createLinkOpen}
        onOpenChange={setCreateLinkOpen}
        onSuccess={invalidateItems}
      />
    </div>
  );
};
