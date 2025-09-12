/**
 * Performance monitoring hook for tracking render performance
 */

import React, { useEffect, useLayoutEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
}

export function usePerformanceMonitor(componentName: string) {
  const startTime = useRef<number>();
  const metricsRef = useRef<PerformanceMetrics[]>([]);

  // Measure render start time
  useLayoutEffect(() => {
    startTime.current = performance.now();
  });

  // Measure render completion time
  useEffect(() => {
    if (startTime.current) {
      const endTime = performance.now();
      const renderTime = endTime - startTime.current;

      const metric: PerformanceMetrics = {
        renderTime,
        componentName,
        timestamp: Date.now(),
      };

      metricsRef.current.push(metric);

      // Log slow renders (>16ms for 60fps)
      if (renderTime > 16) {
        console.warn(
          `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
        );
      }

      // Keep only last 100 measurements
      if (metricsRef.current.length > 100) {
        metricsRef.current = metricsRef.current.slice(-100);
      }
    }
  });

  const getAverageRenderTime = () => {
    if (metricsRef.current.length === 0) return 0;
    const total = metricsRef.current.reduce((sum, m) => sum + m.renderTime, 0);
    return total / metricsRef.current.length;
  };

  const getSlowRenderCount = () => {
    return metricsRef.current.filter((m) => m.renderTime > 16).length;
  };

  return {
    getAverageRenderTime,
    getSlowRenderCount,
    totalMeasurements: metricsRef.current.length,
  };
}

// React DevTools Profiler integration
export function withPerformanceProfiler<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName: string
): React.ComponentType<T> {
  const ProfiledComponent = (props: T) => {
    usePerformanceMonitor(componentName);
    return React.createElement(Component, props);
  };

  ProfiledComponent.displayName = `withPerformanceProfiler(${componentName})`;
  return ProfiledComponent;
}

// Performance observer for long tasks
export function useTaskMonitor() {
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // Tasks longer than 50ms
            console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
        return () => observer.disconnect();
      } catch (e) {
        // Longtask API not supported
        console.debug('Longtask API not supported');
      }
    }
  }, []);
}
