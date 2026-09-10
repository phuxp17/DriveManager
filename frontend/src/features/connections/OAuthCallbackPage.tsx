import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Cloud, Loader2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { connectionsApi } from '../../api/connectionsApi';
import { queryClient } from '../../app/queryClient';

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const errorParam = searchParams.get('error');
  const stateParam = searchParams.get('state');
  const codeParam = searchParams.get('code');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (errorParam) {
      setStatus('error');
      setMessage(
        errorParam === 'access_denied'
          ? 'Bạn đã từ chối cấp quyền truy cập Google Drive.'
          : `Lỗi xác thực OAuth: ${errorParam}`
      );
      return;
    }

    if (!stateParam || !codeParam) {
      setStatus('error');
      setMessage('Phản hồi OAuth thiếu mã xác thực hoặc trạng thái bảo mật. Vui lòng kết nối lại.');
      return;
    }

    const controller = new AbortController();
    connectionsApi.completeGoogleCallback(stateParam, codeParam, controller.signal)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['connections'] });
        setStatus('success');
        setMessage('Tài khoản Google Drive đã được kết nối thành công!');
      })
      .catch((err: any) => {
        if (err?.name === 'AbortError') return;
        setStatus('error');
        setMessage(err?.message || 'Không thể hoàn tất kết nối Google Drive. Vui lòng thử lại.');
      });

    return () => controller.abort();
  }, [codeParam, errorParam, stateParam]);

  return (
    <div
      style={{
        maxWidth: '500px',
        margin: '60px auto',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
        {status === 'loading' && <Loader2 size={40} className="spin" color="var(--color-primary)" />}
        {status === 'success' && <CheckCircle2 size={48} color="var(--color-success)" />}
        {status === 'error' && <AlertCircle size={48} color="var(--color-danger)" />}
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>
        {status === 'loading'
          ? 'Đang xử lý kết nối...'
          : status === 'success'
          ? 'Kết nối hoàn tất'
          : 'Kết nối không thành công'}
      </h2>

      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        {message}
      </p>

      <Button
        variant="primary"
        size="md"
        onClick={() => navigate('/app/connections')}
      >
        Quay lại trang Tài khoản lưu trữ
      </Button>
    </div>
  );
};
