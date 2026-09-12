import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Activity,
  ListOrdered,
  Users,
  RefreshCw,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { AdminAuthModal } from './AdminAuthModal';
import { AdminStatsTab } from './components/AdminStatsTab';
import { AdminLogsTab } from './components/AdminLogsTab';
import { AdminUsersTab } from './components/AdminUsersTab';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import styles from './AdminPage.module.css';

export const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'stats' | 'logs' | 'users'>('stats');

  // Query 1: Admin Auth & 2FA Status
  const {
    data: authStatus,
    isLoading: isAuthLoading,
    error: authError,
    refetch: refetchAuth,
  } = useQuery({
    queryKey: ['admin', 'authStatus'],
    queryFn: () => adminApi.getAuthStatus(),
  });

  // Query 2: Admin Monitoring Stats (only if 2FA is verified)
  const isUnlocked = authStatus?.isAdmin && authStatus?.is2faVerified;

  const {
    data: stats,
    isLoading: isStatsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    enabled: !!isUnlocked,
    refetchInterval: 30000, // auto refresh every 30s
  });

  if (isAuthLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 0' }}>
        <Skeleton width="100%" height="80px" />
        <Skeleton width="100%" height="320px" />
      </div>
    );
  }

  if (authError || !authStatus?.isAdmin) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 24px',
          textAlign: 'center',
          maxWidth: '540px',
          margin: '40px auto',
        }}
      >
        <Lock size={40} color="var(--color-danger)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>
          Quyền truy cập bị từ chối
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          Bạn cần đăng nhập bằng tài khoản có quyền Quản trị viên (ROLE_ADMIN) để truy cập khu vực này.
        </p>
        <Link to="/app" style={{ textDecoration: 'none' }}>
          <Button variant="primary" size="md" icon={<ArrowLeft size={16} />}>
            Trở về ứng dụng
          </Button>
        </Link>
      </div>
    );
  }

  // If not 2FA verified yet, show Lock / OTP verification screen
  if (!authStatus.is2faVerified) {
    return (
      <AdminAuthModal
        adminEmail={authStatus.adminEmail}
        onSuccess={() => {
          refetchAuth();
          queryClient.invalidateQueries({ queryKey: ['admin'] });
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Top Banner */}
      <div className={styles.headerBanner}>
        <div className={styles.titleArea}>
          <div className={styles.adminIconWrap}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className={styles.pageTitle}>Admin Dashboard &amp; Giám sát Hệ thống</h1>
            <p className={styles.pageSubtitle}>
              Theo dõi lượt truy cập thời gian thực, quản lý người dùng và trạng thái vận hành máy chủ
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot} />
            <span>2FA Đã xác thực</span>
          </div>

          <Button
            variant="secondary"
            size="md"
            icon={<RefreshCw size={15} />}
            onClick={() => {
              refetchStats();
              queryClient.invalidateQueries({ queryKey: ['admin'] });
            }}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tabButton} ${activeTab === 'stats' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <Activity size={16} />
          <span>Tổng quan &amp; Giám sát (Metrics)</span>
        </button>

        <button
          className={`${styles.tabButton} ${activeTab === 'logs' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <ListOrdered size={16} />
          <span>Nhật ký truy cập (Live Access Logs)</span>
        </button>

        <button
          className={`${styles.tabButton} ${activeTab === 'users' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>Quản lý Người dùng (Users)</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'stats' && (
        <>
          {isStatsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Skeleton width="100%" height="100px" />
              <Skeleton width="100%" height="240px" />
            </div>
          ) : stats ? (
            <AdminStatsTab stats={stats} />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-danger)' }}>
              Không thể tải số liệu thống kê. Vui lòng thử lại.
            </div>
          )}
        </>
      )}

      {activeTab === 'logs' && <AdminLogsTab />}

      {activeTab === 'users' && <AdminUsersTab />}
    </div>
  );
};

export default AdminPage;
