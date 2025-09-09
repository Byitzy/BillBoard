'use client';
import {
  AlertTriangle,
  RefreshCw,
  X,
  Info,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { APIError } from '@/types/api';

interface ErrorDisplayProps {
  error: string | Error | APIError | null;
  title?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info' | 'success';
}

export function ErrorDisplay({
  error,
  title = 'Something went wrong',
  showRetry = false,
  onRetry,
  onDismiss,
  className,
  variant = 'error',
}: ErrorDisplayProps) {
  if (!error) return null;

  const errorMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'An unknown error occurred';

  const variants = {
    error: {
      containerClass:
        'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
      iconClass: 'text-red-600 dark:text-red-400',
      titleClass: 'text-red-800 dark:text-red-200',
      messageClass: 'text-red-700 dark:text-red-300',
      icon: AlertTriangle,
    },
    warning: {
      containerClass:
        'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
      iconClass: 'text-yellow-600 dark:text-yellow-400',
      titleClass: 'text-yellow-800 dark:text-yellow-200',
      messageClass: 'text-yellow-700 dark:text-yellow-300',
      icon: AlertCircle,
    },
    info: {
      containerClass:
        'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
      iconClass: 'text-blue-600 dark:text-blue-400',
      titleClass: 'text-blue-800 dark:text-blue-200',
      messageClass: 'text-blue-700 dark:text-blue-300',
      icon: Info,
    },
    success: {
      containerClass:
        'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
      iconClass: 'text-green-600 dark:text-green-400',
      titleClass: 'text-green-800 dark:text-green-200',
      messageClass: 'text-green-700 dark:text-green-300',
      icon: CheckCircle,
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn('rounded-lg border p-4', config.containerClass, className)}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', config.iconClass)} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={cn('text-sm font-medium', config.titleClass)}>
            {title}
          </h3>
          <p className={cn('mt-1 text-sm', config.messageClass)}>
            {errorMessage}
          </p>
          {(showRetry || onRetry) && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className={cn(
                  'inline-flex items-center gap-1 text-sm font-medium',
                  config.titleClass,
                  'hover:underline focus:outline-none focus:underline'
                )}
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          )}
          {process.env.NODE_ENV === 'development' &&
            error instanceof APIError &&
            error.details && (
              <details className="mt-3">
                <summary
                  className={cn(
                    'cursor-pointer text-xs font-medium',
                    config.titleClass
                  )}
                >
                  Debug Details
                </summary>
                <pre
                  className={cn('mt-2 text-xs font-mono', config.messageClass)}
                >
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </details>
            )}
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={cn(
                'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                config.iconClass,
                'hover:bg-white/20 focus:ring-current'
              )}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Toast-style error display
export function ErrorToast({
  error,
  onDismiss,
  autoHide = true,
  duration = 5000,
}: {
  error: string | Error | null;
  onDismiss: () => void;
  autoHide?: boolean;
  duration?: number;
}) {
  React.useEffect(() => {
    if (autoHide && error) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, error, onDismiss]);

  if (!error) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <ErrorDisplay
        error={error}
        title="Error"
        onDismiss={onDismiss}
        variant="error"
        className="shadow-lg"
      />
    </div>
  );
}

// Inline error for forms
export function FieldError({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
      <AlertTriangle className="h-3 w-3" />
      {error}
    </p>
  );
}
