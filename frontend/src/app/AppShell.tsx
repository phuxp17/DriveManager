import React, { useEffect, useRef, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Clock,
  Cloud,
  FilePlus,
  FolderOpen,
  Home,
  Inbox,
  Link as LinkIcon,
  LogOut,
  Menu,
  Plus,
  Search,
  Share2,
  Star,
  Tag,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { collectionsApi } from '../api/collectionsApi';
import { Collection } from '../api/types';
import { CollectionModal } from '../components/collections/CollectionModal';
import { toast } from '../components/common/Toast';
import { confirm } from '../components/common/ConfirmDialog';
import { CollectionTree } from '../components/collections/CollectionTree';
import { Button } from '../components/common/Button';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { CreateLinkModal } from '../components/items/CreateLinkModal';
import { FileUploadModal } from '../components/files/FileUploadModal';
import { ImportDriveModal } from '../components/files/ImportDriveModal';
import { UploadQueuePanel } from '../components/files/UploadQueuePanel';
import { useAuth } from '../context/AuthContext';
import styles from './AppShell.module.css';

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  const closeSidebar = () => {
    const shouldRestoreFocus = sidebarOpen;
    setSidebarOpen(false);
    if (shouldRestoreFocus) {
      window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
    }
  };

  useEffect(() => {
    const mainArea = mainAreaRef.current;
    if (!mainArea) return;
    if (sidebarOpen) {
      mainArea.setAttribute('inert', '');
      window.requestAnimationFrame(() => {
        sidebarRef.current?.querySelector<HTMLElement>('button, a[href]')?.focus();
      });
    } else {
      mainArea.removeAttribute('inert');
    }
    return () => mainArea.removeAttribute('inert');
  }, [sidebarOpen]);

  // Modals state
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [importDriveOpen, setImportDriveOpen] = useState(false);

  // Keyboard shortcuts (SMALL-002)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.tagName === 'SELECT';

      if (e.key === 'Escape') {
        if (sidebarOpen) {
          closeSidebar();
        }
        if (isInput) {
          target.blur();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCreateLinkOpen(true);
        return;
      }

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Collection modal state
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionModalMode, setCollectionModalMode] = useState<'create' | 'rename'>('create');
  const [targetCollection, setTargetCollection] = useState<Collection | null>(null);
  const [parentCollection, setParentCollection] = useState<Collection | null>(null);
  const [collectionRefreshKey, setCollectionRefreshKey] = useState(0);

  useEffect(() => {
    setSearchInput(new URLSearchParams(location.search).get('q') || '');
  }, [location.search]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (location.pathname === '/app/library') {
        const next = new URLSearchParams(location.search);
        const nextQuery = searchInput.trim();
        if ((next.get('q') || '') === nextQuery) return;
        if (nextQuery) {
          next.set('q', nextQuery);
        } else {
          next.delete('q');
        }
        next.set('page', '0'); // reset page on search
        setSearchParams(next, { replace: true });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [location.pathname, location.search, searchInput, setSearchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.pathname !== '/app/library') {
      navigate(`/app/library?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCollectionSelect = (col: Collection) => {
    navigate(`/app/collections/${col.id}`);
    closeSidebar();
  };

  const handleAddSubCollection = (parent: Collection | null) => {
    setCollectionModalMode('create');
    setParentCollection(parent);
    setTargetCollection(null);
    setCollectionModalOpen(true);
  };

  const handleRenameCollection = (col: Collection) => {
    setCollectionModalMode('rename');
    setTargetCollection(col);
    setParentCollection(null);
    setCollectionModalOpen(true);
  };

  const handleDeleteCollection = async (col: Collection) => {
    const ok = await confirm({
      title: 'Xóa bộ sưu tập',
      message: `Bạn có chắc muốn xóa bộ sưu tập "${col.name}"? Các mục con sẽ được giữ lại.`,
      confirmText: 'Xóa bộ sưu tập',
      variant: 'danger',
    });
    if (ok) {
      try {
        await collectionsApi.delete(col.id);
        setCollectionRefreshKey((prev) => prev + 1);
        toast.success(`Đã xóa bộ sưu tập "${col.name}".`);
        if (location.pathname === `/app/collections/${col.id}`) {
          navigate('/app/library');
        }
      } catch (err: any) {
        toast.error(err?.message || 'Không thể xóa bộ sưu tập.');
      }
    }
  };

  const currentView = searchParams.get('view') || 'active';

  return (
    <div className={styles.container}>
      {/* Skip link for accessibility (MISS-004) */}
      <a href="#main-content" className={styles.skipLink}>
        Chuyển đến nội dung chính
      </a>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Đóng menu điều hướng"
          tabIndex={-1}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside ref={sidebarRef} id="app-sidebar" className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <img src="/logo.png" alt="" />
          </div>
          <span>DriveManager</span>
        </div>

        <div className={styles.actionButtonArea}>
          <DropdownMenu
            trigger={
              <Button
                variant="primary"
                size="md"
                style={{ width: '100%', justifyContent: 'center' }}
                icon={<Plus size={18} />}
              >
                Thêm mới
              </Button>
            }
            align="start"
            items={[
              {
                label: 'Thêm liên kết',
                icon: <LinkIcon size={16} />,
                onClick: () => setCreateLinkOpen(true),
              },
              {
                label: 'Tải tệp tin lên',
                icon: <UploadCloud size={16} />,
                onClick: () => setUploadFileOpen(true),
              },
              {
                label: 'Nhập từ Google Drive',
                icon: <Cloud size={16} />,
                onClick: () => setImportDriveOpen(true),
              },
            ]}
          />
        </div>

        <div className={styles.sidebarContent}>
          {/* Main Navigation */}
          <div className={styles.navSection}>
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={closeSidebar}
            >
              <Home size={18} />
              <span>Trang chủ</span>
            </NavLink>
          </div>

          {/* Library views */}
          <div className={styles.navSection}>
            <div className={styles.sectionLabel}>Thư viện</div>

            <NavLink
              to="/app/library?view=active"
              className={`${styles.navItem} ${
                location.pathname === '/app/library' && currentView === 'active'
                  ? styles.navItemActive
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <BookOpen size={18} />
              <span>Tất cả mục</span>
            </NavLink>

            <NavLink
              to="/app/library?view=inbox"
              className={`${styles.navItem} ${
                location.pathname === '/app/library' && currentView === 'inbox'
                  ? styles.navItemActive
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <Inbox size={18} />
              <span>Hộp thư đến (Inbox)</span>
            </NavLink>

            <NavLink
              to="/app/library?view=uncategorized"
              className={`${styles.navItem} ${
                location.pathname === '/app/library' && currentView === 'uncategorized'
                  ? styles.navItemActive
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <FolderOpen size={18} />
              <span>Chưa phân loại</span>
            </NavLink>

            <NavLink
              to="/app/library?view=favorites"
              className={`${styles.navItem} ${
                location.pathname === '/app/library' && currentView === 'favorites'
                  ? styles.navItemActive
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <Star size={18} />
              <span>Yêu thích</span>
            </NavLink>

            <NavLink
              to="/app/library?view=recent"
              className={`${styles.navItem} ${
                location.pathname === '/app/library' && currentView === 'recent'
                  ? styles.navItemActive
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <Clock size={18} />
              <span>Mở gần đây</span>
            </NavLink>

            <NavLink
              to="/app/library?view=shared"
              className={`${styles.navItem} ${
                location.pathname === '/app/library' && currentView === 'shared'
                  ? styles.navItemActive
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <Share2 size={18} />
              <span>Được chia sẻ</span>
            </NavLink>

            <NavLink
              to="/app/library?view=archive"
              className={`${styles.navItem} ${
                location.pathname === '/app/library' && currentView === 'archive'
                  ? styles.navItemActive
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <Archive size={18} />
              <span>Kho lưu trữ</span>
            </NavLink>

            <NavLink
              to="/app/library?view=trash"
              className={`${styles.navItem} ${
                location.pathname === '/app/library' && currentView === 'trash'
                  ? styles.navItemActive
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <Trash2 size={18} />
              <span>Thùng rác</span>
            </NavLink>
          </div>

          {/* Collections tree */}
          <div className={styles.navSection}>
            <CollectionTree
              selectedId={
                location.pathname.startsWith('/app/collections/')
                  ? location.pathname.split('/')[3]
                  : null
              }
              onSelect={handleCollectionSelect}
              onAddChild={handleAddSubCollection}
              onRename={handleRenameCollection}
              onDelete={handleDeleteCollection}
              refreshTrigger={collectionRefreshKey}
            />
          </div>

          {/* Manage section */}
          <div className={styles.navSection}>
            <div className={styles.sectionLabel}>Quản lý</div>

            <NavLink
              to="/app/tags"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={closeSidebar}
            >
              <Tag size={18} />
              <span>Quản lý Thẻ (Tags)</span>
            </NavLink>

            <NavLink
              to="/app/connections"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={closeSidebar}
            >
              <Cloud size={18} />
              <span>Tài khoản lưu trữ</span>
            </NavLink>

            <NavLink
              to="/app/shares"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={closeSidebar}
            >
              <Share2 size={18} />
              <span>Quản lý chia sẻ</span>
            </NavLink>

            <NavLink
              to="/app/contacts"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
              onClick={closeSidebar}
            >
              <Users size={18} />
              <span>Danh bạ</span>
            </NavLink>
          </div>
        </div>

        {/* User Footer */}
        <div className={styles.userFooter}>
          <div className={styles.userInfo}>
            <span className={styles.userName} title={user?.displayName}>
              {user?.displayName || 'Người dùng'}
            </span>
            <span className={styles.userEmail} title={user?.email}>
              {user?.email}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-danger)',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div ref={mainAreaRef} className={styles.mainArea}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <button
            ref={mobileMenuButtonRef}
            className={styles.mobileMenuBtn}
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu điều hướng"
            aria-controls="app-sidebar"
            aria-expanded={sidebarOpen}
          >
            <Menu size={22} />
          </button>

          <form onSubmit={handleSearchSubmit} className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Tìm kiếm theo tiêu đề, mô tả, liên kết, thẻ... (nhấn / để tìm nhanh)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={styles.searchInput}
              aria-label="Tìm kiếm trong thư viện"
            />
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Header shortcuts if needed */}
          </div>
        </header>

        {/* Content */}
        <main id="main-content" tabIndex={-1} className={styles.contentWrapper}>
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <CreateLinkModal
        open={createLinkOpen}
        onOpenChange={setCreateLinkOpen}
        onSuccess={() => {
          navigate('/app/library');
        }}
      />

      <FileUploadModal open={uploadFileOpen} onOpenChange={setUploadFileOpen} />

      <ImportDriveModal
        open={importDriveOpen}
        onOpenChange={setImportDriveOpen}
        onSuccess={() => {
          navigate('/app/library');
        }}
      />

      <CollectionModal
        open={collectionModalOpen}
        onOpenChange={setCollectionModalOpen}
        mode={collectionModalMode}
        targetCollection={targetCollection}
        parentCollection={parentCollection}
        onSuccess={() => {
          setCollectionRefreshKey((prev) => prev + 1);
        }}
      />

      {/* Floating Upload Queue Panel */}
      <UploadQueuePanel />
    </div>
  );
};
