// RESTBAR PRO — Badge & Tag Component
import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-950/60 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-950/60 text-rose-400 border-rose-500/30',
    info: 'bg-blue-950/60 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-950/60 text-purple-400 border-purple-500/30',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono tracking-wide ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
