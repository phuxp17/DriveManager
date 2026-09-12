import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Mail, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { Button } from '../../components/common/Button';
import { toast } from '../../components/common/Toast';
import styles from './AdminPage.module.css';

interface AdminAuthModalProps {
  adminEmail: string;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ adminEmail, onSuccess }) => {
  const [keyInput, setKeyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (cooldown > 0 || isSendingOtp) return;
    setIsSendingOtp(true);
    setErrorMsg(null);
    try {
      const res = await adminApi.sendOtp();
      toast.success(`Mã OTP 6 số đã được gửi tới ${res.email}`);
      setCooldown(60);
    } catch (err: any) {
      const msg = err?.message || 'Không thể gửi email OTP. Vui lòng thử lại sau.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key) {
      setErrorMsg('Vui lòng nhập mã bảo mật hoặc mã OTP.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);
    try {
      await adminApi.verify(key);
      toast.success('Mở khóa quyền Admin thành công!');
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Mã bảo mật hoặc mã OTP không chính xác.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={styles.lockOverlay}>
      <div className={styles.lockCard}>
        <div className={styles.lockIconHeader}>
          <ShieldAlert size={28} />
        </div>

        <div>
          <h2 className={styles.lockTitle}>Xác thực Quyền Quản trị (Admin 2FA)</h2>
          <p className={styles.lockSubtitle}>
            Hệ thống yêu cầu xác minh bảo mật cấp 2 để truy cập <strong>Admin Dashboard & Monitoring</strong>.
          </p>
        </div>

        <div className={styles.adminEmailBox}>
          <span style={{ color: 'var(--color-text-muted)' }}>Email nhận mã bảo mật: </span>
          <strong>{adminEmail || 'phuxp17@gmail.com'}</strong>
        </div>

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="adminKeyInput"
              style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}
            >
              Nhập Mã OTP (6 số) hoặc Master Key trong .env:
            </label>
            <input
              id="adminKeyInput"
              type="text"
              className={styles.keyInput}
              placeholder="VD: 123456 hoặc Master Key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoFocus
            />
          </div>

          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--color-danger)',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              type="button"
              variant="secondary"
              size="md"
              style={{ flex: 1 }}
              icon={isSendingOtp ? <RefreshCw size={15} className="animate-spin" /> : <Mail size={15} />}
              disabled={isSendingOtp || cooldown > 0}
              onClick={handleSendOtp}
            >
              {cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi mã về Mail'}
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              style={{ flex: 1 }}
              icon={isVerifying ? <RefreshCw size={15} className="animate-spin" /> : <KeyRound size={15} />}
              disabled={isVerifying || !keyInput.trim()}
            >
              {isVerifying ? 'Đang xác minh...' : 'Mở khóa'}
            </Button>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', margin: 0 }}>
            Tip: Bạn có thể nhập trực tiếp <code>ADMIN_SECURITY_KEY</code> đã cấu hình trong <code>.env</code> hoặc bấm nút gửi OTP về hòm thư <code>{adminEmail}</code>.
          </p>
        </form>
      </div>
    </div>
  );
};
