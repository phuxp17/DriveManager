import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Plus, RefreshCw, Trash2, User, Users } from 'lucide-react';
import { contactsApi } from '../../api/contactsApi';
import { AddContactRequest, ContactResponse } from '../../api/types';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Skeleton } from '../../components/common/Skeleton';

export const ContactsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Add modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [alias, setAlias] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // TanStack Query (BUG-003)
  const {
    data: contacts = [],
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.list(),
  });

  const invalidateContacts = () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  };

  const addMutation = useMutation({
    mutationFn: (payload: AddContactRequest) => contactsApi.add(payload),
    onSuccess: () => {
      invalidateContacts();
      setAddModalOpen(false);
      setEmail('');
      setAlias('');
      setModalError(null);
    },
    onError: (err: any) => {
      setModalError(err?.message || 'Không thể thêm liên hệ. Vui lòng kiểm tra lại email.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (contactUserId: string) => contactsApi.remove(contactUserId),
    onSuccess: invalidateContacts,
    onError: (err: any) => alert(err?.message || 'Không thể xóa liên hệ.'),
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setModalError('Vui lòng nhập địa chỉ email.');
      return;
    }
    setModalError(null);
    addMutation.mutate({
      email: email.trim(),
      alias: alias.trim() || undefined,
    });
  };

  const handleDelete = (contact: ContactResponse) => {
    if (
      window.confirm(
        `Xác nhận xóa liên hệ "${contact.alias || contact.displayName || contact.email}" khỏi danh bạ?`
      )
    ) {
      deleteMutation.mutate(contact.contactUserId);
    }
  };

  const error = queryError ? (queryError as any)?.message || 'Không thể tải danh sách liên hệ.' : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
              Danh bạ liên hệ
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Lưu trữ email và biệt danh của đồng nghiệp để chia sẻ tài nguyên nhanh chóng
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={16} />}
          onClick={() => {
            setModalError(null);
            setEmail('');
            setAlias('');
            setAddModalOpen(true);
          }}
        >
          Thêm liên hệ mới
        </Button>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          action={
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => refetch()}>
              Thử lại
            </Button>
          }
        />
      )}

      {/* Contacts List with Skeleton Loading (MISS-009) */}
      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '14px',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Skeleton width="36px" height="36px" borderRadius="50%" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Skeleton width="60%" height="15px" />
                <Skeleton width="80%" height="12px" />
              </div>
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="Chưa có người liên hệ nào"
          description="Thêm địa chỉ email thường xuyên chia sẻ vào danh bạ để gửi lời mời dễ dàng hơn."
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setAddModalOpen(true)}
            >
              Thêm liên hệ mới
            </Button>
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '14px',
          }}
        >
          {contacts.map((contact) => (
            <div
              key={contact.contactUserId}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-surface-hover)',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {contact.alias || contact.displayName || contact.email}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {contact.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(contact)}
                title="Xóa liên hệ"
                aria-label="Xóa liên hệ"
                disabled={deleteMutation.isPending}
                style={{
                  color: 'var(--color-danger)',
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      <Modal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        title="Thêm người liên hệ"
        description="Lưu email người dùng vào danh bạ của bạn."
      >
        <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {modalError && <Alert type="error" message={modalError} onClose={() => setModalError(null)} />}

          <Input
            label="Địa chỉ Email"
            type="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Biệt danh / Tên gợi nhớ (Tùy chọn)"
            placeholder="Ví dụ: Anh Nam TechLead, Bạn Hằng..."
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddModalOpen(false)}
              disabled={addMutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={addMutation.isPending}>
              Lưu liên hệ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
