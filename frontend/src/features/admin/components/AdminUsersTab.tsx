import React, { useState, useEffect } from 'react';
import { RefreshCw, Shield, ShieldCheck, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { adminApi } from '../../../api/adminApi';
import { AdminUserEntry } from '../../../api/types';
import { Button } from '../../../components/common/Button';
import { confirm } from '../../../components/common/ConfirmDialog';
import { toast } from '../../../components/common/Toast';
import styles from '../AdminPage.module.css';

export const AdminUsersTab: React.FC = () => {
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (err) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRole = async (user: AdminUserEntry) => {
    const isCurrentlyAdmin = user.role === 'ROLE_ADMIN';
    const nextRole = isCurrentlyAdmin ? 'ROLE_USER' : 'ROLE_ADMIN';
    const actionLabel = isCurrentlyAdmin ? 'Thu hồi quyền Admin' : 'Cấp quyền Quản trị viên (Admin)';

    const ok = await confirm({
      title: actionLabel,
      message: `Bạn có chắc muốn ${isCurrentlyAdmin ? 'hạ quyền' : 'phân quyền Admin cho'} tài khoản "${user.email}"?`,
      confirmText: actionLabel,
      variant: isCurrentlyAdmin ? 'danger' : 'primary',
    });

    if (!ok) return;

    try {
      await adminApi.updateUserRole(user.id, nextRole);
      toast.success(`Đã cập nhật vai trò cho ${user.email}.`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật vai trò.');
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Tổng cộng <strong>{users.length}</strong> tài khoản trong hệ thống
        </span>

        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          onClick={fetchUsers}
        >
          Làm mới
        </Button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái Email</th>
              <th>Ngày đăng ký</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  Đang tải danh sách người dùng...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  Chưa có người dùng nào trong hệ thống.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isAdmin = u.role === 'ROLE_ADMIN';
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.displayName}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{u.email}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: isAdmin ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                          color: isAdmin ? '#3B82F6' : 'var(--color-text-muted)',
                        }}
                      >
                        {isAdmin ? 'ADMIN' : 'USER'}
                      </span>
                    </td>
                    <td>
                      {u.emailVerified ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10B981', fontSize: '12px', fontWeight: 500 }}>
                          <UserCheck size={14} /> Đã xác minh
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#F59E0B', fontSize: '12px', fontWeight: 500 }}>
                          <AlertCircle size={14} /> Chưa xác minh
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                      {formatDate(u.createdAt)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        variant={isAdmin ? 'danger' : 'secondary'}
                        size="sm"
                        icon={isAdmin ? <UserX size={13} /> : <Shield size={13} />}
                        onClick={() => handleToggleRole(u)}
                      >
                        {isAdmin ? 'Hạ quyền' : 'Cấp Admin'}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
