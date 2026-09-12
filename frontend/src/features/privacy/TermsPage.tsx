import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileCheck, ArrowLeft, Globe, Mail } from 'lucide-react';
import styles from './PrivacyPolicyPage.module.css';

export const TermsPage: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'vi'>('en');
  const isEn = lang === 'en';

  return (
    <div className={styles.container}>
      <div className={styles.ambientBackground}>
        <div className={styles.auroraOrb1} />
        <div className={styles.auroraOrb2} />
        <div className={styles.gridPattern} />
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logoArea}>
            <div className={styles.logoIcon}>
              <img src="/logo.png" alt="DriveManager Logo" />
            </div>
            <span>DriveManager</span>
          </Link>

          <div className={styles.headerActions}>
            <button
              onClick={() => setLang(isEn ? 'vi' : 'en')}
              className={styles.langToggleBtn}
              title="Toggle Language"
            >
              <Globe size={14} />
              <span>{isEn ? 'Tiếng Việt' : 'English'}</span>
            </button>

            <Link to="/" className={styles.backHomeLink}>
              <ArrowLeft size={16} />
              <span>{isEn ? 'Back to Home' : 'Trang chủ'}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className={styles.mainLayout} style={{ gridTemplateColumns: '1fr' }}>
        <main className={styles.docBody}>
          <div className={styles.heroCard}>
            <div className={styles.badgePolicy}>
              <FileCheck size={14} />
              <span>{isEn ? 'Terms of Service' : 'Điều khoản Dịch vụ'}</span>
            </div>
            <h1 className={styles.pageTitle}>
              {isEn ? 'Terms of Service' : 'Điều khoản Sử dụng Dịch vụ'}
            </h1>
            <div className={styles.metaRow}>
              <span><strong>{isEn ? 'Effective Date:' : 'Hiệu lực từ:'}</strong> September 12, 2026</span>
              <span>&bull;</span>
              <span><strong>{isEn ? 'Service:' : 'Dịch vụ:'}</strong> DriveManager (drive.vplatform.dev)</span>
            </div>
          </div>

          <section className={styles.policySection}>
            <h2 className={styles.sectionHeading}>
              <Shield size={20} />
              <span>1. {isEn ? 'Acceptance of Terms' : 'Chấp thuận Điều khoản'}</span>
            </h2>
            <p className={styles.paragraph}>
              {isEn
                ? 'By creating an account or accessing DriveManager (https://drive.vplatform.dev), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the service.'
                : 'Bằng việc tạo tài khoản hoặc sử dụng dịch vụ DriveManager (https://drive.vplatform.dev), bạn đồng ý tuân thủ các Điều khoản Dịch vụ này và Chính sách Bảo mật của chúng tôi.'}
            </p>
          </section>

          <section className={styles.policySection}>
            <h2 className={styles.sectionHeading}>
              <Shield size={20} />
              <span>2. {isEn ? 'Cloud Storage Integration' : 'Tích hợp Dịch vụ Lưu trữ Đám mây'}</span>
            </h2>
            <p className={styles.paragraph}>
              {isEn
                ? 'DriveManager allows you to connect third-party storage providers such as Google Drive via standard OAuth 2.0 authorization. You retain complete ownership and responsibility for all content and files stored in your connected cloud accounts.'
                : 'DriveManager hỗ trợ kết nối các nhà cung cấp lưu trữ đám mây của bên thứ ba như Google Drive thông qua giao thức OAuth 2.0. Bạn luôn nắm giữ toàn quyền sở hữu và chịu trách nhiệm đối với các nội dung tệp tin của mình.'}
            </p>
          </section>

          <section className={styles.policySection}>
            <h2 className={styles.sectionHeading}>
              <Shield size={20} />
              <span>3. {isEn ? 'Acceptable Use' : 'Quy định Sử dụng Đúng đắn'}</span>
            </h2>
            <p className={styles.paragraph}>
              {isEn
                ? 'You agree not to use DriveManager for any unlawful activities, including distributing malicious software, infringing upon intellectual property rights, attempting unauthorized system access, or overloading service infrastructure.'
                : 'Bạn cam kết không sử dụng DriveManager cho các hoạt động trái pháp luật, phát tán phần mềm độc hại, vi phạm bản quyền sở hữu trí tuệ hoặc thực hiện các hành vi tấn công phá hoại hạ tầng hệ thống.'}
            </p>
          </section>

          <section className={styles.policySection}>
            <h2 className={styles.sectionHeading}>
              <Mail size={20} />
              <span>4. {isEn ? 'Contact' : 'Liên hệ'}</span>
            </h2>
            <p className={styles.paragraph}>
              {isEn
                ? 'For any legal or service inquiries, please contact us at: phuxp17@gmail.com.'
                : 'Mọi thắc mắc hoặc yêu cầu hỗ trợ pháp lý, vui lòng gửi email về: phuxp17@gmail.com.'}
            </p>
          </section>
        </main>
      </div>

      <footer className={styles.footer}>
        <p>&copy; 2026 DriveManager. {isEn ? 'All rights reserved.' : 'Bảo lưu mọi quyền.'}</p>
        <p style={{ marginTop: '8px', fontSize: '12px' }}>
          <Link to="/privacy" style={{ color: 'var(--color-primary)', marginRight: '16px' }}>
            {isEn ? 'Privacy Policy' : 'Chính sách bảo mật'}
          </Link>
          <Link to="/" style={{ color: 'var(--color-primary)' }}>
            {isEn ? 'Home' : 'Trang chủ'}
          </Link>
        </p>
      </footer>
    </div>
  );
};

export default TermsPage;
