'use client';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  rows?: number;
}

export function Skeleton({ className }: Omit<SkeletonProps, 'rows'>) {
  return (
    <div
      className={cn(
        'animate-pulse bg-neutral-200/50 dark:bg-neutral-800/50 rounded-lg',
        className
      )}
    />
  );
}

// Multi-row skeleton (backwards compatible)
export default function SkeletonGroup({
  className = '',
  rows = 1,
}: SkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

// Preset skeleton components
export function SkeletonText({ className }: Omit<SkeletonProps, 'rows'>) {
  return <Skeleton className={cn('h-4', className)} />;
}

export function SkeletonHeading({ className }: Omit<SkeletonProps, 'rows'>) {
  return <Skeleton className={cn('h-6', className)} />;
}

export function SkeletonButton({ className }: Omit<SkeletonProps, 'rows'>) {
  return <Skeleton className={cn('h-9 w-20', className)} />;
}

export function SkeletonAvatar({ className }: Omit<SkeletonProps, 'rows'>) {
  return <Skeleton className={cn('h-10 w-10 rounded-full', className)} />;
}

export function SkeletonCard({ className }: Omit<SkeletonProps, 'rows'>) {
  return (
    <div
      className={cn(
        'space-y-3 p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg',
        className
      )}
    >
      <SkeletonHeading className="w-3/4" />
      <SkeletonText className="w-full" />
      <SkeletonText className="w-2/3" />
      <div className="flex justify-between items-center pt-2">
        <SkeletonText className="w-1/4" />
        <SkeletonButton />
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Table header */}
      <div className="flex space-x-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonText key={i} className="flex-1 h-5" />
        ))}
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex space-x-4 py-3 border-b border-neutral-100 dark:border-neutral-800"
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <SkeletonText key={colIndex} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
