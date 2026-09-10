import React, { useEffect, useState } from 'react';
import { collectionsApi } from '../../api/collectionsApi';
import { Collection } from '../../api/types';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';

interface CollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'rename';
  targetCollection?: Collection | null;
  parentCollection?: Collection | null;
  onSuccess: () => void;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  open,
  onOpenChange,
  mode,
  targetCollection,
  parentCollection,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (mode === 'rename' && targetCollection) {
        setName(targetCollection.name);
      } else {
        setName('');
      }
    }
  }, [open, mode, targetCollection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên bộ sưu tập.');
      return;
    }

    if (name.trim().length > 120) {
      setError('Tên bộ sưu tập không được vượt quá 120 ký tự.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        await collectionsApi.create({
          name: name.trim(),
          parentId: parentCollection ? parentCollection.id : null,
        });
      } else if (mode === 'rename' && targetCollection) {
        await collectionsApi.rename(targetCollection.id, {
          name: name.trim(),
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi khi thực hiện thao tác.');
    } finally {
      setIsLoading(false);
    }
  };

  const title =
    mode === 'create'
      ? parentCollection
        ? `Tạo bộ sưu tập con trong "${parentCollection.name}"`
        : 'Tạo bộ sưu tập mới'
      : 'Đổi tên bộ sưu tập';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Bộ sưu tập giúp bạn tổ chức các liên kết và tệp tin một cách khoa học."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <Input
          label="Tên bộ sưu tập"
          placeholder="Ví dụ: Tài liệu học tập, Dự án React..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {mode === 'create' ? 'Tạo bộ sưu tập' : 'Lưu tên mới'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
