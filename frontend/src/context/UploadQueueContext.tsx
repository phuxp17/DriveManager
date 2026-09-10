import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { filesApi, MAX_FILE_SIZE_BYTES } from '../api/filesApi';
import { queryClient } from '../app/queryClient';

export type UploadStatus = 'queued' | 'sending' | 'processing' | 'success' | 'failed' | 'cancelled';

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  description?: string;
  connectionId: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  abortController?: AbortController;
}

interface UploadQueueContextType {
  items: UploadItem[];
  enqueueUpload: (connectionId: string, file: File, name?: string, description?: string) => void;
  cancelUpload: (id: string) => void;
  clearCompleted: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const UploadQueueContext = createContext<UploadQueueContextType | undefined>(undefined);

// Concurrency limit = 2 (MISS-001)
const MAX_CONCURRENT_UPLOADS = 2;

export const UploadQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const processingIdsRef = useRef<Set<string>>(new Set());

  const enqueueUpload = (connectionId: string, file: File, name?: string, description?: string) => {
    // Client-side file size validation (BUG-007)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const failedItem: UploadItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        file,
        name: name || file.name,
        description,
        connectionId,
        progress: 0,
        status: 'failed',
        error: `Kích thước tệp (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa 50MB (52.428.800 bytes).`,
      };
      setItems((prev) => [...prev, failedItem]);
      setIsOpen(true);
      return;
    }

    const newItem: UploadItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      file,
      name: name || file.name,
      description,
      connectionId,
      progress: 0,
      status: 'queued',
      abortController: new AbortController(),
    };

    setItems((prev) => [...prev, newItem]);
    setIsOpen(true);
  };

  const cancelUpload = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (item.status === 'queued') {
            return { ...item, status: 'cancelled' };
          }
          if (item.status === 'sending' || item.status === 'processing') {
            item.abortController?.abort();
            return { ...item, status: 'cancelled' };
          }
        }
        return item;
      })
    );
    processingIdsRef.current.delete(id);
  };

  const clearCompleted = () => {
    setItems((prev) => prev.filter((item) => item.status === 'queued' || item.status === 'sending'));
  };

  const startUpload = async (uploadItem: UploadItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === uploadItem.id ? { ...i, status: 'sending' } : i))
    );

    try {
      await filesApi.uploadFile(
        uploadItem.connectionId,
        uploadItem.file,
        uploadItem.name,
        uploadItem.description,
        (percent) => {
          setItems((prev) =>
            prev.map((i) => {
              if (i.id === uploadItem.id) {
                return {
                  ...i,
                  progress: percent,
                  status: percent >= 100 ? 'processing' : 'sending',
                };
              }
              return i;
            })
          );
        },
        uploadItem.abortController?.signal
      );

      setItems((prev) =>
        prev.map((i) =>
          i.id === uploadItem.id ? { ...i, status: 'success', progress: 100 } : i
        )
      );

      // Invalidate items and recent items query in background
      queryClient.invalidateQueries({ queryKey: ['items'] });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setItems((prev) =>
          prev.map((i) => (i.id === uploadItem.id ? { ...i, status: 'cancelled' } : i))
        );
      } else {
        setItems((prev) =>
          prev.map((i) =>
            i.id === uploadItem.id
              ? {
                  ...i,
                  status: 'failed',
                  error: err?.message || 'Tải lên thất bại',
                }
              : i
          )
        );
      }
    } finally {
      processingIdsRef.current.delete(uploadItem.id);
    }
  };

  useEffect(() => {
    const activeItems = items.filter(
      (item) => item.status === 'sending' || item.status === 'processing'
    );
    const availableSlots = MAX_CONCURRENT_UPLOADS - activeItems.length;
    if (availableSlots <= 0) return;

    const nextBatch = items
      .filter((item) => item.status === 'queued' && !processingIdsRef.current.has(item.id))
      .slice(0, availableSlots);

    if (nextBatch.length === 0) return;

    for (const item of nextBatch) {
      processingIdsRef.current.add(item.id);
      startUpload(item);
    }
  }, [items]);

  return (
    <UploadQueueContext.Provider
      value={{
        items,
        enqueueUpload,
        cancelUpload,
        clearCompleted,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </UploadQueueContext.Provider>
  );
};

export const useUploadQueue = (): UploadQueueContextType => {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error('useUploadQueue must be used within an UploadQueueProvider');
  }
  return context;
};
