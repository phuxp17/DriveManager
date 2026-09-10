import React, { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { connectionsApi } from '../../api/connectionsApi';
import { StorageConnection } from '../../api/types';
import { useUploadQueue } from '../../context/UploadQueueContext';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { Input, Textarea } from '../common/Input';
import { Modal } from '../common/Modal';

interface FileUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_SIZE = 52_428_800; // 50 MB

export const FileUploadModal: React.FC<FileUploadModalProps> = ({ open, onOpenChange }) => {
  const { enqueueUpload } = useUploadQueue();
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setFile(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > MAX_FILE_SIZE) {
        setError('Tệp tin vượt quá dung lượng tối đa cho phép (50 MB).');
        setFile(null);
        return;
      }
      setError(null);
      setFile(selected);
      if (!name) {
        setName(selected.name);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnectionId) {
      setError('Vui lòng chọn tài khoản lưu trữ.');
      return;
    }
    if (!file) {
      setError('Vui lòng chọn tệp tin tải lên.');
      return;
    }

    enqueueUpload(
      selectedConnectionId,
      file,
      name.trim() || undefined,
      description.trim() || undefined
    );

    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Tải tệp tin lên"
      description="Tải tệp tin trực tiếp từ thiết bị của bạn lên Google Drive."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {connections.length === 0 ? (
          <Alert
            type="warning"
            title="Chưa kết nối Google Drive"
            message="Bạn cần kết nối tài khoản Google Drive trong mục 'Tài khoản lưu trữ' trước khi tải tệp lên."
          />
        ) : (
          <div>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', display: 'block', marginBottom: '6px' }}>
              Tài khoản lưu trữ đích <span style={{ color: 'var(--color-danger)' }}>*</span>
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

        <div>
          <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', display: 'block', marginBottom: '6px' }}>
            Chọn tệp tin (Tối đa 50 MB) <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              fontSize: '14px',
            }}
          />
        </div>

        <Input
          label="Tên hiển thị (Tùy chọn)"
          placeholder="Giữ nguyên tên tệp hoặc nhập tên mới"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Textarea
          label="Mô tả ghi chú (Tùy chọn)"
          placeholder="Thêm ghi chú cho tệp tin này..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!file || !selectedConnectionId || connections.length === 0}
            icon={<Upload size={16} />}
          >
            Đưa vào hàng đợi tải lên
          </Button>
        </div>
      </form>
    </Modal>
  );
};
