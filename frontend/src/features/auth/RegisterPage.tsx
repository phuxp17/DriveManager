import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/common/Alert';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const errs: { [key: string]: string } = {};

    if (!displayName.trim()) {
      errs.displayName = 'Vui lòng nhập tên hiển thị.';
    } else if (displayName.length > 120) {
      errs.displayName = 'Tên hiển thị tối đa 120 ký tự.';
    }

    if (!email.trim()) {
      errs.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Định dạng email không hợp lệ.';
    } else if (email.length > 320) {
      errs.email = 'Email không được vượt quá 320 ký tự.';
    }

    if (!password) {
      errs.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length < 12) {
      errs.password = 'Mật khẩu phải có độ dài tối thiểu 12 ký tự.';
    } else if (new TextEncoder().encode(password).length > 72) {
      errs.password = 'Mật khẩu không được vượt quá 72 bytes.';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });

      navigate('/login', { state: { registered: true } });
    } catch (err: any) {
      if (err?.status === 409) {
        setErrors({ general: 'Địa chỉ email này đã được sử dụng bởi một tài khoản khác.' });
      } else {
        setErrors({ general: err?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.' });
      }
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
          maxWidth: '440px',
          backgroundColor: 'var(--color-surface)',
          padding: '36px 32px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/logo.png" alt="" width={56} height={56} style={{ display: 'block', margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)' }}>
            Tạo tài khoản mới
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Bắt đầu quản lý thư viện và lưu trữ của bạn
          </p>
        </div>

        {errors.general && (
          <Alert type="error" message={errors.general} onClose={() => setErrors({})} />
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Tên hiển thị"
            placeholder="Nguyễn Văn A"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={errors.displayName}
            required
            autoFocus
          />

          <Input
            label="Địa chỉ Email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
            autoComplete="email"
          />

          <Input
            label="Mật khẩu (Tối thiểu 12 ký tự)"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
            autoComplete="new-password"
          />

          <Input
            label="Xác nhận mật khẩu"
            type="password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            required
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            style={{ marginTop: '8px' }}
          >
            Đăng ký tài khoản
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
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};
