import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Folder,
  FolderOpen,
  FolderPlus,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { collectionsApi } from '../../api/collectionsApi';
import { Collection } from '../../api/types';
import styles from './CollectionTree.module.css';

interface CollectionTreeNodeProps {
  collection: Collection;
  depth: number;
  selectedId: string | null;
  onSelect: (collection: Collection) => void;
  onAddChild: (parent: Collection) => void;
  onRename: (collection: Collection) => void;
  onDelete: (collection: Collection) => void;
}

const CollectionTreeNode: React.FC<CollectionTreeNodeProps> = ({
  collection,
  depth,
  selectedId,
  onSelect,
  onAddChild,
  onRename,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<Collection[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isSelected = selectedId === collection.id;

  const loadChildren = async () => {
    setIsLoading(true);
    try {
      const data = await collectionsApi.list(collection.id);
      setChildren(data);
      setHasLoaded(true);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpanded && !hasLoaded) {
      loadChildren();
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <div
        className={`${styles.treeNode} ${isSelected ? styles.isSelected : ''}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => onSelect(collection)}
      >
        <div className={styles.nodeContent}>
          <button
            className={styles.expandBtn}
            onClick={handleToggle}
            aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isLoading ? (
              <Loader2 size={12} className="spin" color="var(--color-primary)" />
            ) : isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>

          {isExpanded ? (
            <FolderOpen size={16} color="var(--color-primary)" />
          ) : (
            <Folder size={16} color="var(--color-text-muted)" />
          )}

          <span className={styles.nodeName} title={collection.name}>
            {collection.name}
          </span>
        </div>

        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          {depth < 9 && (
            <button
              className={styles.actionBtn}
              onClick={() => onAddChild(collection)}
              title="Thêm bộ sưu tập con"
              aria-label="Thêm bộ sưu tập con"
            >
              <Plus size={14} />
            </button>
          )}
          <button
            className={styles.actionBtn}
            onClick={() => onRename(collection)}
            title="Đổi tên"
            aria-label="Đổi tên"
          >
            <Edit2 size={12} />
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => onDelete(collection)}
            title="Xóa bộ sưu tập"
            aria-label="Xóa bộ sưu tập"
            style={{ color: 'var(--color-danger)' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <CollectionTreeNode
              key={child.id}
              collection={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export interface CollectionTreeProps {
  selectedId: string | null;
  onSelect: (collection: Collection) => void;
  onAddChild: (parent: Collection | null) => void;
  onRename: (collection: Collection) => void;
  onDelete: (collection: Collection) => void;
  refreshTrigger?: number;
}

export const CollectionTree: React.FC<CollectionTreeProps> = ({
  selectedId,
  onSelect,
  onAddChild,
  onRename,
  onDelete,
  refreshTrigger,
}) => {
  const [rootCollections, setRootCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadRoots = async () => {
    setIsLoading(true);
    try {
      const data = await collectionsApi.list(null);
      setRootCollections(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoots();
  }, [refreshTrigger]);

  return (
    <div className={styles.treeContainer}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-subtle)',
          }}
        >
          Bộ sưu tập
        </span>
        <button
          onClick={() => onAddChild(null)}
          title="Tạo bộ sưu tập gốc mới"
          aria-label="Tạo bộ sưu tập gốc"
          style={{
            color: 'var(--color-primary)',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <FolderPlus size={16} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '8px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Đang tải bộ sưu tập...
        </div>
      ) : rootCollections.length === 0 ? (
        <div
          style={{
            padding: '8px',
            fontSize: '13px',
            color: 'var(--color-text-subtle)',
            fontStyle: 'italic',
          }}
        >
          Chưa có bộ sưu tập nào
        </div>
      ) : (
        rootCollections.map((col) => (
          <CollectionTreeNode
            key={col.id}
            collection={col}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
};
