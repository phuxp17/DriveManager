import React, { useEffect, useState } from 'react';
import { ChevronRight, Folder, FolderInput, HardDrive } from 'lucide-react';
import { DriveItem, driveApi } from '../../api/driveApi';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';

interface DriveMoveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  item: DriveItem | null;
  onSuccess: () => void;
}

interface PathItem {
  id: string;
  name: string;
}

export const DriveMoveModal: React.FC<DriveMoveModalProps> = ({
  open,
  onOpenChange,
  accountId,
  item,
  onSuccess,
}) => {
  const [currentPath, setCurrentPath] = useState<PathItem[]>([
    { id: 'root', name: 'Drive của tôi' },
  ]);
  const [subFolders, setSubFolders] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);

  const currentFolderId = currentPath[currentPath.length - 1].id;

  const loadFolders = async (folderId: string) => {
    setLoading(true);
    try {
      const res = await driveApi.listFiles(accountId, folderId, undefined, 100);
      // Only keep folders, exclude self if moving a folder
      const folders = res.files.filter(
        (f) => f.isFolder && (!item || f.id !== item.id)
      );
      setSubFolders(folders);
    } catch {
      toast.error('Không thể tải danh sách thư mục con.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setCurrentPath([{ id: 'root', name: 'Drive của tôi' }]);
      loadFolders('root');
    }
  }, [open, accountId]);

  const handleNavigateInto = (folder: DriveItem) => {
    const next = [...currentPath, { id: folder.id, name: folder.name }];
    setCurrentPath(next);
    loadFolders(folder.id);
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    const next = currentPath.slice(0, index + 1);
    setCurrentPath(next);
    loadFolders(next[next.length - 1].id);
  };

  const handleMove = async () => {
    if (!item) return;
    setMoving(true);
    try {
      await driveApi.moveFile(accountId, item.id, currentFolderId, item.parents?.[0]);
      toast.success(`Đã di chuyển "${item.name}" tới "${currentPath[currentPath.length - 1].name}".`);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể di chuyển mục trên Google Drive.');
    } finally {
      setMoving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Di chuyển đến thư mục khác"
      description={`Chọn thư mục đích để di chuyển "${item?.name}"`}
      maxWidth="520px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Navigation path bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            overflowX: 'auto',
            fontSize: '13px',
          }}
        >
          {currentPath.map((p, idx) => (
            <React.Fragment key={p.id}>
              {idx > 0 && <ChevronRight size={14} color="var(--color-text-muted)" />}
              <button
                type="button"
                onClick={() => handleNavigateToBreadcrumb(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: idx === currentPath.length - 1 ? 'var(--color-text)' : 'var(--color-primary)',
                  fontWeight: idx === currentPath.length - 1 ? 600 : 500,
                  cursor: idx === currentPath.length - 1 ? 'default' : 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {idx === 0 && <HardDrive size={14} />}
                {p.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Folder list */}
        <div
          style={{
            minHeight: '180px',
            maxHeight: '260px',
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              Đang tải danh sách thư mục...
            </div>
          ) : subFolders.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              (Không có thư mục con nào ở vị trí này)
            </div>
          ) : (
            subFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => handleNavigateInto(folder)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Folder size={16} color="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
                  <span style={{ fontWeight: 500 }}>{folder.name}</span>
                </div>
                <ChevronRight size={14} color="var(--color-text-muted)" />
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={moving}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleMove}
            isLoading={moving}
            icon={<FolderInput size={16} />}
          >
            Di chuyển đến đây
          </Button>
        </div>
      </div>
    </Modal>
  );
};
