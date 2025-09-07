"use client";

type Props = {
  className?: string;
  rows?: number;
};

export default function Skeleton({ className = "", rows = 1 }: Props) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-lg bg-neutral-200/50 dark:bg-neutral-800/50 ${className}`}
        />
      ))}
    </div>
  );
}
