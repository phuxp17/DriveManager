import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  Edit2,
  Folder,
  FolderOpen,
  FolderPlus,
  Home,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
} from 'lucide-react';
import { collectionsApi } from '../../api/collectionsApi';
import { itemsApi } from '../../api/itemsApi';
import { lifecycleApi } from '../../api/lifecycleApi';
import { Collection, ItemEntry } from '../../api/types';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { TableSkeleton } from '../../components/common/Skeleton';
import { CollectionModal } from '../../components/collections/CollectionModal';
import { ItemDetailDrawer } from '../../components/items/ItemDetailDrawer';
import { ItemTableRow } from '../../components/items/ItemTableRow';
import { MembershipDialog } from '../../components/items/MembershipDialog';
import { ShareModal } from '../../components/shares/ShareModal';
import { toast } from '../../components/common/Toast';
import { confirm } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

export const CollectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '0', 10);
  const size = parseInt(searchParams.get('size') || '20', 10);

  // Modal states
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [membershipItem, setMembershipItem] = useState<ItemEntry | null>(null);
  const [shareTargetItem, setShareTargetItem] = useState<ItemEntry | null>(null);
  const [shareCollectionOpen, setShareCollectionOpen] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionModalMode, setCollectionModalMode] = useState<'create' | 'rename'>('rename');

  // TanStack Queries (BUG-003)
  const {
    data: collection,
    isLoading: isColLoading,
    error: colError,
  } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => collectionsApi.get(id!),
    enabled: !!id,
  });

  const { data: ancestors = [] } = useQuery({
    queryKey: ['collection', id, 'ancestors'],
    queryFn: () => collectionsApi.ancestors(id!),
    enabled: !!id,
  });

  const { data: subCollections = [] } = useQuery({
    queryKey: ['collection', id, 'children'],
    queryFn: () => collectionsApi.list(id!),
    enabled: !!id,
  });

  const {
    data: itemsData,
    isLoading: isItemsLoading,
    error: itemsError,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ['items', { collectionId: id, page, size }],
    queryFn: ({ signal }) => itemsApi.list({ collectionId: id, page, size }, signal),
    enabled: !!id,
  });

  const isLoading = isColLoading || isItemsLoading;
  const error = colError
    ? (colError as any)?.message || 'Không thể tải thông tin bộ sưu tập.'
    : itemsError
    ? (itemsError as any)?.message || 'Không thể tải danh sách mục.'
    : null;

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['collection', id] });
    queryClient.invalidateQueries({ queryKey: ['items'] });
  };

  const deleteCollectionMutation = useMutation({
    mutationFn: (colId: string) => collectionsApi.delete(colId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Đã xóa bộ sưu tập thành công.');
      navigate('/app/library');
    },
    onError: (err: any) => toast.error(err?.message || 'Không thể xóa bộ sưu tập.'),
  });

  const handleDelete = async () => {
    if (!collection) return;
    const ok = await confirm({
      title: 'Xóa bộ sưu tập',
      message: `Xác nhận xóa bộ sưu tập "${collection.name}"? Các mục thuộc bộ sưu tập này vẫn được giữ nguyên và con trực tiếp sẽ được chuyển lên cấp trên.`,
      confirmText: 'Xóa bộ sưu tập',
      variant: 'danger',
    });
    if (ok) {
      deleteCollectionMutation.mutate(collection.id);
    }
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

  // Lifecycle Action Handlers (BUG-006)
  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorited }: { id: string; isFavorited: boolean }) =>
      isFavorited ? lifecycleApi.unfavorite(id) : lifecycleApi.favorite(id),
    onSuccess: refreshAll,
    onError: (err: any) => toast.error(err?.message || 'Lỗi cập nhật yêu thích'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, isReviewed }: { id: string; isReviewed: boolean }) =>
      isReviewed ? lifecycleApi.inbox(id) : lifecycleApi.review(id),
    onSuccess: refreshAll,
    onError: (err: any) => toast.error(err?.message || 'Lỗi cập nhật trạng thái xem xét'),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      isArchived ? lifecycleApi.unarchive(id) : lifecycleApi.archive(id),
    onSuccess: refreshAll,
    onError: (err: any) => toast.error(err?.message || 'Lỗi cập nhật trạng thái lưu trữ'),
  });

  const trashMutation = useMutation({
    mutationFn: (itemId: string) => lifecycleApi.trash(itemId),
    onSuccess: () => {
      refreshAll();
      toast.success('Đã chuyển mục vào thùng rác.');
    },
    onError: (err: any) => toast.error(err?.message || 'Lỗi chuyển vào thùng rác'),
  });

  const restoreMutation = useMutation({
    mutationFn: (itemId: string) => lifecycleApi.restore(itemId),
    onSuccess: () => {
      refreshAll();
      toast.success('Đã khôi phục mục thành công.');
    },
    onError: (err: any) => toast.error(err?.message || 'Lỗi khôi phục mục'),
  });

  const purgeMutation = useMutation({
    mutationFn: (itemId: string) => lifecycleApi.purge(itemId),
    onSuccess: () => {
      refreshAll();
      toast.success('Đã xóa vĩnh viễn mục.');
    },
    onError: (err: any) => toast.error(err?.message || 'Lỗi xóa vĩnh viễn mục'),
  });

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
    const ok = await confirm({
      title: 'Chuyển vào thùng rác',
      message: `Bạn có chắc muốn chuyển mục "${item.name}" vào thùng rác?`,
      confirmText: 'Chuyển vào thùng rác',
      variant: 'warning',
    });
    if (ok) {
      trashMutation.mutate(item.id);
    }
  };

  const handleRestore = async (item: ItemEntry) => {
    const ok = await confirm({
      title: 'Khôi phục mục',
      message: `Xác nhận khôi phục mục "${item.name}"?`,
      confirmText: 'Khôi phục',
      variant: 'primary',
    });
    if (ok) {
      restoreMutation.mutate(item.id);
    }
  };

  const handlePurge = async (item: ItemEntry) => {
    const ok = await confirm({
      title: 'Xóa vĩnh viễn mục',
      message: `Xác nhận xóa VĨNH VIỄN mục "${item.name}"? Thao tác này sẽ xóa toàn bộ dữ liệu liên quan và không thể khôi phục.`,
      confirmText: 'Xóa vĩnh viễn',
      variant: 'danger',
    });
    if (ok) {
      purgeMutation.mutate(item.id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          flexWrap: 'wrap',
        }}
      >
        <Link to="/app/library" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)' }}>
          <Home size={14} />
          <span>Thư viện</span>
        </Link>

        {ancestors.map((anc) => (
          <React.Fragment key={anc.id}>
            <ChevronRight size={14} />
            <Link to={`/app/collections/${anc.id}`} style={{ color: 'var(--color-text-muted)' }}>
              {anc.name}
            </Link>
          </React.Fragment>
        ))}

        {collection && (
          <>
            <ChevronRight size={14} />
            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{collection.name}</span>
          </>
        )}
      </nav>

      {/* Collection Header */}
      {collection && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: 'var(--color-surface)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderOpen size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
                {collection.name}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                {itemsData?.totalElements || 0} mục &bull; {subCollections.length} bộ sưu tập con
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<FolderPlus size={16} />}
              onClick={() => {
                setCollectionModalMode('create');
                setCollectionModalOpen(true);
              }}
            >
              Tạo bộ sưu tập con
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Share2 size={16} />}
              onClick={() => setShareCollectionOpen(true)}
            >
              Chia sẻ (VIEW)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Edit2 size={14} />}
              onClick={() => {
                setCollectionModalMode('rename');
                setCollectionModalOpen(true);
              }}
            >
              Đổi tên
            </Button>

            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={handleDelete}
            >
              Xóa
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert
          type="error"
          message={error}
          action={
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => refreshAll()}>
              Thử lại
            </Button>
          }
        />
      )}

      {/* Sub-collections grid */}
      {subCollections.length > 0 && (
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '10px' }}>
            Bộ sưu tập con
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            {subCollections.map((sub) => (
              <Link
                key={sub.id}
                to={`/app/collections/${sub.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <Folder size={18} color="var(--color-primary)" />
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sub.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Items list */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '10px' }}>
          Các mục trong bộ sưu tập
        </h3>

        {isLoading ? (
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <TableSkeleton rows={5} />
          </div>
        ) : !itemsData || itemsData.content.length === 0 ? (
          <EmptyState
            title="Bộ sưu tập này chưa có mục nào"
            description="Bạn có thể gán các liên kết hoặc tệp tin vào bộ sưu tập này từ trang Thư viện."
          />
        ) : (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}
          >
            {itemsData.content.map((item) => (
              <ItemTableRow
                key={item.id}
                item={item}
                currentUserId={user?.id}
                actions={{
                  onOpen: handleOpenItem,
                  onDownload: (i) => window.open(itemsApi.getContentUrl(i.id), '_blank'),
                  onViewDetails: (i) => setDetailItemId(i.id),
                  onToggleFavorite: handleToggleFavorite,
                  onToggleReview: handleToggleReview,
                  onToggleArchive: handleToggleArchive,
                  onTrash: handleTrash,
                  onRestore: handleRestore,
                  onPurge: handlePurge,
                  onManageMemberships: (i) => setMembershipItem(i),
                  onShare: (i) => setShareTargetItem(i),
                }}
              />
            ))}

            <Pagination
              page={itemsData.page}
              size={itemsData.size}
              totalElements={itemsData.totalElements}
              totalPages={itemsData.totalPages}
              onPageChange={handlePageChange}
              onSizeChange={handleSizeChange}
            />
          </div>
        )}
      </div>

      {/* Item detail */}
      <ItemDetailDrawer
        itemId={detailItemId}
        currentUserId={user?.id}
        onClose={() => setDetailItemId(null)}
        onUpdated={refreshAll}
      />

      {/* Membership Dialog */}
      <MembershipDialog
        item={membershipItem}
        onClose={() => setMembershipItem(null)}
        onUpdated={refreshAll}
      />

      {/* Share item modal */}
      {shareTargetItem && (
        <ShareModal
          open={!!shareTargetItem}
          onOpenChange={(open) => {
            if (!open) setShareTargetItem(null);
          }}
          targetType="ITEM"
          targetId={shareTargetItem.id}
          targetName={shareTargetItem.name}
          onSuccess={refreshAll}
        />
      )}

      {/* Share collection modal */}
      {collection && (
        <ShareModal
          open={shareCollectionOpen}
          onOpenChange={setShareCollectionOpen}
          targetType="COLLECTION"
          targetId={collection.id}
          targetName={collection.name}
          onSuccess={refreshAll}
        />
      )}

      {/* Collection rename / add sub-collection modal */}
      {collection && (
        <CollectionModal
          open={collectionModalOpen}
          onOpenChange={setCollectionModalOpen}
          mode={collectionModalMode}
          targetCollection={collectionModalMode === 'rename' ? collection : null}
          parentCollection={collectionModalMode === 'create' ? collection : null}
          onSuccess={refreshAll}
        />
      )}
    </div>
  );
};
