import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Filter, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { adminApi, PaginatedLogs } from '../../../api/adminApi';
import { Button } from '../../../components/common/Button';
import styles from '../AdminPage.module.css';

export const AdminLogsTab: React.FC = () => {
  const [logsData, setLogsData] = useState<PaginatedLogs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);

  const fetchLogs = async (targetPage = page) => {
    setIsLoading(true);
    try {
      const data = await adminApi.getLogs({
        path: searchQuery.trim() || undefined,
        status: statusFilter,
        page: targetPage,
        size: 20,
      });
      setLogsData(data);
      setPage(targetPage);
    } catch (err) {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(0);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(0);
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return `${styles.methodBadge} ${styles.methodGet}`;
      case 'POST': return `${styles.methodBadge} ${styles.methodPost}`;
      case 'PUT':
      case 'PATCH': return `${styles.methodBadge} ${styles.methodPut}`;
      case 'DELETE': return `${styles.methodBadge} ${styles.methodDelete}`;
      default: return styles.methodBadge;
    }
  };

  const getStatusClass = (status: number) => {
    if (status >= 200 && status < 300) return styles.status2xx;
    if (status >= 300 && status < 400) return styles.status3xx;
    if (status >= 400 && status < 500) return styles.status4xx;
    return styles.status5xx;
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' ' + date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0 12px',
              width: '100%',
              maxWidth: '360px',
            }}
          >
            <Search size={15} color="var(--color-text-muted)" />
            <input
              type="text"
              placeholder="Tìm theo URL hoặc IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                height: '36px',
                width: '100%',
                color: 'var(--color-text)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Tìm
          </Button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Filter size={14} color="var(--color-text-muted)" />
            <select
              value={statusFilter ?? ''}
              onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : undefined)}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                color: 'var(--color-text)',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="200">200 OK</option>
              <option value="201">201 Created</option>
              <option value="400">400 Bad Request</option>
              <option value="401">401 Unauthorized</option>
              <option value="403">403 Forbidden</option>
              <option value="404">404 Not Found</option>
              <option value="500">500 Server Error</option>
            </select>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
            onClick={() => fetchLogs(page)}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>IP</th>
              <th>Method</th>
              <th>URL / Endpoint</th>
              <th>Trạng thái</th>
              <th>Tài khoản</th>
              <th>Độ trễ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !logsData ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  Đang tải nhật ký truy cập...
                </td>
              </tr>
            ) : !logsData || logsData.content.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  Không có bản ghi nhật ký nào phù hợp.
                </td>
              </tr>
            ) : (
              logsData.content.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.clientIp}</td>
                  <td>
                    <span className={getMethodBadgeClass(log.httpMethod)}>{log.httpMethod}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12.5px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.path}>
                    {log.path}
                  </td>
                  <td>
                    <span className={getStatusClass(log.statusCode)}>{log.statusCode}</span>
                  </td>
                  <td style={{ fontSize: '12px', color: log.userEmail ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                    {log.userEmail || 'Khách ẩn danh'}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {log.durationMs} ms
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {logsData && logsData.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>
            Trang {logsData.number + 1} / {logsData.totalPages} ({logsData.totalElements} bản ghi)
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft size={15} />}
              disabled={page === 0 || isLoading}
              onClick={() => fetchLogs(page - 1)}
            >
              Trước
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronRight size={15} />}
              disabled={page >= logsData.totalPages - 1 || isLoading}
              onClick={() => fetchLogs(page + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
