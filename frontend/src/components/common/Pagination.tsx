import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  totalItems?: number;
  /** Max visible page buttons before showing ellipsis (default: 5) */
  maxVisible?: number;
}

/** Computes the page numbers to show, inserting -1 as an ellipsis marker. */
function buildPageRange(current: number, total: number, maxVisible: number): number[] {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(2, current - half);
  let end = Math.min(total - 1, current + half);

  // Adjust when close to edges
  if (current - half < 2) {
    end = Math.min(total - 1, maxVisible - 1);
  }
  if (current + half > total - 1) {
    start = Math.max(2, total - maxVisible + 2);
  }

  const pages: number[] = [1];

  if (start > 2) pages.push(-1); // left ellipsis

  for (let p = start; p <= end; p++) pages.push(p);

  if (end < total - 1) pages.push(-1); // right ellipsis

  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 30, 50, 100],
  totalItems,
  maxVisible = 5,
}: PaginationProps): React.ReactElement | null {
  const pages = buildPageRange(currentPage, totalPages, maxVisible);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      {/* Page Size Selector */}
      {onPageSizeChange && pageSize && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: '3px 8px',
              fontSize: '12px',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / page
              </option>
            ))}
          </select>
          {totalItems !== undefined && (
            <span style={{ color: 'var(--text-tertiary)' }}>
              (Total {totalItems} items)
            </span>
          )}
        </div>
      )}

      {/* Pagination Page Navigation Buttons */}
      {totalPages > 1 ? (
        <nav className="pagination" aria-label="Pagination" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            ‹ Prev
          </button>

          {pages.map((page, idx) =>
            page === -1 ? (
              <span key={`ellipsis-${idx}`} className="pagination-ellipsis" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={page}
                className={`pagination-btn ${page === currentPage ? 'pagination-btn--active' : ''}`}
                onClick={() => onPageChange(page)}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            )
          )}

          <button
            className="pagination-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            Next ›
          </button>
        </nav>
      ) : null}
    </div>
  );
}

export default Pagination;
