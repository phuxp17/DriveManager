import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Clock,
  Cloud,
  ExternalLink,
  Inbox,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  Share2,
  UploadCloud,
} from 'lucide-react';
import { connectionsApi } from '../../api/connectionsApi';
import { itemsApi } from '../../api/itemsApi';
import { lifecycleApi } from '../../api/lifecycleApi';
import { sharesApi } from '../../api/sharesApi';
import { ItemEntry } from '../../api/types';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { CreateLinkModal } from '../../components/items/CreateLinkModal';
import { FileUploadModal } from '../../components/files/FileUploadModal';
import { ItemDetailDrawer } from '../../components/items/ItemDetailDrawer';
import { ItemTypeIcon } from '../../components/items/ItemTypeIcon';
import { useAuth } from '../../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Modals
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  // TanStack Query integration (BUG-001, BUG-003)
  const {
    data: recentData,
    isLoading: isRecentLoading,
    error: recentError,
    refetch: refetchRecent,
  } = useQuery({
    queryKey: ['items', 'recent'],
    queryFn: ({ signal }) => itemsApi.list({ view: 'recent', size: 5 }, signal),
  });

  const {
    data: inboxData,
    isLoading: isInboxLoading,
    error: inboxError,
    refetch: refetchInbox,
  } = useQuery({
    queryKey: ['items', 'inbox'],
    queryFn: ({ signal }) => itemsApi.list({ view: 'inbox', size: 5 }, signal),
  });

  const {
    data: incomingShares,
    isLoading: isSharesLoading,
    error: sharesError,
    refetch: refetchShares,
  } = useQuery({
    queryKey: ['shares', 'incoming'],
    queryFn: () => sharesApi.listIncoming(),
  });

  const {
    data: connections,
    isLoading: isConnectionsLoading,
    error: connectionsError,
    refetch: refetchConnections,
  } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list(),
  });

  const recentItems = recentData?.content || [];
  const inboxItems = inboxData?.content || [];
  const inboxCount = inboxData?.totalElements || 0;
  const pendingShares = (incomingShares || []).filter((s) => s.status === 'PENDING');
  const connectionsList = connections || [];

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
    queryClient.invalidateQueries({ queryKey: ['shares'] });
    queryClient.invalidateQueries({ queryKey: ['connections'] });
  };

  const handleOpenItem = async (item: ItemEntry) => {
    try {
      await lifecycleApi.recordOpen(item.id);
      queryClient.invalidateQueries({ queryKey: ['items', 'recent'] });
    } catch {
      // ignore
    }

    if (item.type === 'LINK' && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      window.open(itemsApi.getContentUrl(item.id), '_blank');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)' }}>
            Xin chào, {user?.displayName || 'bạn'}!
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Chào mừng bạn quay trở lại với thư viện cá nhân DriveManager
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="md"
            icon={<LinkIcon size={16} />}
            onClick={() => setCreateLinkOpen(true)}
          >
            Thêm liên kết
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={<UploadCloud size={16} />}
            onClick={() => setUploadFileOpen(true)}
          >
            Tải tệp lên
          </Button>
        </div>
      </div>

      {/* Grid of Dashboard Panels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Inbox panel */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Inbox size={18} color="var(--color-warning)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
                Hộp thư đến ({inboxCount})
              </h2>
            </div>
            <Link
              to="/app/library?view=inbox"
              style={{
                fontSize: '13px',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Xem tất cả</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {isInboxLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Skeleton width="100%" height="36px" />
              <Skeleton width="100%" height="36px" />
              <Skeleton width="100%" height="36px" />
            </div>
          ) : inboxError ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-danger)' }}>Lỗi tải Hộp thư đến.</span>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => refetchInbox()}>
                Thử lại
              </Button>
            </div>
          ) : inboxItems.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 'auto 0' }}>
              Tuyệt vời! Bạn không còn mục nào tồn đọng trong Inbox.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inboxItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-bg)',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <ItemTypeIcon type={item.type} size={16} />
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--color-text)',
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                      }}
                      onClick={() => setDetailItemId(item.id)}
                    >
                      {item.name}
                    </button>
                  </div>
                  <button
                    onClick={() => handleOpenItem(item)}
                    title="Mở"
                    aria-label={`Mở ${item.name}`}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent items panel */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--color-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
                Mở gần đây
              </h2>
            </div>
            <Link
              to="/app/library?view=recent"
              style={{
                fontSize: '13px',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Xem tất cả</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {isRecentLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Skeleton width="100%" height="36px" />
              <Skeleton width="100%" height="36px" />
              <Skeleton width="100%" height="36px" />
            </div>
          ) : recentError ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-danger)' }}>Lỗi tải mục mở gần đây.</span>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => refetchRecent()}>
                Thử lại
              </Button>
            </div>
          ) : recentItems.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 'auto 0' }}>
              Chưa có mục nào được mở gần đây.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-bg)',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <ItemTypeIcon type={item.type} size={16} />
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--color-text)',
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                      }}
                      onClick={() => setDetailItemId(item.id)}
                    >
                      {item.name}
                    </button>
                  </div>
                  <button
                    onClick={() => handleOpenItem(item)}
                    title="Mở"
                    aria-label={`Mở ${item.name}`}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming shares notifications */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Share2 size={18} color="var(--color-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
                Lời mời chia sẻ ({pendingShares.length})
              </h2>
            </div>
            <Link
              to="/app/shares"
              style={{
                fontSize: '13px',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Xem chi tiết</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {isSharesLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Skeleton width="100%" height="42px" />
              <Skeleton width="100%" height="42px" />
            </div>
          ) : sharesError ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-danger)' }}>Lỗi tải lời mời chia sẻ.</span>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => refetchShares()}>
                Thử lại
              </Button>
            </div>
          ) : pendingShares.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 'auto 0' }}>
              Không có lời mời chia sẻ mới nào đang chờ xử lý.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingShares.slice(0, 4).map((share) => (
                <div
                  key={share.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-bg)',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{share.targetName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Từ {share.ownerEmail} &bull; Quyền VIEW
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connected cloud storage */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cloud size={18} color="var(--color-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
                Tài khoản lưu trữ
              </h2>
            </div>
            <Link
              to="/app/connections"
              style={{
                fontSize: '13px',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Quản lý</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {isConnectionsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Skeleton width="100%" height="36px" />
              <Skeleton width="100%" height="36px" />
            </div>
          ) : connectionsError ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-danger)' }}>Lỗi tải tài khoản lưu trữ.</span>
              <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => refetchConnections()}>
                Thử lại
              </Button>
            </div>
          ) : connectionsList.length === 0 ? (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                Chưa có tài khoản Google Drive nào được kết nối.
              </p>
              <Link
                to="/app/connections"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: '32px',
                  padding: '4px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Kết nối Google Drive
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {connectionsList.map((conn) => (
                <div
                  key={conn.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-bg)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
                    {conn.displayName}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-success-subtle)',
                      color: 'var(--color-success)',
                      fontWeight: 600,
                    }}
                  >
                    Đã kết nối
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateLinkModal
        open={createLinkOpen}
        onOpenChange={setCreateLinkOpen}
        onSuccess={handleRefreshAll}
      />
      <FileUploadModal open={uploadFileOpen} onOpenChange={setUploadFileOpen} />
      <ItemDetailDrawer
        itemId={detailItemId}
        currentUserId={user?.id}
        onClose={() => setDetailItemId(null)}
        onUpdated={handleRefreshAll}
      />
    </div>
  );
};
