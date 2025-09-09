'use client';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  loading: boolean;
  children: ReactNode;
  spinner?: ReactNode;
  className?: string;
  overlayClassName?: string;
  text?: string;
}

export function LoadingOverlay({
  loading,
  children,
  spinner,
  className,
  overlayClassName,
  text = 'Loading...',
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {loading && (
        <div
          className={cn(
            'absolute inset-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm',
            'flex items-center justify-center z-10',
            'transition-opacity duration-200',
            overlayClassName
          )}
        >
          <div className="flex flex-col items-center space-y-3">
            {spinner || (
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            )}
            {text && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                {text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Inline spinner component
export function Spinner({
  size = 'default',
  className,
}: {
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2
      className={cn('animate-spin text-blue-600', sizeClasses[size], className)}
    />
  );
}

// Loading button with built-in spinner
interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'rounded-lg px-4 py-2 text-sm font-medium',
        'bg-blue-600 text-white hover:bg-blue-700',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
    >
      {loading && <Spinner size="sm" className="text-current" />}
      {loading ? loadingText || children : children}
    </button>
  );
}
