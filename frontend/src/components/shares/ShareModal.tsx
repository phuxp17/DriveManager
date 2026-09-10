import React, { useEffect, useState } from 'react';
import { Share2, Users } from 'lucide-react';
import { contactsApi } from '../../api/contactsApi';
import { sharesApi } from '../../api/sharesApi';
import { ContactResponse, ShareTargetType } from '../../api/types';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ShareTargetType;
  targetId: string;
  targetName: string;
  onSuccess?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetName,
  onSuccess,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccessMsg(null);
      setRecipientEmail('');
      contactsApi
        .list()
        .then(setContacts)
        .catch(() => {});
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      setError('Vui lòng nhập email người nhận.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await sharesApi.create({
        targetType,
        targetId,
        recipientEmail: recipientEmail.trim(),
      });

      setSuccessMsg(`Đã gửi lời mời chia sẻ tới ${recipientEmail.trim()} thành công!`);
      setRecipientEmail('');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo lời mời chia sẻ. Vui lòng kiểm tra lại địa chỉ email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Chia sẻ quyền xem (VIEW)"
      description={`${targetType === 'ITEM' ? 'Mục' : 'Bộ sưu tập'}: "${targetName}"`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

        <Alert
          type="info"
          message="Người nhận sẽ được cấp quyền XEM (VIEW). Họ có thể đọc và tải nội dung thông qua hệ thống mà không cần có tài khoản Google Drive riêng, và không thể sửa đổi hoặc xóa mục này."
        />

        {contacts.length > 0 && (
          <div>
            <label style={{ fontSize: '13px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
              Chọn từ danh bạ đã lưu:
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {contacts.map((c) => (
                <button
                  key={c.contactUserId}
                  type="button"
                  onClick={() => setRecipientEmail(c.email)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: recipientEmail === c.email ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
                    color: recipientEmail === c.email ? 'var(--color-primary)' : 'var(--color-text)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <Users size={12} />
                  <span>{c.alias || c.displayName || c.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Input
          label="Email người nhận"
          type="email"
          placeholder="colleague@example.com"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          required
          autoFocus
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            icon={<Share2 size={16} />}
          >
            Gửi lời mời
          </Button>
        </div>
      </form>
    </Modal>
  );
};
