import React, { useEffect, useState } from 'react';
import { Edit2 } from 'lucide-react';
import { DriveItem, driveApi } from '../../api/driveApi';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

interface DriveRenameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  item: DriveItem | null;
  onSuccess: () => void;
}

export const DriveRenameModal: React.FC<DriveRenameModalProps> = ({
  open,
  onOpenChange,
  accountId,
  item,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item && open) {
      setName(item.name);
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    const newName = name.trim();
    if (!newName || newName === item.name) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    try {
      await driveApi.renameFile(accountId, item.id, newName);
      toast.success('Đã đổi tên thành công.');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể đổi tên mục trên Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={item?.isFolder ? 'Đổi tên thư mục' : 'Đổi tên tệp tin'}
      description={`Cập nhật tên mới cho "${item?.name}"`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Tên mới"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={!name.trim()}
            icon={<Edit2 size={16} />}
          >
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </Modal>
  );
};
