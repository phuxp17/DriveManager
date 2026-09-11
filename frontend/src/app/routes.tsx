import React from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useAuth } from '../context/AuthContext';

// Protected Route wrapper component
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text-muted)',
          fontSize: '14px',
        }}
      >
        Đang xác thực phiên đăng nhập...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route wrapper (redirects to /app if already logged in)
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => {
      const { HomePage } = await import('../features/home/HomePage');
      return { Component: HomePage };
    },
  },
  {
    path: '/home',
    lazy: async () => {
      const { HomePage } = await import('../features/home/HomePage');
      return { Component: HomePage };
    },
  },
  {
    path: '/login',
    lazy: async () => {
      const { LoginPage } = await import('../features/auth/LoginPage');
      return { Component: () => <PublicRoute><LoginPage /></PublicRoute> };
    },
  },
  {
    path: '/register',
    lazy: async () => {
      const { RegisterPage } = await import('../features/auth/RegisterPage');
      return { Component: () => <PublicRoute><RegisterPage /></PublicRoute> };
    },
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('../features/dashboard/DashboardPage')).DashboardPage }),
      },
      {
        path: 'library',
        lazy: async () => ({ Component: (await import('../features/explorer/ExplorerPage')).ExplorerPage }),
      },
      {
        path: 'drive',
        lazy: async () => ({ Component: (await import('../features/drive/DriveExplorerPage')).DriveExplorerPage }),
      },
      {
        path: 'collections/:id',
        lazy: async () => ({ Component: (await import('../features/collections/CollectionPage')).CollectionPage }),
      },
      {
        path: 'tags',
        lazy: async () => ({ Component: (await import('../features/tags/TagsPage')).TagsPage }),
      },
      {
        path: 'connections',
        lazy: async () => ({ Component: (await import('../features/connections/ConnectionsPage')).ConnectionsPage }),
      },
      {
        path: 'connections/callback',
        lazy: async () => ({ Component: (await import('../features/connections/OAuthCallbackPage')).OAuthCallbackPage }),
      },
      {
        path: 'shares',
        lazy: async () => ({ Component: (await import('../features/shares/SharesPage')).SharesPage }),
      },
      {
        path: 'contacts',
        lazy: async () => ({ Component: (await import('../features/contacts/ContactsPage')).ContactsPage }),
      },
    ],
  },
  {
    path: '*',
    element: (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '48px', fontWeight: 800, color: 'var(--color-primary)' }}>404</h1>
        <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', margin: '12px 0 24px' }}>
          Trang bạn tìm kiếm không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <a
          href="/app"
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary)',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Trở về Trang chủ
        </a>
      </div>
    ),
  },
]);
