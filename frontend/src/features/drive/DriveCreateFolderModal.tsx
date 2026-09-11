import React, { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { driveApi } from '../../api/driveApi';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

interface DriveCreateFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  parentId: string;
  onSuccess: () => void;
}

export const DriveCreateFolderModal: React.FC<DriveCreateFolderModalProps> = ({
  open,
  onOpenChange,
  accountId,
  parentId,
  onSuccess,
}) => {
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = folderName.trim();
    if (!name) return;

    setLoading(true);
    try {
      await driveApi.createFolder(accountId, name, parentId);
      toast.success(`Đã tạo thư mục "${name}" thành công.`);
      setFolderName('');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo thư mục trên Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Tạo thư mục mới"
      description="Thư mục sẽ được tạo trực tiếp trên Google Drive tại vị trí hiện tại."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Tên thư mục"
          placeholder="Ví dụ: Tài liệu học tập, Ảnh dự án..."
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
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
            disabled={!folderName.trim()}
            icon={<FolderPlus size={16} />}
          >
            Tạo thư mục
          </Button>
        </div>
      </form>
    </Modal>
  );
};
