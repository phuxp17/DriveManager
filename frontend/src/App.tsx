import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './app/queryClient';
import { router } from './app/routes';
import { AuthProvider } from './context/AuthContext';
import { UploadQueueProvider } from './context/UploadQueueContext';
import { ToastProvider } from './components/common/Toast';
import { ConfirmProvider } from './components/common/ConfirmDialog';

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UploadQueueProvider>
          <ToastProvider>
            <ConfirmProvider>
              <RouterProvider router={router} future={{ v7_startTransition: true }} />
            </ConfirmProvider>
          </ToastProvider>
        </UploadQueueProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
