import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Unlink,
} from 'lucide-react';
import { connectionsApi } from '../../api/connectionsApi';
import { StorageConnection } from '../../api/types';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';

export const ConnectionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // TanStack Query for connections (BUG-003)
  const {
    data: connections = [],
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list(),
  });

  const disconnectMutation = useMutation({
    mutationFn: (connId: string) => connectionsApi.disconnect(connId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err: any) => {
      alert(err?.message || 'Không thể ngắt kết nối tài khoản.');
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    setActionError(null);
    try {
      const res = await connectionsApi.connectGoogle();
      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      }
    } catch (err: any) {
      setActionError(err?.message || 'Không thể khởi tạo liên kết Google Drive.');
      setIsConnecting(false);
    }
  };

  const handleReconnect = async (id: string) => {
    setIsConnecting(true);
    setActionError(null);
    try {
      const res = await connectionsApi.reconnectGoogle(id);
      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      }
    } catch (err: any) {
      setActionError(err?.message || 'Không thể kết nối lại Google Drive.');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = (conn: StorageConnection) => {
    if (
      window.confirm(
        `Xác nhận ngắt kết nối tài khoản "${conn.displayName}"? Lưu ý: Việc ngắt kết nối không xóa các tệp tin hoặc metadata đã lưu trong hệ thống.`
      )
    ) {
      disconnectMutation.mutate(conn.id);
    }
  };

  const displayError = actionError || (queryError ? (queryError as any)?.message || 'Lỗi tải danh sách tài khoản lưu trữ.' : null);

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
            <Cloud size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
              Tài khoản lưu trữ
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Quản lý các kết nối lưu trữ đám mây Google Drive cho tải lên và nhập tệp
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={16} />}
          isLoading={isConnecting}
          onClick={handleConnect}
        >
          Kết nối Google Drive mới
        </Button>
      </div>

      <Alert
        type="info"
        message="Dữ liệu xác thực tài khoản lưu trữ được mã hóa an toàn (AES-GCM). Tài khoản lưu trữ chỉ đóng vai trò nơi chứa nhị phân (binary content), cơ sở dữ liệu của DriveManager hoàn toàn kiểm soát metadata và cấu trúc thư mục."
      />

      {displayError && (
        <Alert
          type="error"
          message={displayError}
          onClose={() => setActionError(null)}
          action={
            queryError && (
              <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => refetch()}>
                Thử lại
              </Button>
            )
          }
        />
      )}

      {/* Connections List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton width="100%" height="76px" />
          <Skeleton width="100%" height="76px" />
        </div>
      ) : connections.length === 0 ? (
        <EmptyState
          icon={<Cloud size={28} />}
          title="Chưa có kết nối Google Drive nào"
          description="Để có thể tải tệp tin lên hoặc nhập tệp từ Google Drive vào thư viện cá nhân, vui lòng kết nối ít nhất một tài khoản lưu trữ."
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              isLoading={isConnecting}
              onClick={handleConnect}
            >
              Kết nối Google Drive ngay
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {connections.map((conn) => {
            const isActive = conn.status === 'ACTIVE' || conn.status === 'CONNECTED';

            return (
              <div
                key={conn.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <Cloud size={28} color="var(--color-primary)" />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {conn.displayName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Nhà cung cấp: <strong>{conn.provider}</strong> &bull; Trạng thái:{' '}
                      <span
                        style={{
                          color: isActive ? 'var(--color-success)' : 'var(--color-danger)',
                          fontWeight: 500,
                        }}
                      >
                        {conn.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw size={14} />}
                    onClick={() => handleReconnect(conn.id)}
                    title="Cấp lại quyền kết nối nếu token bị hết hạn"
                  >
                    Kết nối lại
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Unlink size={14} />}
                    onClick={() => handleDisconnect(conn)}
                    isLoading={disconnectMutation.isPending}
                  >
                    Ngắt kết nối
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
