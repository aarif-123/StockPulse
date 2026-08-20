/**
 * Flexible skeleton loader component.
 *
 * Examples:
 *   <LoadingSkeleton variant="line" lines={3} />
 *   <LoadingSkeleton variant="card" count={4} />
 *   <LoadingSkeleton variant="stat" count={3} />
 */

import React from 'react';

type SkeletonVariant = 'line' | 'card' | 'stat';

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  /** Number of skeleton items to render (for card/stat variants) */
  count?: number;
  /** Number of text lines per skeleton block (for line variant) */
  lines?: number;
  className?: string;
}

function SkeletonBlock({ style }: { style?: React.CSSProperties }): React.ReactElement {
  return <div className="skeleton-block" style={style} aria-hidden />;
}

export function LoadingSkeleton({
  variant = 'line',
  count = 3,
  lines = 3,
  className,
}: LoadingSkeletonProps): React.ReactElement {
  if (variant === 'card') {
    return (
      <div className={`skeleton-grid ${className ?? ''}`.trim()} aria-busy aria-label="Loading…">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <SkeletonBlock style={{ height: '1.25rem', width: '60%', marginBottom: '0.75rem' }} />
            <SkeletonBlock style={{ height: '0.875rem', width: '90%', marginBottom: '0.5rem' }} />
            <SkeletonBlock style={{ height: '0.875rem', width: '75%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div className={`skeleton-stats ${className ?? ''}`.trim()} aria-busy aria-label="Loading…">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-stat-card">
            <SkeletonBlock style={{ height: '0.75rem', width: '40%', marginBottom: '0.75rem' }} />
            <SkeletonBlock style={{ height: '2rem', width: '55%' }} />
          </div>
        ))}
      </div>
    );
  }

  // Default: 'line' variant — stacked text lines
  return (
    <div className={`skeleton-lines ${className ?? ''}`.trim()} aria-busy aria-label="Loading…">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          style={{
            height: '0.875rem',
            // Vary widths for a realistic look
            width: i === lines - 1 ? '60%' : `${85 + (i % 3) * 5}%`,
            marginBottom: i < lines - 1 ? '0.5rem' : undefined,
          }}
        />
      ))}
    </div>
  );
}
