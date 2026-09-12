import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  HardDrive,
  Eye,
  Trash2,
  Mail,
  ArrowLeft,
  Globe,
  ExternalLink,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import styles from './PrivacyPolicyPage.module.css';

export const PrivacyPolicyPage: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'vi'>('en');

  const isEn = lang === 'en';

  return (
    <div className={styles.container}>
      {/* Background ambient lighting */}
      <div className={styles.ambientBackground}>
        <div className={styles.auroraOrb1} />
        <div className={styles.auroraOrb2} />
        <div className={styles.gridPattern} />
      </div>

      {/* Header */}
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

      {/* Main Layout */}
      <div className={styles.mainLayout}>
        {/* Table of Contents */}
        <aside className={styles.tocSidebar}>
          <div className={styles.tocTitle}>{isEn ? 'Contents' : 'Mục lục'}</div>
          <nav className={styles.tocNav}>
            <a href="#overview" className={styles.tocLink}>
              1. {isEn ? 'Overview & Scope' : 'Tổng quan & Phạm vi'}
            </a>
            <a href="#data-collection" className={styles.tocLink}>
              2. {isEn ? 'Data We Collect' : 'Dữ liệu thu thập'}
            </a>
            <a href="#data-usage" className={styles.tocLink}>
              3. {isEn ? 'How We Use Data' : 'Mục đích sử dụng'}
            </a>
            <a href="#google-limited-use" className={styles.tocLink}>
              4. {isEn ? 'Google Limited Use' : 'Tuân thủ Google Limited Use'}
            </a>
            <a href="#security" className={styles.tocLink}>
              5. {isEn ? 'Security & Encryption' : 'Bảo mật & Mã hóa'}
            </a>
            <a href="#retention-deletion" className={styles.tocLink}>
              6. {isEn ? 'Retention & Deletion' : 'Lưu trữ & Xóa dữ liệu'}
            </a>
            <a href="#contact" className={styles.tocLink}>
              7. {isEn ? 'Contact Information' : 'Thông tin liên hệ'}
            </a>
          </nav>
        </aside>

        {/* Document Body */}
        <main className={styles.docBody}>
          {/* Hero / Header Card */}
          <div className={styles.heroCard}>
            <div className={styles.badgePolicy}>
              <ShieldCheck size={14} />
              <span>{isEn ? 'Official Privacy Policy' : 'Chính sách Quyền riêng tư Chính thức'}</span>
            </div>
            <h1 className={styles.pageTitle}>
              {isEn
                ? 'Privacy Policy & Google API Data Disclosure'
                : 'Chính sách Bảo mật & Minh bạch Dữ liệu Google API'}
            </h1>
            <div className={styles.metaRow}>
              <span>
                <strong>{isEn ? 'Application:' : 'Ứng dụng:'}</strong> DriveManager (
                <a href="https://drive.vplatform.dev" style={{ color: 'var(--color-primary)' }}>
                  drive.vplatform.dev
                </a>
                )
              </span>
              <span>&bull;</span>
              <span>
                <strong>{isEn ? 'Last Updated:' : 'Cập nhật:'}</strong> September 12, 2026
              </span>
              <span>&bull;</span>
              <span>
                <strong>{isEn ? 'Contact:' : 'Email hỗ trợ:'}</strong> phuxp17@gmail.com
              </span>
            </div>
          </div>

          {/* Section 1: Overview */}
          <section id="overview" className={styles.policySection}>
            <h2 className={styles.sectionHeading}>
              <FileText size={20} />
              <span>1. {isEn ? 'Overview & Purpose of the Application' : 'Tổng quan & Mục đích ứng dụng'}</span>
            </h2>
            <p className={styles.paragraph}>
              {isEn ? (
                <>
                  <strong>DriveManager</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), accessible at{' '}
                  <a href="https://drive.vplatform.dev">https://drive.vplatform.dev</a>, is a personal cloud storage hub
                  designed to help users consolidate, organize, and manage their cloud files. DriveManager integrates
                  with cloud storage services—principally <strong>Google Drive</strong>—to offer multi-dimensional
                  tagging, unified search, collections, and secure user-initiated file sharing.
                </>
              ) : (
                <>
                  <strong>DriveManager</strong> (&quot;chúng tôi&quot;), vận hành tại địa chỉ{' '}
                  <a href="https://drive.vplatform.dev">https://drive.vplatform.dev</a>, là nền tảng quản lý lưu trữ đám
                  mây hợp nhất nhằm giúp người dùng tổng hợp, sắp xếp và quản lý tệp tin. DriveManager tích hợp trực tiếp
                  với dịch vụ lưu trữ đám mây <strong>Google Drive</strong> qua giao thức chuẩn OAuth 2.0 để hỗ trợ gắn
                  thẻ đa chiều, tìm kiếm tức thì và chia sẻ tệp có mật khẩu bảo vệ.
                </>
              )}
            </p>
            <p className={styles.paragraph}>
              {isEn
                ? 'We believe privacy is a fundamental right. This Privacy Policy details what information we collect, how that information is utilized, how we protect it, and the comprehensive control you retain over your data at all times.'
                : 'Chúng tôi cam kết tôn trọng tuyệt đối quyền riêng tư của bạn. Chính sách này giải thích chi tiết các loại thông tin được thu thập, cách sử dụng, biện pháp mã hóa bảo vệ và toàn quyền kiểm soát của bạn đối với dữ liệu cá nhân.'}
            </p>
          </section>

          {/* Section 2: Data Collection */}
          <section id="data-collection" className={styles.policySection}>
            <h2 className={styles.sectionHeading}>
              <HardDrive size={20} />
              <span>2. {isEn ? 'Data We Collect' : 'Các loại Dữ liệu chúng tôi thu thập'}</span>
            </h2>
            <p className={styles.paragraph}>
              {isEn
                ? 'DriveManager strictly collects only the data necessary to provide and secure our storage hub features:'
                : 'DriveManager chỉ thu thập các dữ liệu tối thiểu và cần thiết để vận hành và bảo vệ các tính năng của dịch vụ:'}
            </p>

            <ul className={styles.list}>
              <li>
                <strong>{isEn ? 'User Account Information:' : 'Thông tin tài khoản DriveManager:'}</strong>{' '}
                {isEn
                  ? 'When you register, we collect your email address, display name, and a salted bcrypt cryptographic hash of your password. We never store plain text passwords.'
                  : 'Khi đăng ký, chúng tôi ghi nhận địa chỉ email, tên hiển thị và mật khẩu đã được mã hóa một chiều bằng thuật toán BCrypt. Chúng tôi không bao giờ lưu mật khẩu dưới dạng văn bản thô.'}
              </li>
              <li>
                <strong>{isEn ? 'Google Account & OAuth 2.0 Credentials:' : 'Thông tin tài khoản Google & OAuth 2.0:'}</strong>{' '}
                {isEn
                  ? 'When you link your Google Drive, we collect your Google email address, account identifier, and OAuth 2.0 authorization tokens. Refresh tokens are stored strictly encrypted at rest using AES-256 GCM encryption.'
                  : 'Khi bạn liên kết tài khoản Google Drive, chúng tôi tiếp nhận địa chỉ email Google, định danh tài khoản và token ủy quyền OAuth 2.0. Refresh token được lưu trữ mã hóa tuyệt đối bằng thuật toán AES-256 GCM.'}
              </li>
              <li>
                <strong>{isEn ? 'Google Drive Metadata & Files:' : 'Metadata tệp tin Google Drive:'}</strong>{' '}
                {isEn
                  ? 'To index and manage your files within DriveManager, we retrieve file metadata including: Google Drive File ID, file name, MIME type, file size, folder hierarchy, last modified timestamp, and thumbnail/view URLs.'
                  : 'Để lập chỉ mục và quản lý tệp trên giao diện DriveManager, chúng tôi truy xuất metadata tệp bao gồm: ID tệp Google Drive, tên tệp, định dạng MIME, kích thước tệp, phân cấp thư mục, ngày cập nhật và đường dẫn xem trước.'}
              </li>
              <li>
                <strong>{isEn ? 'System Technical & Access Logs:' : 'Nhật ký kỹ thuật và lượt truy cập:'}</strong>{' '}
                {isEn
                  ? 'For rate-limiting, system monitoring, audit logging, and DDoS mitigation, our servers record standard HTTP request data: client IP address, timestamp, HTTP method, requested URL path, response status code, user agent, and request processing duration.'
                  : 'Để phục vụ giám sát hệ thống, kiểm soát lượt truy cập, giới hạn tần suất (rate-limiting) và phòng chống tấn công mạng, máy chủ ghi nhận các thông tin kỹ thuật: địa chỉ IP, thời gian yêu cầu, phương thức HTTP, đường dẫn URL, mã phản hồi HTTP, User-Agent và độ trễ xử lý.'}
              </li>
            </ul>
          </section>

          {/* Section 3: Data Usage */}
          <section id="data-usage" className={styles.policySection}>
            <h2 className={styles.sectionHeading}>
              <Eye size={20} />
              <span>3. {isEn ? 'How We Use Your Data' : 'Mục đích Sử dụng Dữ liệu'}</span>
            </h2>
            <p className={styles.paragraph}>
              {isEn
                ? 'We utilize collected data exclusively for the functional operation of DriveManager:'
                : 'Chúng tôi sử dụng dữ liệu thu thập được duy nhất cho các mục đích vận hành chức năng của DriveManager:'}
            </p>
            <ul className={styles.list}>
              <li>
                {isEn
                  ? 'Syncing and presenting your Google Drive files in a responsive, fast user interface.'
                  : 'Đồng bộ và hiển thị trực quan các tệp Google Drive trong một giao diện tập trung, mượt mà.'}
              </li>
              <li>
                {isEn
                  ? 'Enabling multi-dimensional tagging, organizing files into custom collections, and full-text item search.'
                  : 'Hỗ trợ gắn thẻ (tags) đa chiều, nhóm tệp vào bộ sưu tập cá nhân và tìm kiếm nhanh.'}
              </li>
              <li>
                {isEn
                  ? 'Facilitating secure, user-initiated file sharing with customizable permissions, passwords, and link expirations.'
                  : 'Cho phép chia sẻ tệp theo chỉ định chủ động của người dùng với mật khẩu bảo vệ và thời hạn chia sẻ.'}
              </li>
              <li>
                {isEn
                  ? 'Monitoring system performance, maintaining access audit logs, and preventing unauthorized intrusions.'
                  : 'Theo dõi hiệu năng hệ thống, lưu nhật ký truy cập bảo mật và ngăn chặn các hành vi xâm nhập trái phép.'}
              </li>
            </ul>

            <div className={styles.highlightBox}>
              <div className={styles.highlightBoxTitle}>
                <CheckCircle2 size={16} />
                <span>{isEn ? 'Strict Prohibitions on Data Misuse' : 'Cam kết Tuyệt đối Không Lạm dụng Dữ liệu'}</span>
              </div>
              <ul className={styles.list} style={{ margin: 0 }}>
                <li>
                  <strong>{isEn ? 'NO Data Selling or Renting:' : 'KHÔNG bán hoặc cho thuê dữ liệu:'}</strong>{' '}
                  {isEn
                    ? 'We NEVER sell, trade, or transfer your personal data or Google Drive files to third parties or data brokers.'
                    : 'Chúng tôi KHÔNG BAO GIỜ bán, trao đổi hoặc chuyển giao dữ liệu cá nhân hay tệp Google Drive cho bất kỳ bên thứ ba hay đơn vị môi giới dữ liệu nào.'}
                </li>
                <li>
                  <strong>{isEn ? 'NO Advertising Use:' : 'KHÔNG sử dụng cho quảng cáo:'}</strong>{' '}
                  {isEn
                    ? 'We do NOT use or disclose user data to serve targeted advertisements, marketing campaigns, or credit evaluations.'
                    : 'Chúng tôi KHÔNG sử dụng dữ liệu người dùng để phân phát quảng cáo hướng đối tượng, tiếp thị hoặc đánh giá tín nhiệm.'}
                </li>
                <li>
                  <strong>{isEn ? 'NO AI/ML Model Training:' : 'KHÔNG dùng huấn luyện mô hình AI:'}</strong>{' '}
                  {isEn
                    ? 'We do NOT use Google Workspace APIs or user Drive files to develop, train, or improve generalized artificial intelligence (AI) and/or machine learning (ML) models.'
                    : 'Chúng tôi KHÔNG sử dụng Google Workspace API hoặc tệp Google Drive của người dùng để phát triển, huấn luyện hoặc cải thiện các mô hình Trí tuệ Nhân tạo (AI) / Machine Learning tổng quát.'}
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4: Google Limited Use Disclosure */}
          <section id="google-limited-use" className={styles.policySection}>
            <h2 className={styles.sectionHeading}>
              <ShieldCheck size={20} />
              <span>
                4.{' '}
                {isEn
                  ? 'Google API Services User Data Policy Compliance (Limited Use)'
                  : 'Tuân thủ Chính sách Dữ liệu Người dùng Google API (Limited Use)'}
              </span>
            </h2>

            <div className={styles.googleMandatoryBox}>
              <div className={styles.googleMandatoryTitle}>
                <CheckCircle2 size={18} />
                <span>{isEn ? 'Mandatory Google Limited Use Statement' : 'Tuyên bố Tuân thủ Bắt buộc của Google'}</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text)', margin: '8px 0' }}>
                &quot;DriveManager&apos;s use and transfer of information received from Google APIs to any other app will
                adhere to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#10B981', textDecoration: 'underline' }}
                >
                  Google API Services User Data Policy
                  <ExternalLink size={12} style={{ display: 'inline', marginLeft: '3px' }} />
                </a>
                , including the Limited Use requirements.&quot;
              </p>
            </div>

            <p className={styles.paragraph}>
              {isEn ? (
                <>
                  In strict accordance with Google&apos;s Limited Use requirements:
                  <br />
                  1. We only request OAuth scopes necessary to provide storage hub services (namely{' '}
                  <code>https://www.googleapis.com/auth/drive.file</code>, <code>https://www.googleapis.com/auth/drive</code>,{' '}
                  <code>openid</code>, and <code>email</code>).
                  <br />
                  2. No human beings are allowed to read or inspect your files or metadata, except if you provide explicit
                  written consent for technical support, if required for security investigations, or as mandated by applicable law.
                </>
              ) : (
                <>
                  Tuân thủ nghiêm ngặt các yêu cầu Giới hạn Sử dụng (Limited Use) của Google:
                  <br />
                  1. Chúng tôi chỉ yêu cầu các quyền truy cập (scopes) cần thiết để thực hiện tính năng quản lý tệp (cụ thể:{' '}
                  <code>https://www.googleapis.com/auth/drive.file</code>, <code>https://www.googleapis.com/auth/drive</code>,{' '}
                  <code>openid</code>, và <code>email</code>).
                  <br />
                  2. Không nhân sự nào được phép đọc hoặc xem nội dung tệp tin của bạn, trừ khi có sự đồng ý bằng văn bản của bạn
                  để khắc phục sự cố kỹ thuật hoặc theo yêu cầu của pháp luật.
                </>
              )}
            </p>
          </section>

          {/* Section 5: Security & Encryption */}
          <section id="security" className={styles.policySection}>
            <h2 className={styles.sectionHeading}>
              <Lock size={20} />
              <span>5. {isEn ? 'Security, Encryption & Storage' : 'Bảo mật, Mã hóa & Lưu trữ'}</span>
            </h2>
            <p className={styles.paragraph}>
              {isEn
                ? 'We implement defense-in-depth security measures to protect your information against unauthorized access, alteration, or disclosure:'
                : 'Chúng tôi áp dụng các biện pháp bảo mật đa tầng để bảo vệ thông tin của bạn khỏi truy cập trái phép hoặc rò rỉ:'}
            </p>
            <ul className={styles.list}>
              <li>
                <strong>{isEn ? 'Encryption in Transit:' : 'Mã hóa trong truyền tải:'}</strong>{' '}
                {isEn
                  ? 'All network communication between your browser and our servers uses TLS 1.3 / HTTPS encryption.'
                  : 'Mọi trao đổi dữ liệu giữa trình duyệt của bạn và máy chủ DriveManager đều được bảo vệ bằng giao thức HTTPS/TLS 1.3.'}
              </li>
              <li>
                <strong>{isEn ? 'Encryption at Rest:' : 'Mã hóa khi lưu trữ:'}</strong>{' '}
                {isEn
                  ? 'Google OAuth refresh tokens are encrypted at rest using AES-256 GCM cryptographic ciphers.'
                  : 'Token ủy quyền Google OAuth được mã hóa an toàn khi lưu trữ trong cơ sở dữ liệu bằng thuật toán AES-256 GCM.'}
              </li>
              <li>
                <strong>{isEn ? 'Session & Request Protection:' : 'Bảo vệ phiên và phòng ngừa tấn công:'}</strong>{' '}
                {isEn
                  ? 'We utilize HTTP-only, SameSite Secure session cookies, Double-Submit CSRF tokens, IP-based rate limiting, and two-factor authentication (2FA) for administrative access.'
                  : 'Hệ thống áp dụng cookie phiên an toàn (HTTP-Only, SameSite, Secure), CSRF Token chống giả mạo yêu cầu, bộ lọc giới hạn tần suất (Rate Limiting) và xác thực 2 bước (2FA) cho tài khoản quản trị viên.'}
              </li>
            </ul>
          </section>

          {/* Section 6: Retention & Deletion */}
          <section id="retention-deletion" className={styles.policySection}>
            <h2 className={styles.sectionHeading}>
              <Trash2 size={20} />
              <span>6. {isEn ? 'Data Retention, Revocation & Deletion' : 'Lưu trữ, Thu hồi Quyền & Xóa Dữ liệu'}</span>
            </h2>
            <p className={styles.paragraph}>
              {isEn
                ? 'You maintain complete control over your data and connected cloud storage accounts at all times:'
                : 'Bạn luôn giữ toàn quyền kiểm soát đối với dữ liệu và các tài khoản lưu trữ đã kết nối:'}
            </p>
            <ul className={styles.list}>
              <li>
                <strong>{isEn ? 'Disconnecting Google Drive within the App:' : 'Hủy liên kết Google Drive trong ứng dụng:'}</strong>{' '}
                {isEn
                  ? 'You can disconnect your Google Drive connection at any time in the "Storage Connections" settings. Disconnecting immediately and permanently wipes the stored encrypted OAuth refresh tokens from our active database.'
                  : 'Bạn có thể ngắt kết nối Google Drive bất kỳ lúc nào tại trang "Tài khoản lưu trữ". Thao tác này sẽ xóa vĩnh viễn refresh token đã mã hóa khỏi hệ thống máy chủ của chúng tôi.'}
              </li>
              <li>
                <strong>{isEn ? 'Revoking Permissions directly via Google:' : 'Thu hồi quyền truy cập trực tiếp từ Google:'}</strong>{' '}
                {isEn ? (
                  <>
                    You can revoke DriveManager&apos;s access to your Google account at any time via the Google Account
                    Security Settings page at:{' '}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      https://myaccount.google.com/permissions
                      <ExternalLink size={12} style={{ display: 'inline', marginLeft: '3px' }} />
                    </a>
                    .
                  </>
                ) : (
                  <>
                    Bạn có thể thu hồi quyền truy cập của DriveManager bất kỳ lúc nào trực tiếp tại trang Bảo mật Tài khoản Google:{' '}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      https://myaccount.google.com/permissions
                      <ExternalLink size={12} style={{ display: 'inline', marginLeft: '3px' }} />
                    </a>
                    .
                  </>
                )}
              </li>
              <li>
                <strong>{isEn ? 'Complete Account & Data Deletion Request:' : 'Yêu cầu xóa vĩnh viễn tài khoản & toàn bộ dữ liệu:'}</strong>{' '}
                {isEn
                  ? 'You can request the permanent deletion of your DriveManager account, profile, and all synced metadata by emailing phuxp17@gmail.com with the subject "Delete My Account". Your request will be fully processed and executed within 48 hours.'
                  : 'Bạn có thể yêu cầu xóa vĩnh viễn tài khoản và toàn bộ metadata đã lưu trên DriveManager bằng cách gửi email tới phuxp17@gmail.com với tiêu đề "Xóa tài khoản". Yêu cầu của bạn sẽ được thực hiện hoàn tất trong vòng 48 giờ.'}
              </li>
            </ul>
          </section>

          {/* Section 7: Contact Info */}
          <section id="contact" className={styles.policySection}>
            <h2 className={styles.sectionHeading}>
              <Mail size={20} />
              <span>7. {isEn ? 'Contact & Operational Information' : 'Thông tin Liên hệ & Chủ quản'}</span>
            </h2>
            <p className={styles.paragraph}>
              {isEn
                ? 'If you have any questions, feedback, or concerns regarding this Privacy Policy or our data practices, please contact our administrative team:'
                : 'Nếu bạn có bất kỳ câu hỏi, thắc mắc hoặc yêu cầu nào liên quan đến Chính sách Bảo mật này, vui lòng liên hệ ban quản trị:'}
            </p>

            <div className={styles.contactCard}>
              <div className={styles.contactItem}>
                <div className={styles.contactItemLabel}>{isEn ? 'Application Name' : 'Tên ứng dụng'}</div>
                <div className={styles.contactItemVal}>DriveManager</div>
              </div>
              <div className={styles.contactItem}>
                <div className={styles.contactItemLabel}>{isEn ? 'Official Website' : 'Trang chủ chính thức'}</div>
                <div className={styles.contactItemVal}>
                  <a href="https://drive.vplatform.dev" style={{ color: 'var(--color-primary)' }}>
                    https://drive.vplatform.dev
                  </a>
                </div>
              </div>
              <div className={styles.contactItem}>
                <div className={styles.contactItemLabel}>{isEn ? 'Data Protection Officer / Admin' : 'Email Quản trị / Hỗ trợ'}</div>
                <div className={styles.contactItemVal}>
                  <a href="mailto:phuxp17@gmail.com" style={{ color: 'var(--color-primary)' }}>
                    phuxp17@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>&copy; 2026 DriveManager. {isEn ? 'All rights reserved.' : 'Bảo lưu mọi quyền.'}</p>
        <p style={{ marginTop: '8px', fontSize: '12px' }}>
          <Link to="/" style={{ color: 'var(--color-primary)', marginRight: '16px' }}>
            {isEn ? 'Home' : 'Trang chủ'}
          </Link>
          <Link to="/terms" style={{ color: 'var(--color-primary)' }}>
            {isEn ? 'Terms of Service' : 'Điều khoản sử dụng'}
          </Link>
        </p>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
