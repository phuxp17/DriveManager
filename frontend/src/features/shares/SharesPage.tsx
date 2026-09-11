import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CheckCircle,
  Clock,
  ExternalLink,
  Folder,
  RefreshCw,
  Share2,
  Trash2,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { sharesApi } from '../../api/sharesApi';
import { ShareResponse } from '../../api/types';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { ItemTypeIcon } from '../../components/items/ItemTypeIcon';
import { toast } from '../../components/common/Toast';
import { confirm } from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/dateUtils';

export const SharesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');

  // TanStack Query for shares (BUG-003)
  const {
    data: incoming = [],
    isLoading: isIncomingLoading,
    error: incomingError,
    refetch: refetchIncoming,
  } = useQuery({
    queryKey: ['shares', 'incoming'],
    queryFn: () => sharesApi.listIncoming(),
  });

  const {
    data: outgoing = [],
    isLoading: isOutgoingLoading,
    error: outgoingError,
    refetch: refetchOutgoing,
  } = useQuery({
    queryKey: ['shares', 'outgoing'],
    queryFn: () => sharesApi.listOutgoing(),
  });

  const isLoading = isIncomingLoading || isOutgoingLoading;
  const error = incomingError
    ? (incomingError as any)?.message || 'Lỗi tải lời mời nhận được.'
    : outgoingError
    ? (outgoingError as any)?.message || 'Lỗi tải danh sách đã chia sẻ.'
    : null;

  const invalidateShares = () => {
    queryClient.invalidateQueries({ queryKey: ['shares'] });
  };

  const acceptMutation = useMutation({
    mutationFn: (id: string) => sharesApi.accept(id),
    onSuccess: () => {
      invalidateShares();
      toast.success('Đã chấp nhận chia sẻ thành công.');
    },
    onError: (err: any) => toast.error(err?.message || 'Không thể chấp nhận chia sẻ.'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => sharesApi.reject(id),
    onSuccess: () => {
      invalidateShares();
      toast.success('Đã từ chối chia sẻ.');
    },
    onError: (err: any) => toast.error(err?.message || 'Không thể từ chối chia sẻ.'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => sharesApi.revokeOrLeave(id),
    onSuccess: () => {
      invalidateShares();
      toast.success('Đã hủy liên kết chia sẻ.');
    },
    onError: (err: any) => toast.error(err?.message || 'Không thể thực hiện thao tác.'),
  });

  const handleAccept = (id: string) => {
    acceptMutation.mutate(id);
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(id);
  };

  const handleRevokeOrLeave = async (id: string, isIncoming: boolean) => {
    const title = isIncoming ? 'Rời khỏi mục chia sẻ' : 'Thu hồi quyền truy cập';
    const msg = isIncoming
      ? 'Bạn có chắc muốn rời khỏi mục chia sẻ này? Bạn sẽ không còn quyền truy cập nội dung nữa.'
      : 'Bạn có chắc muốn thu hồi quyền truy cập của người nhận này? Người nhận sẽ không còn thấy mục này nữa.';
    const ok = await confirm({
      title,
      message: msg,
      confirmText: isIncoming ? 'Rời khỏi' : 'Thu hồi',
      variant: 'warning',
    });
    if (ok) {
      revokeMutation.mutate(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
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
          <Share2 size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
            Quản lý Chia sẻ (VIEW)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Kiểm soát các tài nguyên bạn chia sẻ với người khác hoặc được mời xem
          </p>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={() => {
                refetchIncoming();
                refetchOutgoing();
              }}
            >
              Thử lại
            </Button>
          }
        />
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          gap: '8px',
        }}
      >
        <button
          onClick={() => setActiveTab('incoming')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 600,
            borderBottom: activeTab === 'incoming' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'incoming' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
          }}
        >
          Lời mời nhận được ({incoming.length})
        </button>

        <button
          onClick={() => setActiveTab('outgoing')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 600,
            borderBottom: activeTab === 'outgoing' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'outgoing' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
          }}
        >
          Đã chia sẻ đi ({outgoing.length})
        </button>
      </div>

      {/* Tab content */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Skeleton width="100%" height="70px" />
          <Skeleton width="100%" height="70px" />
        </div>
      ) : activeTab === 'incoming' ? (
        incoming.length === 0 ? (
          <EmptyState
            icon={<Share2 size={28} />}
            title="Chưa có lời mời chia sẻ nào"
            description="Khi người khác chia sẻ liên kết hoặc bộ sưu tập với email của bạn, chúng sẽ xuất hiện tại đây."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {incoming.map((share) => (
              <div
                key={share.id}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {share.targetType === 'COLLECTION' ? (
                    <Folder size={24} color="var(--color-primary)" />
                  ) : (
                    <ItemTypeIcon type="LINK" size={24} />
                  )}

                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {share.targetName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Từ: <strong>{share.ownerEmail}</strong> &bull; Loại:{' '}
                      {share.targetType === 'COLLECTION' ? 'Bộ sưu tập' : 'Mục'} &bull; Quyền:{' '}
                      <span style={{ fontWeight: 500 }}>{share.permission}</span> &bull; Ngày gửi:{' '}
                      {formatDate(share.createdAt)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {share.status === 'PENDING' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Check size={14} />}
                        onClick={() => handleAccept(share.id)}
                        isLoading={acceptMutation.isPending}
                      >
                        Chấp nhận
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<X size={14} />}
                        onClick={() => handleReject(share.id)}
                        isLoading={rejectMutation.isPending}
                      >
                        Từ chối
                      </Button>
                    </>
                  )}

                  {share.status === 'ACCEPTED' && (
                    <>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--color-success)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginRight: '8px',
                        }}
                      >
                        <CheckCircle size={14} /> Đã chấp nhận
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeOrLeave(share.id, true)}
                        isLoading={revokeMutation.isPending}
                      >
                        Rời khỏi
                      </Button>
                    </>
                  )}

                  {share.status === 'REJECTED' && (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Đã từ chối
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : outgoing.length === 0 ? (
        <EmptyState
          icon={<Share2 size={28} />}
          title="Bạn chưa chia sẻ mục nào"
          description="Để chia sẻ, hãy nhấn nút 'Chia sẻ' tại bất kỳ mục hoặc bộ sưu tập nào."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {outgoing.map((share) => (
            <div
              key={share.id}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {share.targetType === 'COLLECTION' ? (
                  <Folder size={24} color="var(--color-primary)" />
                ) : (
                  <ItemTypeIcon type="LINK" size={24} />
                )}

                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                    {share.targetName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Chia sẻ tới: <strong>{share.recipientEmail}</strong> &bull; Quyền:{' '}
                    <span style={{ fontWeight: 500 }}>{share.permission}</span> &bull; Trạng thái:{' '}
                    <span
                      style={{
                        fontWeight: 500,
                        color:
                          share.status === 'ACCEPTED'
                            ? 'var(--color-success)'
                            : share.status === 'PENDING'
                            ? 'var(--color-warning)'
                            : 'var(--color-text-muted)',
                      }}
                    >
                      {share.status === 'ACCEPTED'
                        ? 'Đã chấp nhận'
                        : share.status === 'PENDING'
                        ? 'Chờ chấp nhận'
                        : share.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => handleRevokeOrLeave(share.id, false)}
                  isLoading={revokeMutation.isPending}
                >
                  Thu hồi quyền
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
