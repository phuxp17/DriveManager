import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HardDrive,
  Cloud,
  Zap,
  ShieldCheck,
  Share2,
  Tag,
  Search,
  Check,
  Copy,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Film,
  Lock,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './HomePage.module.css';

interface DemoFile {
  id: string;
  name: string;
  size: string;
  category: 'design' | 'finance' | 'media' | 'docs';
  icon: LucideIcon;
  color: string;
}

const DEMO_FILES: DemoFile[] = [
  { id: '1', name: 'UI_Design_System_v2.fig', size: '24.5 MB', category: 'design', icon: ImageIcon, color: '#8B5CF6' },
  { id: '2', name: 'Q4_Financial_Audit.xlsx', size: '3.8 MB', category: 'finance', icon: FileText, color: '#10B981' },
  { id: '3', name: 'Brand_Showreel_2026.mp4', size: '142.0 MB', category: 'media', icon: Film, color: '#F59E0B' },
  { id: '4', name: 'GoogleDrive_Backup.zip', size: '512.4 MB', category: 'docs', icon: HardDrive, color: '#3B82F6' },
  { id: '5', name: 'Client_Contract_Signed.pdf', size: '1.2 MB', category: 'docs', icon: FileText, color: '#EC4899' },
  { id: '6', name: 'Product_Mockups_3D.blend', size: '88.1 MB', category: 'design', icon: ImageIcon, color: '#6366F1' },
];

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  // Language state (defaults to English for international reviewers/bots, or Vietnamese if navigator indicates)
  const [lang, setLang] = useState<'en' | 'vi'>(() => {
    if (typeof window !== 'undefined' && navigator.language?.toLowerCase().startsWith('vi')) {
      return 'vi';
    }
    return 'en';
  });

  // Active showcase tab
  const [activeTab, setActiveTab] = useState<'sync' | 'tags' | 'share' | 'search'>('sync');

  // Interactive states for Tab 1: Sync
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState(148);

  const handleSimulateSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncCount((prev) => prev + 12);
    }, 1200);
  };

  // Interactive states for Tab 2: Tags
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Interactive states for Tab 3: Share
  const [copied, setCopied] = useState(false);
  const [requirePassword, setRequirePassword] = useState(true);
  const [activePermission, setActivePermission] = useState<'view' | 'download'>('download');

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Interactive states for Tab 4: Search
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSearchFiles = DEMO_FILES.filter((file) => {
    if (!searchQuery) return true;
    return file.name.toLowerCase().includes(searchQuery.toLowerCase()) || file.category.includes(searchQuery.toLowerCase());
  });

  const filteredTagFiles = selectedTag === 'all' 
    ? DEMO_FILES 
    : DEMO_FILES.filter((file) => file.category === selectedTag);

  return (
    <div className={styles.container}>
      {/* Background Ambient Aurora Motion */}
      <div className={styles.ambientBackground}>
        <div className={styles.auroraOrb1} />
        <div className={styles.auroraOrb2} />
        <div className={styles.auroraOrb3} />
        <div className={styles.gridPattern} />
      </div>

      {/* Glass Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logoArea} title="DriveManager Home">
            <div className={styles.logoIcon}>
              <img src="/logo.png" alt="DriveManager Logo" />
              <span className={styles.pulseDot} />
            </div>
            <span>DriveManager</span>
          </Link>

          <nav className={styles.navLinks}>
            <a href="#muc-dich" className={styles.navPill}>
              <ShieldCheck size={14} /> {lang === 'en' ? 'About & Purpose' : 'Mục đích ứng dụng'}
            </a>
            <a href="#tinh-nang" className={styles.navPill}>
              <Zap size={14} /> {lang === 'en' ? 'Features' : 'Tính năng'}
            </a>
            <a href="#dam-may" className={styles.navPill}>
              <Cloud size={14} /> {lang === 'en' ? 'Cloud' : 'Đám mây'}
            </a>
            <a href="#bao-mat" className={styles.navPill}>
              <Lock size={14} /> {lang === 'en' ? 'Security' : 'Bảo mật'}
            </a>
            <Link to="/privacy" className={styles.navPill}>
              <FileText size={14} /> {lang === 'en' ? 'Privacy Policy' : 'Chính sách bảo mật'}
            </Link>
          </nav>

          <div className={styles.headerActions}>
            {/* Language Switcher */}
            <div className={styles.langToggle}>
              <button
                type="button"
                className={`${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`}
                onClick={() => setLang('en')}
                title="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                className={`${styles.langBtn} ${lang === 'vi' ? styles.langBtnActive : ''}`}
                onClick={() => setLang('vi')}
                title="Chuyển sang Tiếng Việt"
              >
                VI
              </button>
            </div>

            {user ? (
              <Link to="/app" className={styles.btnPrimary}>
                <span>{lang === 'en' ? 'Open Dashboard' : 'Vào ứng dụng'}</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" className={styles.btnGhost}>
                  {lang === 'en' ? 'Sign In' : 'Đăng nhập'}
                </Link>
                <Link to="/register" className={styles.btnPrimary}>
                  <span>{lang === 'en' ? 'Get Started' : 'Bắt đầu ngay'}</span>
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.badgeMotion}>
          <Sparkles size={15} />
          <span>
            {lang === 'en'
              ? 'DriveManager 2.0 • Unified Cloud Storage & File Manager'
              : 'DriveManager 2.0 • Không gian lưu trữ đám mây hợp nhất'}
          </span>
        </div>

        {/* Prominent App Name in H1 to satisfy Google Branding Verification */}
        <h1 className={styles.heroTitle}>
          DriveManager — <span className={styles.gradientText}>
            {lang === 'en' ? 'Unified Cloud Storage' : 'Lưu Trữ Đám Mây Hợp Nhất'}
          </span>
        </h1>

        <p className={styles.heroSubtitle}>
          {lang === 'en'
            ? 'Connect your Google Drive, organize files across multi-dimensional tags, and share securely with password protection — all in one centralized dashboard.'
            : 'Đồng bộ Google Drive, phân loại đa chiều bằng Tag và chia sẻ bảo mật tức thì trên một giao diện thống nhất.'}
        </p>

        <div className={styles.heroCtaGroup}>
          <Link to={user ? "/app" : "/register"} className={styles.btnLargePrimary}>
            <span>{user ? (lang === 'en' ? "Open Dashboard" : "Mở Bảng điều khiển") : (lang === 'en' ? "Explore Free" : "Khám phá miễn phí")}</span>
            <ArrowRight size={18} />
          </Link>
          <a href="#muc-dich" className={styles.btnLargeGhost}>
            <ShieldCheck size={18} />
            <span>{lang === 'en' ? "Application Purpose" : "Mục đích ứng dụng"}</span>
          </a>
        </div>

        {/* =========================================================
            LIVE INTERACTIVE MOTION DEMO WIDGET
            ========================================================= */}
        <div id="live-demo" className={styles.interactiveShowcase}>
          {/* Top Window Bar */}
          <div className={styles.windowBar}>
            <div className={styles.windowDots}>
              <span className={`${styles.dot} ${styles.dotRed}`} />
              <span className={`${styles.dot} ${styles.dotYellow}`} />
              <span className={`${styles.dot} ${styles.dotGreen}`} />
            </div>
            <div className={styles.windowTitle}>
              <HardDrive size={13} />
              <span>drivemanager-vault // interactive-demo</span>
            </div>
            <div className={styles.statusIndicator}>
              <span className={styles.liveBeacon} />
              <span>Realtime Live</span>
            </div>
          </div>

          {/* Interactive Feature Tabs */}
          <div className={styles.tabBar}>
            <button
              className={`${styles.tabItem} ${activeTab === 'sync' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('sync')}
            >
              <Cloud size={15} />
              <span>{lang === 'en' ? 'Cloud Sync' : 'Đồng bộ Cloud'}</span>
            </button>
            <button
              className={`${styles.tabItem} ${activeTab === 'tags' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('tags')}
            >
              <Tag size={15} />
              <span>{lang === 'en' ? 'Collections & Tags' : 'Bộ sưu tập & Tag'}</span>
            </button>
            <button
              className={`${styles.tabItem} ${activeTab === 'share' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('share')}
            >
              <Share2 size={15} />
              <span>{lang === 'en' ? 'Secure Sharing' : 'Chia sẻ an toàn'}</span>
            </button>
            <button
              className={`${styles.tabItem} ${activeTab === 'search' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <Search size={15} />
              <span>{lang === 'en' ? 'Instant Search' : 'Tìm kiếm tức thì'}</span>
            </button>
          </div>

          {/* Tab Content Stage */}
          <div className={styles.stage}>
            {/* 1. Cloud Sync Motion Visual */}
            {activeTab === 'sync' && (
              <div className={styles.syncContainer}>
                <div className={`${styles.cloudCard} ${styles.cloudCardGoogle}`}>
                  <div className={styles.cardIconCircle}>
                    <Cloud size={24} />
                  </div>
                  <h4 className={styles.cloudName}>Google Drive</h4>
                  <span className={styles.cloudBadge}>{lang === 'en' ? 'OAuth 2.0 Connected' : 'OAuth 2.0 Đã liên kết'}</span>
                </div>

                <div className={styles.syncStream}>
                  <div className={styles.streamLine} />
                  <button
                    onClick={handleSimulateSync}
                    className={styles.streamPill}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                    <span>{isSyncing ? (lang === 'en' ? 'Syncing...' : 'Đang đồng bộ...') : `${lang === 'en' ? 'Auto-Sync' : 'Tự động đồng bộ'} (${syncCount} files)`}</span>
                  </button>
                </div>

                <div className={`${styles.cloudCard} ${styles.cloudCardHub}`}>
                  <div className={styles.cardIconCircle}>
                    <HardDrive size={24} />
                  </div>
                  <h4 className={styles.cloudName}>DriveManager Hub</h4>
                  <span className={styles.cloudBadge}>{lang === 'en' ? 'Status: Ready' : 'Trạng thái: Sẵn sàng'}</span>
                </div>
              </div>
            )}

            {/* 2. Smart Tags Filter Showcase */}
            {activeTab === 'tags' && (
              <div className={styles.tagsContainer}>
                <div className={styles.tagsRow}>
                  {[
                    { id: 'all', label: lang === 'en' ? 'All' : 'Tất cả' },
                    { id: 'design', label: lang === 'en' ? '🎨 Design' : '🎨 Thiết kế' },
                    { id: 'finance', label: lang === 'en' ? '📊 Finance' : '📊 Tài chính' },
                    { id: 'media', label: lang === 'en' ? '🎬 Media' : '🎬 Media' },
                    { id: 'docs', label: lang === 'en' ? '📄 Documents' : '📄 Tài liệu' },
                  ].map((tag) => (
                    <button
                      key={tag.id}
                      className={`${styles.tagPill} ${selectedTag === tag.id ? styles.tagPillActive : ''}`}
                      onClick={() => setSelectedTag(tag.id)}
                    >
                      <span>{tag.label}</span>
                    </button>
                  ))}
                </div>

                <div className={styles.fileGridMini}>
                  {filteredTagFiles.map((file) => {
                    const FileIcon = file.icon;
                    return (
                      <div key={file.id} className={styles.miniFileCard}>
                        <div style={{ color: file.color }}>
                          <FileIcon size={20} />
                        </div>
                        <div className={styles.fileMeta}>
                          <span className={styles.fileName}>{file.name}</span>
                          <span className={styles.fileSize}>{file.size}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Secure Share Preview */}
            {activeTab === 'share' && (
              <div className={styles.shareContainer}>
                <div className={styles.shareHeader}>
                  <h4 className={styles.shareTitle}>
                    <Share2 size={16} color="var(--color-primary)" />
                    <span>{lang === 'en' ? 'Encrypted Share Link' : 'Liên kết chia sẻ bảo mật'}</span>
                  </h4>
                  <span className={styles.speedBadge}>{lang === 'en' ? 'AES-256 GCM' : 'Mã hoá AES-256'}</span>
                </div>

                <div className={styles.linkBox}>
                  <span className={styles.linkText}>
                    https://drive.vplatform.dev/share/v9x4k12m8
                  </span>
                  <button className={styles.copyBadge} onClick={handleCopyLink}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? (lang === 'en' ? 'Copied' : 'Đã sao chép') : (lang === 'en' ? 'Copy' : 'Sao chép')}</span>
                  </button>
                </div>

                <div className={styles.shareBadges}>
                  <button
                    className={`${styles.securityChip} ${requirePassword ? styles.securityChipActive : ''}`}
                    onClick={() => setRequirePassword(!requirePassword)}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    <Lock size={12} />
                    <span>{requirePassword ? (lang === 'en' ? 'PIN: Enabled' : 'Mật khẩu: Bật') : (lang === 'en' ? 'PIN: Disabled' : 'Mật khẩu: Tắt')}</span>
                  </button>

                  <div className={styles.securityChip}>
                    <span>⏱ {lang === 'en' ? 'Expires: 24h' : 'Thời hạn: 24h'}</span>
                  </div>

                  <button
                    className={`${styles.securityChip} ${activePermission === 'view' ? styles.securityChipActive : ''}`}
                    onClick={() => setActivePermission('view')}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    <span>{lang === 'en' ? 'View Only' : 'Chỉ xem'}</span>
                  </button>
                  <button
                    className={`${styles.securityChip} ${activePermission === 'download' ? styles.securityChipActive : ''}`}
                    onClick={() => setActivePermission('download')}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    <span>{lang === 'en' ? 'Allow Download' : 'Cho phép tải'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. Fast Search Showcase */}
            {activeTab === 'search' && (
              <div className={styles.searchContainer}>
                <div className={styles.searchBarMini}>
                  <Search size={18} color="var(--color-primary)" />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={lang === 'en' ? "Search across Google Drive files (e.g., pdf, design, report)..." : "Gõ từ khóa để lọc tệp tức thì (ví dụ: pdf, design, zip)..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <span className={styles.speedBadge}>12ms Index</span>
                </div>

                <div className={styles.fileGridMini}>
                  {filteredSearchFiles.slice(0, 4).map((file) => {
                    const FileIcon = file.icon;
                    return (
                      <div key={file.id} className={styles.miniFileCard}>
                        <div style={{ color: file.color }}>
                          <FileIcon size={20} />
                        </div>
                        <div className={styles.fileMeta}>
                          <span className={styles.fileName}>{file.name}</span>
                          <span className={styles.fileSize}>{file.size}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          APPLICATION PURPOSE & GOOGLE DRIVE INTEGRATION SECTION
          Explicitly explains the purpose of the app and Google Drive usage
          (Fully resolves Google OAuth Verification Requirements)
          ========================================================= */}
      <section id="muc-dich" className={styles.purposeSection}>
        <div className={styles.purposeCard}>
          <div className={styles.purposeHeader}>
            <div className={styles.purposeBadge}>
              <ShieldCheck size={14} />
              <span>{lang === 'en' ? 'Application Purpose & Google Drive Integration' : 'Mục đích Ứng dụng & Tích hợp Google Drive'}</span>
            </div>
          </div>

          <h2 className={styles.purposeTitle}>
            {lang === 'en'
              ? 'What is DriveManager and Why Does It Use Google Drive?'
              : 'DriveManager là gì và Tại sao cần kết nối Google Drive?'}
          </h2>

          <p className={styles.purposeDescription}>
            {lang === 'en'
              ? 'DriveManager is an open, unified personal cloud storage organizer designed to help users search, categorize, index, and securely share their documents across cloud storage providers in one central dashboard. When you connect your Google Drive account, DriveManager uses Google OAuth 2.0 to enhance your file organization experience while strictly respecting your privacy.'
              : 'DriveManager là ứng dụng quản lý lưu trữ đám mây hợp nhất, giúp người dùng dễ dàng tìm kiếm, gắn thẻ phân loại, quản lý chỉ mục và chia sẻ tài liệu giữa các dịch vụ lưu trữ trên một bảng điều khiển tập trung duy nhất. Khi bạn kết nối Google Drive, DriveManager sử dụng giao thức chuẩn Google OAuth 2.0 để tối ưu hóa trải nghiệm quản lý tệp tin nhưng tuyệt đối tôn trọng quyền riêng tư của bạn.'}
          </p>

          <div className={styles.purposeGrid}>
            <div className={styles.purposeItem}>
              <div className={styles.purposeItemIcon}>
                <Search size={20} />
              </div>
              <h4 className={styles.purposeItemTitle}>
                {lang === 'en' ? '1. Unified Metadata Indexing' : '1. Lập chỉ mục siêu dữ liệu'}
              </h4>
              <p className={styles.purposeItemText}>
                {lang === 'en'
                  ? 'DriveManager reads file metadata (file names, sizes, mime types, and modified dates) via the Google Drive API so you can view all your stored assets in a single, fast searchable catalog without downloading raw files to our servers.'
                  : 'DriveManager đọc siêu dữ liệu tệp (tên, dung lượng, định dạng và ngày sửa đổi) qua Google Drive API để hiển thị danh mục tìm kiếm tốc độ cao mà không cần tải nội dung tệp thô về máy chủ.'}
              </p>
            </div>

            <div className={styles.purposeItem}>
              <div className={styles.purposeItemIcon}>
                <Tag size={20} />
              </div>
              <h4 className={styles.purposeItemTitle}>
                {lang === 'en' ? '2. Cross-Folder & Tag Organization' : '2. Gắn nhãn đa chiều & Bộ sưu tập'}
              </h4>
              <p className={styles.purposeItemText}>
                {lang === 'en'
                  ? 'Traditional folder trees can become cluttered. DriveManager allows you to attach multi-dimensional tags and group files into virtual collections without altering or moving original files in your Google Drive.'
                  : 'Không còn phải sao chép tệp giữa các thư mục lộn xộn. DriveManager cho phép bạn gắn nhiều nhãn Tag và gom nhóm vào các bộ sưu tập ảo mà không làm thay đổi vị trí gốc của tệp trên Google Drive.'}
              </p>
            </div>

            <div className={styles.purposeItem}>
              <div className={styles.purposeItemIcon}>
                <Share2 size={20} />
              </div>
              <h4 className={styles.purposeItemTitle}>
                {lang === 'en' ? '3. Controlled Temporary Sharing' : '3. Chia sẻ có kiểm soát & Mã bảo vệ'}
              </h4>
              <p className={styles.purposeItemText}>
                {lang === 'en'
                  ? 'Generate temporary, password-protected download links for specific files with custom expiration timers. You maintain full ownership and can revoke shared access at any time with one click.'
                  : 'Tạo liên kết tải xuống tạm thời có mật khẩu bảo vệ và giới hạn thời gian tự hủy. Bạn giữ toàn quyền sở hữu và có thể thu hồi quyền chia sẻ bất kỳ lúc nào chỉ với một thao tác.'}
              </p>
            </div>

            <div className={styles.purposeItem}>
              <div className={styles.purposeItemIcon}>
                <Lock size={20} />
              </div>
              <h4 className={styles.purposeItemTitle}>
                {lang === 'en' ? '4. Strict Privacy & Zero Data Monetization' : '4. Cam kết Bảo mật & Không bán dữ liệu'}
              </h4>
              <p className={styles.purposeItemText}>
                {lang === 'en'
                  ? 'DriveManager never sells your personal data, does not serve targeted ads, and never uses Google Drive data to train AI or machine learning models. OAuth tokens are encrypted with AES-256 GCM.'
                  : 'DriveManager tuyệt đối không bán dữ liệu cá nhân, không hiển thị quảng cáo và không dùng dữ liệu Google Drive để huấn luyện mô hình AI. Token OAuth được mã hóa an toàn bằng thuật toán AES-256 GCM.'}
              </p>
            </div>
          </div>

          <div className={styles.limitedUseBox}>
            <strong>Google API Limited Use Disclosure:</strong> DriveManager's use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 600 }}>Google API Services User Data Policy</a>, including the Limited Use requirements.
          </div>
        </div>
      </section>

      {/* =========================================================
          BENTO FEATURE GRID
          ========================================================= */}
      <section id="tinh-nang" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>
            {lang === 'en' ? 'Core Capabilities' : 'Tính năng cốt lõi'}
          </span>
          <h2 className={styles.sectionTitle}>
            {lang === 'en' ? 'Engineered for Speed, Clarity, and Control' : 'Thiết kế cho tốc độ và kiểm soát'}
          </h2>
        </div>

        <div className={styles.bentoGrid}>
          {/* Bento Card 1: Multi-Cloud Connect (Large 8 cols) */}
          <div id="dam-may" className={`${styles.bentoCard} ${styles.col8}`}>
            <div>
              <div className={`${styles.bentoIconArea} ${styles.iconBlue}`}>
                <Cloud size={24} />
              </div>
              <h3 className={styles.bentoHeading}>
                {lang === 'en' ? 'Centralized Multi-Cloud Connection' : 'Kết nối Đa Đám Mây Tập Trung'}
              </h3>
              <p className={styles.bentoSubtext}>
                {lang === 'en'
                  ? 'Integrates Google Drive and independent storage vaults using standard, secure OAuth 2.0 authentication.'
                  : 'Tích hợp Google Drive và bộ lưu trữ độc lập qua giao thức OAuth 2.0 chuẩn quốc tế.'}
              </p>
            </div>

            <div className={styles.orbitGraphic}>
              <div className={styles.orbitNode}>
                <Cloud size={20} color="#4285F4" />
                <span>Google Drive</span>
              </div>
              <div className={styles.orbitHub}>
                <span>DriveManager Vault</span>
              </div>
              <div className={styles.orbitNode}>
                <HardDrive size={20} color="#10B981" />
                <span>Local Binary</span>
              </div>
            </div>
          </div>

          {/* Bento Card 2: Smart Tagging (4 cols) */}
          <div className={`${styles.bentoCard} ${styles.col4}`}>
            <div>
              <div className={`${styles.bentoIconArea} ${styles.iconPurple}`}>
                <Tag size={24} />
              </div>
              <h3 className={styles.bentoHeading}>
                {lang === 'en' ? 'Collections & Smart Tags' : 'Bộ sưu tập & Tag'}
              </h3>
              <p className={styles.bentoSubtext}>
                {lang === 'en'
                  ? 'No more getting lost in deep folder hierarchies. Attach multiple tags and cross-reference files instantly.'
                  : 'Không còn lạc trong mê cung thư mục. Gắn nhãn đa chiều, nhóm tệp thông minh.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px' }}>
              <span className={styles.tagPill} style={{ padding: '4px 10px', fontSize: '11px' }}>⚡ Urgent</span>
              <span className={styles.tagPill} style={{ padding: '4px 10px', fontSize: '11px' }}>📁 2026 Project</span>
              <span className={styles.tagPill} style={{ padding: '4px 10px', fontSize: '11px' }}>🔒 Private</span>
            </div>
          </div>

          {/* Bento Card 3: Realtime Upload Queue (4 cols) */}
          <div className={`${styles.bentoCard} ${styles.col4}`}>
            <div>
              <div className={`${styles.bentoIconArea} ${styles.iconGreen}`}>
                <Zap size={24} />
              </div>
              <h3 className={styles.bentoHeading}>
                {lang === 'en' ? 'Realtime Transfer Pipeline' : 'Hàng đợi Tải lên Realtime'}
              </h3>
              <p className={styles.bentoSubtext}>
                {lang === 'en'
                  ? 'Smooth background upload process with multi-file chunking and resilient reconnection handling.'
                  : 'Tiến trình đồng bộ mượt mà, phân luồng đa tệp không gián đoạn.'}
              </p>
            </div>

            <div className={styles.progressBarMotion}>
              <div className={styles.progressLabelRow}>
                <span>{lang === 'en' ? 'Transferring' : 'Đang truyền tải'}</span>
                <span>48 MB/s</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} />
              </div>
            </div>
          </div>

          {/* Bento Card 4: Enterprise Security (4 cols) */}
          <div id="bao-mat" className={`${styles.bentoCard} ${styles.col4}`}>
            <div>
              <div className={`${styles.bentoIconArea} ${styles.iconOrange}`}>
                <ShieldCheck size={24} />
              </div>
              <h3 className={styles.bentoHeading}>
                {lang === 'en' ? 'Multi-Layer Security' : 'Bảo mật Đa Lớp'}
              </h3>
              <p className={styles.bentoSubtext}>
                {lang === 'en'
                  ? 'Secure HTTP-only session cookies, CSRF protection tokens, and encrypted storage credentials.'
                  : 'Phiên đăng nhập an toàn, CSRF Token và mã hóa dữ liệu độc quyền.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
              <span className={styles.securityChip} style={{ color: '#10B981', borderColor: '#10B981' }}>
                <Check size={12} /> OAuth 2.0 Verified
              </span>
            </div>
          </div>

          {/* Bento Card 5: Instant 1-Click Sharing (4 cols) */}
          <div className={`${styles.bentoCard} ${styles.col4}`}>
            <div>
              <div className={`${styles.bentoIconArea} ${styles.iconBlue}`}>
                <Share2 size={24} />
              </div>
              <h3 className={styles.bentoHeading}>
                {lang === 'en' ? '1-Click Secure Sharing' : 'Chia sẻ 1-Click'}
              </h3>
              <p className={styles.bentoSubtext}>
                {lang === 'en'
                  ? 'Generate custom sharing links with password PIN protection, expiry timers, and view/download permissions.'
                  : 'Tạo link chia sẻ với mật khẩu bảo vệ, giới hạn hạn dùng và phân quyền xem/tải.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <span className={styles.speedBadge}>{lang === 'en' ? 'PIN Protected' : 'Mã PIN'}</span>
              <span className={styles.speedBadge}>{lang === 'en' ? 'Auto Expiry' : 'Tự hủy'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          METRICS BAR
          ========================================================= */}
      <section className={styles.metricsBar}>
        <div className={styles.metricsInner}>
          <div>
            <div className={styles.metricValue}>0s</div>
            <div className={styles.metricLabel}>{lang === 'en' ? 'Complex Configuration' : 'Cấu hình phức tạp'}</div>
          </div>
          <div>
            <div className={styles.metricValue}>OAuth 2.0</div>
            <div className={styles.metricLabel}>{lang === 'en' ? 'Google Security Standard' : 'Chuẩn bảo mật Google'}</div>
          </div>
          <div>
            <div className={styles.metricValue}>100%</div>
            <div className={styles.metricLabel}>{lang === 'en' ? 'User Data Ownership' : 'Toàn quyền kiểm soát tệp'}</div>
          </div>
          <div>
            <div className={styles.metricValue}>∞</div>
            <div className={styles.metricLabel}>{lang === 'en' ? 'Collections & Tags' : 'Bộ sưu tập & Gắn nhãn'}</div>
          </div>
        </div>
      </section>

      {/* =========================================================
          BOTTOM CALL TO ACTION
          ========================================================= */}
      <section className={styles.bottomCta}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>
            {lang === 'en' ? 'Take Control of Your Cloud Workspace' : 'Làm chủ không gian dữ liệu ngay hôm nay'}
          </h2>
          <p className={styles.ctaSubtext}>
            {lang === 'en'
              ? 'Simple, responsive, and secure file management across all your devices.'
              : 'Đơn giản, mượt mà và trực quan trên mọi nền tảng thiết bị.'}
          </p>
          <Link to={user ? "/app" : "/register"} className={styles.btnWhiteCta}>
            <span>{user ? (lang === 'en' ? "Open Dashboard" : "Mở Bảng điều khiển") : (lang === 'en' ? "Start for Free" : "Khởi đầu hoàn toàn miễn phí")}</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer with Compliance Links */}
      <footer className={styles.footer}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <p>© 2026 DriveManager (https://drive.vplatform.dev). {lang === 'en' ? 'Minimalist • Secure • Instant Sync.' : 'Tinh gọn • Bảo mật • Đồng bộ tức thì.'}</p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '13px' }}>
            <Link to="/privacy" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
              {lang === 'en' ? 'Privacy Policy' : 'Chính sách Quyền riêng tư (Privacy Policy)'}
            </Link>
            <Link to="/terms" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              {lang === 'en' ? 'Terms of Service' : 'Điều khoản Dịch vụ (Terms of Service)'}
            </Link>
            <Link to="/privacy#google-limited-use" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              Google API Limited Use Disclosure
            </Link>
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              {lang === 'en' ? 'Revoke Google Permissions' : 'Thu hồi quyền Google Drive'}
            </a>
            <a href="mailto:phuxp17@gmail.com" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
              {lang === 'en' ? 'Contact Support: phuxp17@gmail.com' : 'Liên hệ hỗ trợ: phuxp17@gmail.com'}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
