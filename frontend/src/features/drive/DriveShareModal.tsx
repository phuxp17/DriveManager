import React, { useEffect, useState } from 'react';
import { Copy, Globe, Mail, Plus, Trash2, User, UserCheck } from 'lucide-react';
import { DriveItem, PermissionItem, driveApi } from '../../api/driveApi';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

interface DriveShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  item: DriveItem | null;
}

export const DriveShareModal: React.FC<DriveShareModalProps> = ({
  open,
  onOpenChange,
  accountId,
  item,
}) => {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  // New permission form
  const [shareType, setShareType] = useState<'user' | 'anyone'>('user');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'reader' | 'commenter' | 'writer'>('reader');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = async () => {
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      const list = await driveApi.listPermissions(accountId, item.id);
      setPermissions(list);
    } catch {
      setError('Không thể tải danh sách quyền truy cập của mục này.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && item) {
      setEmail('');
      setShareType('user');
      setRole('reader');
      loadPermissions();
    }
  }, [open, item]);

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    if (shareType === 'user' && !email.trim()) {
      setError('Vui lòng nhập địa chỉ email cần chia sẻ.');
      return;
    }

    setSharing(true);
    setError(null);
    try {
      await driveApi.createPermission(accountId, item.id, {
        role,
        type: shareType,
        emailAddress: shareType === 'user' ? email.trim() : undefined,
        sendNotificationEmail: shareType === 'user' ? notify : false,
      });
      toast.success('Đã cấp quyền chia sẻ thành công.');
      setEmail('');
      loadPermissions();
    } catch (err: any) {
      setError(err?.message || 'Không thể cấp quyền chia sẻ trên Google Drive.');
    } finally {
      setSharing(false);
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!item) return;
    try {
      await driveApi.deletePermission(accountId, item.id, permissionId);
      toast.success('Đã xóa quyền truy cập.');
      setPermissions((prev) => prev.filter((p) => p.id !== permissionId));
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa quyền truy cập.');
    }
  };

  const handleCopyLink = () => {
    if (item?.webViewLink) {
      navigator.clipboard.writeText(item.webViewLink);
      toast.success('Đã sao chép liên kết vào clipboard!');
    }
  };

  const roleLabel = (r: string) => {
    switch (r) {
      case 'owner':
        return 'Chủ sở hữu';
      case 'writer':
        return 'Người chỉnh sửa';
      case 'commenter':
        return 'Người nhận xét';
      case 'reader':
        return 'Người xem';
      default:
        return r;
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Chia sẻ tệp / thư mục"
      description={`Quản lý người có quyền truy cập vào "${item?.name}"`}
      maxWidth="540px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Add Permission Form */}
        <form
          onSubmit={handleAddPermission}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '14px',
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
              Chia sẻ cho:
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="shareType"
                checked={shareType === 'user'}
                onChange={() => setShareType('user')}
              />
              <User size={14} /> Cá nhân (Email)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="shareType"
                checked={shareType === 'anyone'}
                onChange={() => setShareType('anyone')}
              />
              <Globe size={14} /> Bất kỳ ai có liên kết
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {shareType === 'user' ? (
              <div style={{ flex: '1 1 240px' }}>
                <Input
                  placeholder="Nhập email người nhận (ví dụ: user@gmail.com)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div style={{ flex: '1 1 240px', fontSize: '13px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                Bất kỳ ai trên Internet có liên kết đều có thể truy cập.
              </div>
            )}

            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '13px',
                minWidth: '130px',
              }}
            >
              <option value="reader">Người xem</option>
              <option value="commenter">Người nhận xét</option>
              <option value="writer">Người chỉnh sửa</option>
            </select>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={sharing}
              icon={<Plus size={16} />}
            >
              Cấp quyền
            </Button>
          </div>

          {shareType === 'user' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
              />
              Gửi email thông báo cho người nhận
            </label>
          )}
        </form>

        {/* Existing Permissions List */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
            Những người có quyền truy cập
          </div>

          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Đang tải danh sách quyền...
              </div>
            ) : permissions.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Chưa có dữ liệu phân quyền bổ sung.
              </div>
            ) : (
              permissions.map((p) => {
                const isOwner = p.role === 'owner';
                const isAnyone = p.type === 'anyone';
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isAnyone ? 'rgba(52, 168, 83, 0.15)' : 'var(--color-primary-subtle)',
                          color: isAnyone ? '#16A34A' : 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isAnyone ? <Globe size={16} /> : <UserCheck size={16} />}
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                          {isAnyone ? 'Bất kỳ ai có liên kết' : (p.displayName || p.emailAddress || 'Người dùng')}
                        </div>
                        {p.emailAddress && (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {p.emailAddress}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: isOwner ? 'rgba(234, 179, 8, 0.15)' : 'var(--color-bg)',
                          color: isOwner ? '#B45309' : 'var(--color-text)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {roleLabel(p.role)}
                      </span>

                      {!isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeletePermission(p.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Thu hồi quyền"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Copy size={15} />}
            onClick={handleCopyLink}
            disabled={!item?.webViewLink}
          >
            Sao chép liên kết Drive
          </Button>

          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};
