import React from 'react';
import {
  Activity,
  Users,
  HardDrive,
  AlertTriangle,
  Clock,
  Server,
  Cpu,
  BarChart3,
  TrendingUp,
  Compass,
} from 'lucide-react';
import { AdminStats } from '../../../api/types';
import { formatBytes } from '../../../utils/dateUtils';
import styles from '../AdminPage.module.css';

interface AdminStatsTabProps {
  stats: AdminStats;
}

export const AdminStatsTab: React.FC<AdminStatsTabProps> = ({ stats }) => {
  const maxVisits = Math.max(...stats.visitsTimeline.map((t) => t.count), 1);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const usedMemBytes = stats.systemHealth.totalMemoryBytes - stats.systemHealth.freeMemoryBytes;
  const memPercent = Math.round((usedMemBytes / stats.systemHealth.maxMemoryBytes) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        {/* Total Visits */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
            <Activity size={18} />
          </div>
          <div className={styles.kpiLabel}>Lượt truy cập hôm nay</div>
          <div className={styles.kpiValue}>{stats.visitsToday.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>Tổng tích lũy: {stats.totalVisits.toLocaleString()} lượt</div>
        </div>

        {/* Unique Visitors */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
            <Compass size={18} />
          </div>
          <div className={styles.kpiLabel}>Khách duy nhất (IP)</div>
          <div className={styles.kpiValue}>{stats.uniqueVisitorsToday.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>Toàn thời gian: {stats.uniqueVisitors.toLocaleString()} IPs</div>
        </div>

        {/* Registered Users */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}>
            <Users size={18} />
          </div>
          <div className={styles.kpiLabel}>Người dùng hệ thống</div>
          <div className={styles.kpiValue}>{stats.totalUsers}</div>
          <div className={styles.kpiSubtext}>{stats.verifiedUsers} đã xác thực email &bull; {stats.adminUsers} admin</div>
        </div>

        {/* Cloud Connections */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrap} style={{ background: 'rgba(66, 133, 244, 0.15)', color: '#4285F4' }}>
            <HardDrive size={18} />
          </div>
          <div className={styles.kpiLabel}>Google Drive liên kết</div>
          <div className={styles.kpiValue}>{stats.totalConnections}</div>
          <div className={styles.kpiSubtext}>
            {stats.totalFiles} tệp đã lập chỉ mục &bull; {formatBytes(stats.totalStorageBytes)}
          </div>
        </div>

        {/* Error Rate */}
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIconWrap}
            style={{
              background: stats.errorRatePercent > 5 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: stats.errorRatePercent > 5 ? '#EF4444' : '#10B981',
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <div className={styles.kpiLabel}>Tỷ lệ lỗi (4xx / 5xx)</div>
          <div className={styles.kpiValue}>{stats.errorRatePercent}%</div>
          <div className={styles.kpiSubtext}>Độ trễ trung bình: {stats.averageLatencyMs} ms</div>
        </div>
      </div>

      {/* Traffic Timeline Chart */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <BarChart3 size={18} color="var(--color-primary)" />
            <span>Biểu đồ Lưu lượng Truy cập (7 ngày gần nhất)</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Lượt xem trang &amp; Lời gọi API theo ngày
          </span>
        </div>

        <div className={styles.chartContainer}>
          {stats.visitsTimeline.map((item) => {
            const heightPercent = Math.max(Math.round((item.count / maxVisits) * 100), 4);
            const errorPercent = item.count > 0 ? Math.round((item.errors / item.count) * 100) : 0;
            return (
              <div key={item.label} className={styles.chartBarCol}>
                <span className={styles.chartBarValue}>{item.count}</span>
                <div className={styles.chartBarTrack}>
                  <div
                    className={styles.chartBarFill}
                    style={{ height: `${heightPercent}%` }}
                    title={`${item.label}: ${item.count} lượt truy cập (${item.errors} lỗi)`}
                  />
                  {item.errors > 0 && (
                    <div
                      className={styles.chartBarFillError}
                      style={{ height: `${(heightPercent * errorPercent) / 100}%` }}
                      title={`${item.errors} yêu cầu lỗi`}
                    />
                  )}
                </div>
                <span className={styles.chartBarLabel}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Grid: Top Endpoints & Server Health */}
      <div className={styles.panelsGrid}>
        {/* Top Endpoints */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <TrendingUp size={18} color="#3B82F6" />
              <span>Đường dẫn (Endpoints) được truy cập nhiều nhất</span>
            </div>
          </div>

          <div className={styles.pathList}>
            {stats.topPaths.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Chưa có dữ liệu truy cập.
              </p>
            ) : (
              stats.topPaths.map((p, idx) => (
                <div key={p.path} className={styles.pathItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600, width: '16px' }}>
                      {idx + 1}.
                    </span>
                    <span className={styles.pathName} title={p.path}>
                      {p.path}
                    </span>
                  </div>
                  <span className={styles.pathBadge}>{p.count.toLocaleString()} lượt</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System & Server Health */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <Server size={18} color="#10B981" />
              <span>Trạng thái Máy chủ &amp; Tài nguyên</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
            {/* RAM Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Bộ nhớ JVM Heap:</span>
                <span style={{ fontWeight: 600 }}>
                  {formatBytes(usedMemBytes)} / {formatBytes(stats.systemHealth.maxMemoryBytes)} ({memPercent}%)
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--color-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(memPercent, 100)}%`,
                    height: '100%',
                    background: memPercent > 80 ? '#EF4444' : memPercent > 60 ? '#F59E0B' : '#10B981',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* CPU Processors */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-muted)' }}>
                <Cpu size={15} /> Số nhân CPU khả dụng:
              </span>
              <span style={{ fontWeight: 600 }}>{stats.systemHealth.availableProcessors} Cores</span>
            </div>

            {/* Server Uptime */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-muted)' }}>
                <Clock size={15} /> Thời gian hoạt động (Uptime):
              </span>
              <span style={{ fontWeight: 600, color: '#10B981' }}>{formatUptime(stats.systemHealth.uptimeSeconds)}</span>
            </div>

            {/* Database & Resend status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Cơ sở dữ liệu:</span>
              <span style={{ fontWeight: 600, color: '#10B981' }}>PostgreSQL (Connected)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Dịch vụ Email:</span>
              <span style={{ fontWeight: 600, color: '#10B981' }}>Resend API (Sẵn sàng)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
