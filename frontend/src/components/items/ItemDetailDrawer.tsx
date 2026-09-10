import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  FileCheck,
  FileText,
  Globe,
  HardDrive,
  RefreshCw,
  Save,
  Tag as TagIcon,
  X,
} from 'lucide-react';
import { itemsApi } from '../../api/itemsApi';
import { lifecycleApi } from '../../api/lifecycleApi';
import { ItemDetail } from '../../api/types';
import { formatBytes, formatDateTime } from '../../utils/dateUtils';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { Input, Textarea } from '../common/Input';
import { Modal } from '../common/Modal';
import { Skeleton } from '../common/Skeleton';
import { ItemTypeIcon } from './ItemTypeIcon';

interface ItemDetailDrawerProps {
  itemId: string | null;
  currentUserId?: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export const ItemDetailDrawer: React.FC<ItemDetailDrawerProps> = ({
  itemId,
  currentUserId,
  onClose,
  onUpdated,
}) => {
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const fetchDetail = async (id: string) => {
    setIsLoading(true);
    setError(null);
    setConflictError(null);
    try {
      const data = await itemsApi.get(id);
      setItem(data);
      setEditName(data.name);
      setEditDescription(data.description || '');
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thông tin chi tiết mục này.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (itemId) {
      setIsEditing(false);
      fetchDetail(itemId);
    } else {
      setItem(null);
    }
  }, [itemId]);

  if (!itemId) return null;

  const isOwner = !currentUserId || !item || currentUserId === item.ownerId;

  const handleOpenContent = async () => {
    if (!item) return;
    try {
      await lifecycleApi.recordOpen(item.id);
    } catch {
      // ignore
    }

    if (item.type === 'LINK' && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      const downloadUrl = itemsApi.getContentUrl(item.id);
      window.open(downloadUrl, '_blank');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setIsSaving(true);
    setConflictError(null);

    try {
      const updated = await itemsApi.patch(item.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        expectedVersion: item.version,
      });

      setItem(updated);
      setIsEditing(false);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      if (err?.status === 409) {
        setConflictError(
          'Mục này đã bị thay đổi ở một phiên làm việc khác (Xung đột phiên bản). Bản nháp của bạn vẫn được giữ lại bên dưới. Bạn có thể kiểm tra lại trước khi lưu.'
        );
      } else {
        setError(err?.message || 'Không thể lưu thay đổi.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReloadLatestVersion = async () => {
    if (!itemId) return;
    try {
      const latest = await itemsApi.get(itemId);
      setItem(latest);
      setConflictError(null);
    } catch {
      // ignore
    }
  };

  return (
    <Modal
      open={!!itemId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Chi tiết mục"
      description={item ? `ID: ${item.id}` : undefined}
      maxWidth="600px"
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Skeleton height={32} width="80%" />
          <Skeleton height={20} width="60%" />
          <Skeleton height={100} width="100%" />
        </div>
      ) : error ? (
        <Alert type="error" message={error} />
      ) : item ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {conflictError && (
            <Alert
              type="warning"
              title="Xung đột phiên bản (409)"
              message={
                <div>
                  <p style={{ marginBottom: '8px' }}>{conflictError}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<RefreshCw size={14} />}
                    onClick={handleReloadLatestVersion}
                  >
                    Tải lại phiên bản mới nhất từ máy chủ
                  </Button>
                </div>
              }
            />
          )}

          {/* Type and Name Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <ItemTypeIcon type={item.type} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {!isEditing ? (
                <>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)', wordBreak: 'break-word' }}>
                    {item.name}
                  </h2>
                  {item.domain && (
                    <div style={{ fontSize: '13px', color: 'var(--color-primary)', marginTop: '2px' }}>
                      {item.domain}
                    </div>
                  )}
                </>
              ) : (
                <Input
                  label="Tiêu đề"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              )}
            </div>

            {isOwner && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Edit2 size={16} />}
                onClick={() => setIsEditing(true)}
              >
                Chỉnh sửa
              </Button>
            )}
          </div>

          {/* Description */}
          {isEditing ? (
            <Textarea
              label="Mô tả"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
            />
          ) : item.description ? (
            <div
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                color: 'var(--color-text)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {item.description}
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
              Chưa có mô tả
            </div>
          )}

          {/* Save/Cancel edit buttons */}
          {isEditing && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditName(item.name);
                  setEditDescription(item.description || '');
                  setConflictError(null);
                }}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Save size={16} />}
                isLoading={isSaving}
                onClick={handleSaveEdit}
              >
                Lưu thay đổi
              </Button>
            </div>
          )}

          {/* Content actions */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {item.type === 'LINK' ? (
                <span>Liên kết web ngoài</span>
              ) : (
                <span>
                  {item.originalFilename || 'Tệp nhị phân'} &bull; {formatBytes(item.sizeBytes)}
                </span>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={item.type === 'LINK' ? <ExternalLink size={16} /> : <Download size={16} />}
              onClick={handleOpenContent}
            >
              {item.type === 'LINK' ? 'Mở liên kết' : 'Tải xuống nội dung'}
            </Button>
          </div>

          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '14px',
            }}
          >
            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Ngày tạo
              </div>
              <div>{formatDateTime(item.createdAt)}</div>
            </div>

            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} /> Cập nhật lần cuối
              </div>
              <div>{formatDateTime(item.updatedAt)}</div>
            </div>

            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>Phiên bản (Version)</div>
              <div>v{item.version}</div>
            </div>

            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>Trạng thái duyệt</div>
              <div>{item.reviewedAt ? 'Đã xem xét' : 'Chưa duyệt (Inbox)'}</div>
            </div>

            {item.mimeType && (
              <div>
                <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>MIME Type</div>
                <div>{item.mimeType}</div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
