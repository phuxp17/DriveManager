import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HardDrive, Lock, Mail } from 'lucide-react';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read success message from registration if present
  const registrationSuccess = (location.state as any)?.registered;
  const verification = new URLSearchParams(location.search).get('verification');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login({ email: email.trim(), password });
      const returnUrl = (location.state as any)?.from?.pathname || '/app';
      navigate(returnUrl, { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED'
          ? 'Bạn cần nhấn nút xác minh trong email trước khi đăng nhập.'
          : err instanceof ApiError && err.status === 401
          ? 'Email hoặc mật khẩu không chính xác.'
          : err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'var(--color-surface)',
          padding: '36px 32px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <HardDrive size={24} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)' }}>
            Đăng nhập DriveManager
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Quản lý thư viện cá nhân và lưu trữ đám mây
          </p>
        </div>

        {registrationSuccess && (
          <Alert
            type="success"
            message="Đã gửi email xác minh. Hãy nhấn nút Xác minh email trước khi đăng nhập."
          />
        )}

        {verification === 'success' && (
          <Alert type="success" message="Xác minh email thành công. Bạn có thể đăng nhập." />
        )}

        {verification === 'invalid' && (
          <Alert type="error" message="Liên kết xác minh không hợp lệ, đã hết hạn hoặc đã được sử dụng." />
        )}

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Địa chỉ Email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            autoFocus
          />

          <Input
            label="Mật khẩu"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            style={{ marginTop: '8px' }}
          >
            Đăng nhập
          </Button>
        </form>

        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '20px',
          }}
        >
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
};
