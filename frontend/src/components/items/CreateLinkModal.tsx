import React, { useState } from 'react';
import { itemsApi } from '../../api/itemsApi';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { Input, Textarea } from '../common/Input';
import { Modal } from '../common/Modal';

interface CreateLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateLinkModal: React.FC<CreateLinkModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; url?: string; general?: string }>({});

  const validate = () => {
    const errs: { name?: string; url?: string } = {};
    if (!name.trim()) {
      errs.name = 'Vui lòng nhập tiêu đề liên kết.';
    } else if (name.length > 255) {
      errs.name = 'Tiêu đề không được vượt quá 255 ký tự.';
    }

    if (!url.trim()) {
      errs.url = 'Vui lòng nhập địa chỉ URL.';
    } else {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errs.url = 'URL phải bắt đầu bằng http:// hoặc https://';
        }
      } catch {
        errs.url = 'Định dạng URL không hợp lệ.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await itemsApi.createLink({
        name: name.trim(),
        url: url.trim(),
        description: description.trim() || undefined,
      });

      // Reset form
      setName('');
      setUrl('');
      setDescription('');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setErrors({
        general: err?.message || 'Không thể tạo liên kết. Vui lòng kiểm tra lại.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Thêm liên kết mới"
      description="Lưu liên kết web vào thư viện cá nhân của bạn."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {errors.general && <Alert type="error" message={errors.general} />}

        <Input
          label="Tiêu đề"
          placeholder="Ví dụ: Tài liệu Spring Boot 3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
          autoFocus
        />

        <Input
          label="Địa chỉ URL"
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          error={errors.url}
          required
        />

        <Textarea
          label="Mô tả ghi chú (tùy chọn)"
          placeholder="Ghi chú thêm về liên kết này..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
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
            Lưu liên kết
          </Button>
        </div>
      </form>
    </Modal>
  );
};
