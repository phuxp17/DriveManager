import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, GitMerge, Plus, RefreshCw, Tag as TagIcon, Trash2 } from 'lucide-react';
import { tagsApi } from '../../api/tagsApi';
import { Tag } from '../../api/types';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { TagBadge } from '../../components/tags/TagBadge';
import { TagMergeModal } from '../../components/tags/TagMergeModal';
import { TagModal } from '../../components/tags/TagModal';
import { toast } from '../../components/common/Toast';
import { confirm } from '../../components/common/ConfirmDialog';

export const TagsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modals
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagModalMode, setTagModalMode] = useState<'create' | 'rename'>('create');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeSourceTag, setMergeSourceTag] = useState<Tag | null>(null);

  // TanStack Query for tags (BUG-003)
  const {
    data: tags = [],
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  });

  const invalidateTags = () => {
    queryClient.invalidateQueries({ queryKey: ['tags'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (tagId: string) => tagsApi.delete(tagId),
    onSuccess: () => {
      invalidateTags();
      toast.success('Đã xóa thẻ thành công.');
    },
    onError: (err: any) => toast.error(err?.message || 'Không thể xóa thẻ.'),
  });

  const handleDelete = async (tag: Tag) => {
    const ok = await confirm({
      title: 'Xóa thẻ',
      message: `Bạn có chắc muốn xóa thẻ "${tag.name}"? Các mục được gán thẻ này sẽ không bị xóa.`,
      confirmText: 'Xóa thẻ',
      variant: 'danger',
    });
    if (ok) {
      deleteMutation.mutate(tag.id);
    }
  };

  const error = queryError ? (queryError as any)?.message || 'Không thể tải danh sách thẻ.' : null;

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
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TagIcon size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
              Quản lý Thẻ (Tags)
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Phân loại mục theo các nhãn chủ đề và gộp thẻ khi cần sắp xếp lại
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={16} />}
          onClick={() => {
            setTagModalMode('create');
            setSelectedTag(null);
            setTagModalOpen(true);
          }}
        >
          Tạo thẻ mới
        </Button>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          action={
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => refetch()}>
              Thử lại
            </Button>
          }
        />
      )}

      {/* Tags list with Skeleton */}
      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '14px',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Skeleton width="120px" height="24px" borderRadius="var(--radius-full)" />
              <div style={{ display: 'flex', gap: '6px' }}>
                <Skeleton width="24px" height="24px" borderRadius="var(--radius-sm)" />
                <Skeleton width="24px" height="24px" borderRadius="var(--radius-sm)" />
              </div>
            </div>
          ))}
        </div>
      ) : tags.length === 0 ? (
        <EmptyState
          icon={<TagIcon size={28} />}
          title="Chưa có thẻ nào"
          description="Tạo thẻ đầu tiên để gắn nhãn phân loại cho các tài liệu và liên kết của bạn."
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => {
                setTagModalMode('create');
                setSelectedTag(null);
                setTagModalOpen(true);
              }}
            >
              Tạo thẻ mới
            </Button>
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '14px',
          }}
        >
          {tags.map((tag) => (
            <div
              key={tag.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              <div
                style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
                onClick={() => navigate(`/app/library?tags=${encodeURIComponent(tag.name)}`)}
                title="Nhấn để xem các mục được gắn thẻ này"
              >
                <TagBadge tag={tag} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => {
                    setMergeSourceTag(tag);
                    setMergeModalOpen(true);
                  }}
                  title="Gộp thẻ vào thẻ khác"
                  aria-label="Gộp thẻ"
                  style={{
                    padding: '6px',
                    color: 'var(--color-text-muted)',
                    background: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  <GitMerge size={14} />
                </button>

                <button
                  onClick={() => {
                    setSelectedTag(tag);
                    setTagModalMode('rename');
                    setTagModalOpen(true);
                  }}
                  title="Chỉnh sửa thẻ"
                  aria-label="Chỉnh sửa thẻ"
                  style={{
                    padding: '6px',
                    color: 'var(--color-text-muted)',
                    background: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  <Edit2 size={14} />
                </button>

                <button
                  onClick={() => handleDelete(tag)}
                  title="Xóa thẻ"
                  aria-label="Xóa thẻ"
                  disabled={deleteMutation.isPending}
                  style={{
                    padding: '6px',
                    color: 'var(--color-danger)',
                    background: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tag Modal (Create / Rename) */}
      <TagModal
        open={tagModalOpen}
        onOpenChange={setTagModalOpen}
        mode={tagModalMode}
        targetTag={selectedTag}
        onSuccess={invalidateTags}
      />

      {/* Tag Merge Modal */}
      <TagMergeModal
        open={mergeModalOpen}
        onOpenChange={setMergeModalOpen}
        sourceTag={mergeSourceTag}
        allTags={tags}
        onSuccess={invalidateTags}
      />
    </div>
  );
};
