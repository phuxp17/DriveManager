import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Folder, Move, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { collectionsApi } from '../../api/collectionsApi';
import { tagsApi } from '../../api/tagsApi';
import { Collection, ItemEntry, Tag } from '../../api/types';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface MembershipDialogProps {
  item: ItemEntry | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const MembershipDialog: React.FC<MembershipDialogProps> = ({
  item,
  onClose,
  onUpdated,
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [removeCollectionId, setRemoveCollectionId] = useState<string>('');
  const [moveSourceId, setMoveSourceId] = useState<string>('');
  const [moveDestId, setMoveDestId] = useState<string>('');
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [removeTagId, setRemoveTagId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setError(null);
      setSuccessMsg(null);
      setSelectedCollectionId('');
      setRemoveCollectionId('');
      setMoveSourceId('');
      setMoveDestId('');
      setSelectedTagId('');
      setRemoveTagId('');
      Promise.all([collectionsApi.list(), tagsApi.list()])
        .then(([cols, tgs]) => {
          setCollections(cols);
          setTags(tgs);
        })
        .catch((err) => {
          setError(err?.message || 'Không thể tải danh sách bộ sưu tập và thẻ.');
        });
    }
  }, [item]);

  if (!item) return null;

  const handleAddToCollection = async () => {
    if (!selectedCollectionId) return;
    setIsLoading(true);
    setError(null);
    try {
      await collectionsApi.addItem(selectedCollectionId, item.id);
      setSuccessMsg('Đã thêm mục vào bộ sưu tập.');
      setSelectedCollectionId('');
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Không thể thêm vào bộ sưu tập.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromCollection = async () => {
    if (!removeCollectionId) return;
    setIsLoading(true);
    setError(null);
    try {
      await collectionsApi.removeItem(removeCollectionId, item.id);
      setSuccessMsg('Đã gỡ mục khỏi bộ sưu tập.');
      setRemoveCollectionId('');
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Không thể gỡ khỏi bộ sưu tập.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveCollection = async () => {
    if (!moveSourceId || !moveDestId) {
      setError('Vui lòng chọn cả bộ sưu tập nguồn và bộ sưu tập đích.');
      return;
    }
    if (moveSourceId === moveDestId) {
      setError('Bộ sưu tập nguồn và đích không được trùng nhau.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await collectionsApi.moveItem(item.id, {
        sourceCollectionId: moveSourceId,
        destinationCollectionId: moveDestId,
      });
      setSuccessMsg('Đã di chuyển mục sang bộ sưu tập mới.');
      setMoveSourceId('');
      setMoveDestId('');
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Không thể di chuyển mục giữa các bộ sưu tập.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!selectedTagId) return;
    setIsLoading(true);
    setError(null);
    try {
      await tagsApi.addItemTag(selectedTagId, item.id);
      setSuccessMsg('Đã gắn thẻ cho mục.');
      setSelectedTagId('');
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Không thể gắn thẻ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTag = async () => {
    if (!removeTagId) return;
    setIsLoading(true);
    setError(null);
    try {
      await tagsApi.removeItemTag(removeTagId, item.id);
      setSuccessMsg('Đã gỡ thẻ.');
      setRemoveTagId('');
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || 'Không thể gỡ thẻ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={!!item}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Tổ chức: Bộ sưu tập & Thẻ"
      description={`Mục: "${item.name}"`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

        {/* Collections section */}
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Folder size={16} /> Gán vào Bộ sưu tập
          </h4>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '14px',
              }}
              disabled={isLoading || collections.length === 0}
            >
              <option value="">-- Chọn bộ sưu tập cần thêm --</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>

            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={16} />}
              disabled={!selectedCollectionId || isLoading}
              onClick={handleAddToCollection}
            >
              Thêm
            </Button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <select
              value={removeCollectionId}
              onChange={(e) => setRemoveCollectionId(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '14px',
              }}
              disabled={isLoading || collections.length === 0}
            >
              <option value="">-- Chọn bộ sưu tập để gỡ --</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>

            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={16} />}
              disabled={!removeCollectionId || isLoading}
              onClick={handleRemoveFromCollection}
            >
              Gỡ
            </Button>
          </div>
        </div>

        {/* Move Item section (MISS-006) */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Move size={16} /> Di chuyển mục giữa các Bộ sưu tập
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={moveSourceId}
                onChange={(e) => setMoveSourceId(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: '13px',
                }}
                disabled={isLoading || collections.length < 2}
                aria-label="Chọn bộ sưu tập nguồn"
              >
                <option value="">Từ BST nguồn...</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>

              <ArrowRight size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />

              <select
                value={moveDestId}
                onChange={(e) => setMoveDestId(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: '13px',
                }}
                disabled={isLoading || collections.length < 2}
                aria-label="Chọn bộ sưu tập đích"
              >
                <option value="">Sang BST đích...</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>

              <Button
                variant="primary"
                size="sm"
                disabled={!moveSourceId || !moveDestId || moveSourceId === moveDestId || isLoading}
                onClick={handleMoveCollection}
              >
                Chuyển
              </Button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Mục sẽ được gỡ khỏi bộ sưu tập nguồn và thêm vào bộ sưu tập đích cùng lúc.
            </p>
          </div>
        </div>

        {/* Tags section */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TagIcon size={16} /> Gán Thẻ (Tags)
          </h4>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '14px',
              }}
              disabled={isLoading || tags.length === 0}
            >
              <option value="">-- Chọn thẻ cần gắn --</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>

            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={16} />}
              disabled={!selectedTagId || isLoading}
              onClick={handleAddTag}
            >
              Gắn thẻ
            </Button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <select
              value={removeTagId}
              onChange={(e) => setRemoveTagId(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '14px',
              }}
              disabled={isLoading || tags.length === 0}
            >
              <option value="">-- Chọn thẻ cần gỡ --</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>

            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={16} />}
              disabled={!removeTagId || isLoading}
              onClick={handleRemoveTag}
            >
              Gỡ thẻ
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <Button variant="ghost" onClick={onClose}>
            Xong
          </Button>
        </div>
      </div>
    </Modal>
  );
};
