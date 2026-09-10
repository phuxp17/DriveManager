import React, { useState } from 'react';
import { tagsApi } from '../../api/tagsApi';
import { Tag } from '../../api/types';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface TagMergeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTag: Tag | null;
  allTags: Tag[];
  onSuccess: () => void;
}

export const TagMergeModal: React.FC<TagMergeModalProps> = ({
  open,
  onOpenChange,
  sourceTag,
  allTags,
  onSuccess,
}) => {
  const [targetId, setTargetId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sourceTag) return null;

  const candidateTags = allTags.filter((t) => t.id !== sourceTag.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) {
      setError('Vui lòng chọn thẻ đích để gộp vào.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await tagsApi.merge(sourceTag.id, { targetId });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Không thể gộp thẻ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Gộp thẻ (Merge tags)"
      description={`Gộp thẻ "${sourceTag.name}" vào một thẻ khác.`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <Alert
          type="info"
          message={`Tất cả các mục đang gắn thẻ "${sourceTag.name}" sẽ được chuyển sang thẻ đích được chọn. Sau khi gộp, thẻ "${sourceTag.name}" sẽ bị xóa.`}
        />

        <div>
          <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', display: 'block', marginBottom: '6px' }}>
            Chọn thẻ đích
          </label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '14px',
            }}
            required
          >
            <option value="">-- Chọn thẻ đích --</option>
            {candidateTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={!targetId}>
            Xác nhận gộp
          </Button>
        </div>
      </form>
    </Modal>
  );
};
