import React from 'react';
import { Tag } from '../../api/types';

interface TagBadgeProps {
  tag: Tag;
  onClick?: () => void;
  onRemove?: () => void;
  selected?: boolean;
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, onClick, onRemove, selected }) => {
  const color = tag.color || '#64748B';

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: selected ? color : 'var(--color-surface)',
        color: selected ? '#FFFFFF' : 'var(--color-text)',
        border: `1px solid ${selected ? color : 'var(--color-border)'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all var(--transition-fast)',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: selected ? '#FFFFFF' : color,
          flexShrink: 0,
        }}
      />
      <span>{tag.name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Gỡ thẻ ${tag.name}`}
          style={{
            background: 'transparent',
            border: 'none',
            color: selected ? '#FFFFFF' : 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          &times;
        </button>
      )}
    </span>
  );
};
