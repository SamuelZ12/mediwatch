'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-slate-600 hover:bg-slate-700 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  pulse?: boolean;
  children: ReactNode;
}

const badgeVariantClasses: Record<string, string> = {
  default: 'bg-slate-600 text-slate-100',
  success: 'bg-emerald-600 text-emerald-100',
  warning: 'bg-amber-600 text-amber-100',
  danger: 'bg-red-600 text-red-100',
  info: 'bg-blue-600 text-blue-100',
};

export function Badge({ variant = 'default', pulse, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeVariantClasses[variant]} ${pulse ? 'animate-pulse' : ''}`}
    >
      {children}
    </span>
  );
}
