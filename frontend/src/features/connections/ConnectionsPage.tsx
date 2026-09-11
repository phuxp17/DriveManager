import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  HardDrive,
  Plus,
  RefreshCw,
  Unlink,
} from 'lucide-react';
import { connectionsApi } from '../../api/connectionsApi';
import { StorageConnection } from '../../api/types';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { toast } from '../../components/common/Toast';
import { confirm } from '../../components/common/ConfirmDialog';
import { formatBytes, formatRelativeTime } from '../../utils/dateUtils';

export const ConnectionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // TanStack Query for connections
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
      toast.success('Đã ngắt kết nối tài khoản thành công.');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Không thể ngắt kết nối tài khoản.');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (connId: string) => connectionsApi.sync(connId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success(`Đồng bộ hoàn tất: ${res.newItems} tệp mới, ${res.updatedItems} tệp cập nhật.`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Đồng bộ Google Drive thất bại.');
    },
    onSettled: () => setSyncingId(null),
  });

  const syncAllMutation = useMutation({
    mutationFn: () => connectionsApi.syncAll(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success(`Đồng bộ tất cả hoàn tất: ${res.newItems} tệp mới, ${res.updatedItems} tệp cập nhật.`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Lỗi khi đồng bộ tất cả tài khoản.');
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

  const handleSync = (connId: string) => {
    setSyncingId(connId);
    syncMutation.mutate(connId);
  };

  const handleDisconnect = async (conn: StorageConnection) => {
    const ok = await confirm({
      title: 'Ngắt kết nối tài khoản',
      message: `Xác nhận ngắt kết nối tài khoản "${conn.displayName}"? Lưu ý: Việc ngắt kết nối không xóa các tệp tin hoặc metadata đã lưu trong hệ thống.`,
      confirmText: 'Ngắt kết nối',
      variant: 'warning',
    });
    if (ok) {
      disconnectMutation.mutate(conn.id);
    }
  };

  // Quota totals calculation
  const totalLimit = connections.reduce((sum, c) => sum + (c.quotaTotalBytes || 0), 0);
  const totalUsed = connections.reduce((sum, c) => sum + (c.quotaUsedBytes || 0), 0);
  const totalRemaining = connections.reduce((sum, c) => sum + (c.quotaRemainingBytes || 0), 0);

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
              Quản lý tài khoản Google Drive, đồng bộ dữ liệu tự động và kiểm soát dung lượng Quota
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {connections.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={14} className={syncAllMutation.isPending ? 'spin' : ''} />}
              isLoading={syncAllMutation.isPending}
              onClick={() => syncAllMutation.mutate()}
            >
              Đồng bộ tất cả
            </Button>
          )}

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
      </div>

      {/* Aggregate Storage Quota Summary Banner */}
      {connections.length > 0 && totalLimit > 0 && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HardDrive size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Tổng dung lượng mây</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text)' }}>
                {formatBytes(totalLimit)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Database size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Đã sử dụng</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text)' }}>
                {formatBytes(totalUsed)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cloud size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Còn trống</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-success)' }}>
                {formatBytes(totalRemaining)}
              </div>
            </div>
          </div>
        </div>
      )}

      <Alert
        type="info"
        message="Hệ thống tự động đồng bộ tệp và cập nhật Quota định kỳ từ Google Drive. Bạn cũng có thể chủ động nhấn 'Đồng bộ ngay' để cập nhật danh sách tệp tức thì."
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
          <Skeleton width="100%" height="110px" />
          <Skeleton width="100%" height="110px" />
        </div>
      ) : connections.length === 0 ? (
        <EmptyState
          icon={<Cloud size={28} />}
          title="Chưa có kết nối Google Drive nào"
          description="Để có thể tự động sync dữ liệu và tải tệp lên Google Drive, vui lòng kết nối ít nhất một tài khoản lưu trữ."
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Cloud size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Quản lý tập trung & Xóa tệp:</strong> Hệ thống đã hỗ trợ đọc toàn bộ tệp và xóa tệp trực tiếp trên Google Drive. Nếu tài khoản của bạn được liên kết trước đây, vui lòng nhấn <strong>"Cấp lại quyền (Re-authorize)"</strong> một lần để cấp đủ quyền quản trị Drive.
            </span>
          </div>

          {connections.map((conn) => {
            const isActive = conn.status === 'ACTIVE' || conn.status === 'CONNECTED';
            const isSyncingThis = syncingId === conn.id;

            const total = conn.quotaTotalBytes || 0;
            const used = conn.quotaUsedBytes || 0;
            const remaining = conn.quotaRemainingBytes != null ? conn.quotaRemainingBytes : Math.max(0, total - used);
            const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

            const progressColor =
              percent > 90
                ? 'var(--color-danger)'
                : percent > 70
                ? 'var(--color-warning)'
                : 'var(--color-primary)';

            return (
              <div
                key={conn.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-primary-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Cloud size={24} color="var(--color-primary)" />
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
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
                        {conn.lastSyncedAt && (
                          <span> &bull; Đồng bộ: {formatRelativeTime(conn.lastSyncedAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RefreshCw size={14} className={isSyncingThis ? 'spin' : ''} />}
                      isLoading={isSyncingThis}
                      onClick={() => handleSync(conn.id)}
                      title="Quét và đồng bộ tệp mới nhất từ Google Drive"
                    >
                      Đồng bộ ngay
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReconnect(conn.id)}
                      title="Cấp lại quyền kết nối đầy đủ để đọc tất cả tệp và cho phép xóa tệp trên Google Drive"
                    >
                      Cấp lại quyền
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

                {/* Quota Progress Bar */}
                <div
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      marginBottom: '8px',
                    }}
                  >
                    <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                      Dung lượng Quota Drive
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {total > 0 ? (
                        <>
                          Đã dùng <strong>{formatBytes(used)}</strong> / {formatBytes(total)} (
                          <strong style={{ color: 'var(--color-success)' }}>
                            Còn trống {formatBytes(remaining)}
                          </strong>
                          )
                        </>
                      ) : (
                        'Đang cập nhật quota...'
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--color-border)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${percent}%`,
                        backgroundColor: progressColor,
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

