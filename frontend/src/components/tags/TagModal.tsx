import React, { useEffect, useState } from 'react';
import { tagsApi } from '../../api/tagsApi';
import { Tag } from '../../api/types';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';

interface TagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'rename';
  targetTag?: Tag | null;
  onSuccess: () => void;
}

const PRESET_COLORS = [
  '#2563EB', // Blue
  '#059669', // Green
  '#DC2626', // Red
  '#D97706', // Amber
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#0284C7', // Sky
  '#475569', // Slate
];

export const TagModal: React.FC<TagModalProps> = ({
  open,
  onOpenChange,
  mode,
  targetTag,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (mode === 'rename' && targetTag) {
        setName(targetTag.name);
        setColor(targetTag.color || '#2563EB');
      } else {
        setName('');
        setColor('#2563EB');
      }
    }
  }, [open, mode, targetTag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên thẻ.');
      return;
    }

    if (name.trim().length > 64) {
      setError('Tên thẻ không được dài quá 64 ký tự.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        await tagsApi.create({
          name: name.trim(),
          color,
        });
      } else if (mode === 'rename' && targetTag) {
        await tagsApi.rename(targetTag.id, {
          name: name.trim(),
          color,
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi khi lưu thẻ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Tạo thẻ mới' : 'Chỉnh sửa thẻ'}
      description="Thẻ giúp bạn phân loại và lọc các mục theo chủ đề."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <Input
          label="Tên thẻ"
          placeholder="Ví dụ: Quan trọng, Công việc, Lập trình..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div>
          <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', display: 'block', marginBottom: '8px' }}>
            Màu sắc nhận diện
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Chọn màu ${c}`}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: color === c ? '3px solid var(--color-text)' : '2px solid transparent',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'transform var(--transition-fast)',
                  transform: color === c ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              title="Màu tùy chỉnh"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                padding: '2px',
              }}
            />
          </div>
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
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {mode === 'create' ? 'Tạo thẻ' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
