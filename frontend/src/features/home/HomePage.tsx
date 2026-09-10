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
  FolderKanban,
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
          <Link to="/" className={styles.logoArea}>
            <div className={styles.logoIcon}>
              <HardDrive size={20} />
              <span className={styles.pulseDot} />
            </div>
            <span>DriveManager</span>
          </Link>

          <nav className={styles.navLinks}>
            <a href="#tinh-nang" className={styles.navPill}>
              <Zap size={14} /> Tính năng
            </a>
            <a href="#dam-may" className={styles.navPill}>
              <Cloud size={14} /> Đám mây
            </a>
            <a href="#bao-mat" className={styles.navPill}>
              <ShieldCheck size={14} /> Bảo mật
            </a>
          </nav>

          <div className={styles.headerActions}>
            {user ? (
              <Link to="/app" className={styles.btnPrimary}>
                <span>Vào ứng dụng</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" className={styles.btnGhost}>
                  Đăng nhập
                </Link>
                <Link to="/register" className={styles.btnPrimary}>
                  <span>Bắt đầu ngay</span>
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
          <span>DriveManager 2.0 • Không gian lưu trữ đám mây hợp nhất</span>
        </div>

        <h1 className={styles.heroTitle}>
          Một Nơi Cho Mọi <span className={styles.gradientText}>Đám Mây</span>.
        </h1>

        <p className={styles.heroSubtitle}>
          Đồng bộ Google Drive, phân loại đa chiều bằng Tag và chia sẻ bảo mật tức thì.
        </p>

        <div className={styles.heroCtaGroup}>
          <Link to={user ? "/app" : "/register"} className={styles.btnLargePrimary}>
            <span>{user ? "Mở Bảng điều khiển" : "Khám phá miễn phí"}</span>
            <ArrowRight size={18} />
          </Link>
          <a href="#live-demo" className={styles.btnLargeGhost}>
            <SlidersHorizontal size={18} />
            <span>Thử tính năng tương tác</span>
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
              <span>Đồng bộ Cloud</span>
            </button>
            <button
              className={`${styles.tabItem} ${activeTab === 'tags' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('tags')}
            >
              <Tag size={15} />
              <span>Bộ sưu tập & Tag</span>
            </button>
            <button
              className={`${styles.tabItem} ${activeTab === 'share' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('share')}
            >
              <Share2 size={15} />
              <span>Chia sẻ an toàn</span>
            </button>
            <button
              className={`${styles.tabItem} ${activeTab === 'search' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <Search size={15} />
              <span>Tìm kiếm tức thì</span>
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
                  <span className={styles.cloudBadge}>OAuth 2.0 Đã liên kết</span>
                </div>

                <div className={styles.syncStream}>
                  <div className={styles.streamLine} />
                  <button
                    onClick={handleSimulateSync}
                    className={styles.streamPill}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                    <span>{isSyncing ? 'Đang đồng bộ...' : `Tự động đồng bộ (${syncCount} tệp)`}</span>
                  </button>
                </div>

                <div className={`${styles.cloudCard} ${styles.cloudCardHub}`}>
                  <div className={styles.cardIconCircle}>
                    <HardDrive size={24} />
                  </div>
                  <h4 className={styles.cloudName}>DriveManager Hub</h4>
                  <span className={styles.cloudBadge}>Trạng thái: Sẵn sàng</span>
                </div>
              </div>
            )}

            {/* 2. Smart Tags Filter Showcase */}
            {activeTab === 'tags' && (
              <div className={styles.tagsContainer}>
                <div className={styles.tagsRow}>
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'design', label: '🎨 Thiết kế' },
                    { id: 'finance', label: '📊 Tài chính' },
                    { id: 'media', label: '🎬 Media' },
                    { id: 'docs', label: '📄 Tài liệu' },
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
                    <span>Liên kết chia sẻ bảo mật</span>
                  </h4>
                  <span className={styles.speedBadge}>Mã hoá AES-256</span>
                </div>

                <div className={styles.linkBox}>
                  <span className={styles.linkText}>
                    https://drivemanager.app/share/v9x4k12m8
                  </span>
                  <button className={styles.copyBadge} onClick={handleCopyLink}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>

                <div className={styles.shareBadges}>
                  <button
                    className={`${styles.securityChip} ${requirePassword ? styles.securityChipActive : ''}`}
                    onClick={() => setRequirePassword(!requirePassword)}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    <Lock size={12} />
                    <span>{requirePassword ? 'Mật khẩu: Bật' : 'Mật khẩu: Tắt'}</span>
                  </button>

                  <div className={styles.securityChip}>
                    <span>⏱ Thời hạn: 24h</span>
                  </div>

                  <button
                    className={`${styles.securityChip} ${activePermission === 'view' ? styles.securityChipActive : ''}`}
                    onClick={() => setActivePermission('view')}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    <span>Chỉ xem</span>
                  </button>
                  <button
                    className={`${styles.securityChip} ${activePermission === 'download' ? styles.securityChipActive : ''}`}
                    onClick={() => setActivePermission('download')}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    <span>Cho phép tải</span>
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
                    placeholder="Gõ từ khóa để lọc tệp tức thì (ví dụ: pdf, design, zip)..."
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
          BENTO FEATURE GRID (MOTION & MINIMAL TEXT)
          ========================================================= */}
      <section id="tinh-nang" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Tính năng cốt lõi</span>
          <h2 className={styles.sectionTitle}>Thiết kế cho tốc độ và kiểm soát</h2>
        </div>

        <div className={styles.bentoGrid}>
          {/* Bento Card 1: Multi-Cloud Connect (Large 8 cols) */}
          <div id="dam-may" className={`${styles.bentoCard} ${styles.col8}`}>
            <div>
              <div className={`${styles.bentoIconArea} ${styles.iconBlue}`}>
                <Cloud size={24} />
              </div>
              <h3 className={styles.bentoHeading}>Kết nối Đa Đám Mây Tập Trung</h3>
              <p className={styles.bentoSubtext}>
                Tích hợp Google Drive và bộ lưu trữ độc lập qua giao thức OAuth 2.0 chuẩn quốc tế.
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
              <h3 className={styles.bentoHeading}>Bộ sưu tập & Tag</h3>
              <p className={styles.bentoSubtext}>
                Không còn lạc trong mê cung thư mục. Gắn nhãn đa chiều, nhóm tệp thông minh.
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
              <h3 className={styles.bentoHeading}>Hàng đợi Tải lên Realtime</h3>
              <p className={styles.bentoSubtext}>
                Tiến trình đồng bộ mượt mà, phân luồng đa tệp không gián đoạn.
              </p>
            </div>

            <div className={styles.progressBarMotion}>
              <div className={styles.progressLabelRow}>
                <span>Đang truyền tải</span>
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
              <h3 className={styles.bentoHeading}>Bảo mật Đa Lớp</h3>
              <p className={styles.bentoSubtext}>
                Phiên đăng nhập an toàn, CSRF Token và mã hóa dữ liệu độc quyền.
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
              <h3 className={styles.bentoHeading}>Chia sẻ 1-Click</h3>
              <p className={styles.bentoSubtext}>
                Tạo link chia sẻ với mật khẩu bảo vệ, giới hạn hạn dùng và phân quyền xem/tải.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <span className={styles.speedBadge}>Link bảo vệ</span>
              <span className={styles.speedBadge}>Mã PIN</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          METRICS BAR (ZERO TEXT FLUFF, MAX IMPACT)
          ========================================================= */}
      <section className={styles.metricsBar}>
        <div className={styles.metricsInner}>
          <div>
            <div className={styles.metricValue}>0s</div>
            <div className={styles.metricLabel}>Cấu hình phức tạp</div>
          </div>
          <div>
            <div className={styles.metricValue}>OAuth 2.0</div>
            <div className={styles.metricLabel}>Chuẩn bảo mật Google</div>
          </div>
          <div>
            <div className={styles.metricValue}>100%</div>
            <div className={styles.metricLabel}>Toàn quyền kiểm soát tệp</div>
          </div>
          <div>
            <div className={styles.metricValue}>∞</div>
            <div className={styles.metricLabel}>Bộ sưu tập & Gắn nhãn</div>
          </div>
        </div>
      </section>

      {/* =========================================================
          BOTTOM CALL TO ACTION
          ========================================================= */}
      <section className={styles.bottomCta}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Làm chủ không gian dữ liệu ngay hôm nay</h2>
          <p className={styles.ctaSubtext}>
            Đơn giản, mượt mà và trực quan trên mọi nền tảng thiết bị.
          </p>
          <Link to={user ? "/app" : "/register"} className={styles.btnWhiteCta}>
            <span>{user ? "Mở Bảng điều khiển" : "Khởi đầu hoàn toàn miễn phí"}</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className={styles.footer}>
        <p>© 2026 DriveManager. Tinh gọn • Bảo mật • Đồng bộ tức thì.</p>
      </footer>
    </div>
  );
};
export default HomePage;
