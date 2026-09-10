import React, { useEffect, useState } from 'react';
import { CloudDownload } from 'lucide-react';
import { connectionsApi } from '../../api/connectionsApi';
import { filesApi } from '../../api/filesApi';
import { StorageConnection } from '../../api/types';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { Input, Textarea } from '../common/Input';
import { Modal } from '../common/Modal';

interface ImportDriveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ImportDriveModal: React.FC<ImportDriveModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [rawDriveInput, setRawDriveInput] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setRawDriveInput('');
      setName('');
      setDescription('');
      connectionsApi
        .list()
        .then((data) => {
          setConnections(data);
          if (data.length > 0) {
            setSelectedConnectionId(data[0].id);
          }
        })
        .catch(() => {
          setError('Không thể tải danh sách tài khoản lưu trữ.');
        });
    }
  }, [open]);

  const extractDriveFileId = (input: string): string => {
    const trimmed = input.trim();
    // Check if it's a URL matching /d/([a-zA-Z0-9_-]+)
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Check if it's id=([a-zA-Z0-9_-]+)
    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch && idParamMatch[1]) {
      return idParamMatch[1];
    }
    // Else assume raw ID
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const driveFileId = extractDriveFileId(rawDriveInput);
    if (!driveFileId) {
      setError('Vui lòng nhập File ID hoặc đường dẫn liên kết Google Drive.');
      return;
    }
    if (!selectedConnectionId) {
      setError('Vui lòng chọn tài khoản lưu trữ Google Drive.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await filesApi.importFile({
        connectionId: selectedConnectionId,
        driveFileId,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Không thể nhập tệp từ Google Drive. Vui lòng kiểm tra lại File ID.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Nhập tệp từ Google Drive"
      description="Đăng ký tệp tin sẵn có trên Google Drive vào thư viện mà không cần tải lại nội dung."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {connections.length === 0 ? (
          <Alert
            type="warning"
            title="Chưa kết nối Google Drive"
            message="Bạn cần kết nối tài khoản Google Drive trước khi nhập tệp tin."
          />
        ) : (
          <div>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', display: 'block', marginBottom: '6px' }}>
              Tài khoản Google Drive <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <select
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
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
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName} ({c.provider})
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          label="Google Drive File ID hoặc Link tệp"
          placeholder="Nhập ID (ví dụ: 1A2B3C...) hoặc dán link Google Drive"
          value={rawDriveInput}
          onChange={(e) => setRawDriveInput(e.target.value)}
          required
          autoFocus
        />

        <Input
          label="Tên hiển thị (Tùy chọn)"
          placeholder="Để trống để backend tự lấy tên từ Google Drive"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Textarea
          label="Mô tả ghi chú (Tùy chọn)"
          placeholder="Ghi chú về tệp nhập này..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
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
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={connections.length === 0}
            icon={<CloudDownload size={16} />}
          >
            Nhập tệp
          </Button>
        </div>
      </form>
    </Modal>
  );
};
