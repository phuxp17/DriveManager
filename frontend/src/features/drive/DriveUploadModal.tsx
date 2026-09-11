import React, { useRef, useState } from 'react';
import { FileUp, UploadCloud, X } from 'lucide-react';
import { driveApi } from '../../api/driveApi';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

interface DriveUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  parentId: string;
  onSuccess: () => void;
}

export const DriveUploadModal: React.FC<DriveUploadModalProps> = ({
  open,
  onOpenChange,
  accountId,
  parentId,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setCustomName('');
    setIsUploading(false);
    setUploadPercent(0);
    setError(null);
    setIsDragging(false);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setCustomName(file.name);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Vui lòng chọn tệp tin cần tải lên.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadPercent(0);

    try {
      await driveApi.uploadFile(
        accountId,
        selectedFile,
        parentId,
        customName.trim() || undefined,
        (pct) => setUploadPercent(pct)
      );

      toast.success(`Đã tải lên tệp "${customName || selectedFile.name}" thành công.`);
      resetState();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Tải tệp lên Google Drive thất bại.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <Modal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isUploading) {
          if (!isOpen) resetState();
          onOpenChange(isOpen);
        }
      }}
      title="Tải tệp lên Google Drive"
      description="Tệp sẽ được tải trực tiếp lên Google Drive tại thư mục hiện tại."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Drag & drop area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '28px 16px',
            textAlign: 'center',
            backgroundColor: isDragging ? 'var(--color-primary-subtle)' : 'var(--color-bg)',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            disabled={isUploading}
          />

          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              marginBottom: '10px',
            }}
          >
            <UploadCloud size={22} />
          </div>

          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
            Kéo thả tệp vào đây, hoặc <span style={{ color: 'var(--color-primary)' }}>chọn từ máy tính</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Hỗ trợ tất cả định dạng tệp lên đến 5GB
          </div>
        </div>

        {/* Selected file preview */}
        {selectedFile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <FileUp size={20} color="var(--color-primary)" />
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
            </div>

            {!isUploading && (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                title="Bỏ chọn"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Custom name input */}
        {selectedFile && (
          <Input
            label="Tên tệp khi lưu trên Drive (Tùy chọn)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            disabled={isUploading}
          />
        )}

        {/* Progress bar */}
        {isUploading && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span>Đang tải lên Google Drive...</span>
              <span style={{ fontWeight: 600 }}>{uploadPercent}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--color-bg)',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  width: `${uploadPercent}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-primary)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isUploading}
            disabled={!selectedFile}
            icon={<UploadCloud size={16} />}
          >
            {isUploading ? `Đang tải lên (${uploadPercent}%)` : 'Bắt đầu tải lên'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
