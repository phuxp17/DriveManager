import React from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import styles from './DropdownMenu.module.css';

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: (DropdownMenuItem | 'separator')[];
  align?: 'start' | 'center' | 'end';
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = 'end',
}) => {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className={styles.content} align={align} sideOffset={5}>
          {items.map((item, index) => {
            if (item === 'separator') {
              return <Dropdown.Separator key={`sep-${index}`} className={styles.separator} />;
            }
            return (
              <Dropdown.Item
                key={index}
                className={`${styles.item} ${item.danger ? styles.dangerItem : ''}`}
                disabled={item.disabled}
                onSelect={item.onClick}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </Dropdown.Item>
            );
          })}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
};
