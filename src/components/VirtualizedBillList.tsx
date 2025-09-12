'use client';

import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { calculateVisibleRange, useThrottle } from '@/utils/performance';
import type { BillRow } from '@/hooks/usePaginatedBills';
import type { BillBatchData } from '@/hooks/useBillsBatch';

const ITEM_HEIGHT = 280; // Approximate height of each bill card
const OVERSCAN = 3; // Number of items to render outside visible area

interface VirtualizedBillListProps {
  bills: BillRow[];
  nextDue: Record<string, string | undefined>;
  onRefresh: () => void;
  batchData: BillBatchData;
  isSelectMode?: boolean;
  selectedBills: Set<string>;
  onSelect: (billId: string) => void;
  vendorOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
  renderBillCard: (
    bill: BillRow,
    index: number,
    ref?: React.Ref<HTMLDivElement>
  ) => React.ReactNode;
  containerHeight?: number;
}

const VirtualizedBillList = memo<VirtualizedBillListProps>(
  function VirtualizedBillList({
    bills,
    nextDue,
    onRefresh,
    batchData,
    isSelectMode,
    selectedBills,
    onSelect,
    vendorOptions,
    projectOptions,
    renderBillCard,
    containerHeight = 600,
  }) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Throttle scroll handler to prevent excessive re-renders
    const handleScroll = useThrottle(
      useCallback((e: Event) => {
        const target = e.target as HTMLDivElement;
        setScrollTop(target.scrollTop);
      }, []),
      16 // ~60fps
    );

    useLayoutEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Calculate visible range
    const { start, end } = useMemo(
      () =>
        calculateVisibleRange(
          scrollTop,
          containerHeight,
          ITEM_HEIGHT,
          bills.length,
          OVERSCAN
        ),
      [scrollTop, containerHeight, bills.length]
    );

    // Get visible items
    const visibleBills = useMemo(
      () => bills.slice(start, end),
      [bills, start, end]
    );

    // Calculate total height and offset
    const totalHeight = bills.length * ITEM_HEIGHT;
    const offsetY = start * ITEM_HEIGHT;

    return (
      <div
        ref={containerRef}
        className="relative overflow-auto"
        style={{ height: containerHeight }}
      >
        {/* Virtual spacer for total content height */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items container */}
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
            className="space-y-4"
          >
            {visibleBills.map((bill, index) => {
              const actualIndex = start + index;
              return renderBillCard(
                bill,
                actualIndex,
                actualIndex === bills.length - 1 ? containerRef : undefined
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

export default VirtualizedBillList;
