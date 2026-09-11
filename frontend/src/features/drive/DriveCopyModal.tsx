import React, { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { DriveItem, driveApi } from '../../api/driveApi';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

interface DriveCopyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  item: DriveItem | null;
  onSuccess: () => void;
}

export const DriveCopyModal: React.FC<DriveCopyModalProps> = ({
  open,
  onOpenChange,
  accountId,
  item,
  onSuccess,
}) => {
  const [copyName, setCopyName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item && open) {
      setCopyName(`Bản sao của ${item.name}`);
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setLoading(true);
    try {
      await driveApi.copyFile(accountId, item.id, copyName.trim() || undefined);
      toast.success('Đã tạo bản sao thành công.');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo bản sao trên Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Tạo bản sao tệp"
      description={`Tạo một bản sao mới của "${item?.name}" trên Google Drive.`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Tên bản sao"
          value={copyName}
          onChange={(e) => setCopyName(e.target.value)}
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
            icon={<Copy size={16} />}
          >
            Tạo bản sao
          </Button>
        </div>
      </form>
    </Modal>
  );
};
