import { ReactNode } from 'react';
import Link from 'next/link';

interface PrimaryButtonProps {
  href?: string;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  onClick?: () => void;
}

export default function PrimaryButton({
  href,
  children,
  className = '',
  type = 'button',
  onClick,
}: PrimaryButtonProps) {
  const baseClass = `btn-primary ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={baseClass} onClick={onClick}>
      {children}
    </button>
  );
}
