import type { ReactNode } from 'react';

export default function AdminToolbarButton({
  children,
  onClick,
  disabled,
  variant = 'default',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary';
  type?: 'button' | 'submit';
}) {
  const variantClass = variant === 'primary' ? 'admin-toolbar-btn admin-toolbar-btn--primary' : 'admin-toolbar-btn';
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={variantClass}>
      {children}
    </button>
  );
}
