import { ReactNode } from 'react';
import Link from 'next/link';

interface PrimaryButtonProps {
  href?: string;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
}

export default function PrimaryButton({
  href,
  children,
  className = '',
  type = 'button',
  onClick,
  disabled = false,
}: PrimaryButtonProps) {
  const baseClass = `btn-primary ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={baseClass} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
