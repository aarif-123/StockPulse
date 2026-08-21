/**
 * Generic typed Table component.
 *
 * Usage:
 *   <Table
 *     columns={[{ key: 'name', header: 'Name' }, { key: 'email', header: 'Email' }]}
 *     data={customers}
 *     keyExtractor={(row) => row.id}
 *     isLoading={loading}
 *     emptyMessage="No customers found."
 *     onRowClick={(row) => navigate(`/customers/${row.id}`)}
 *   />
 */

import React from 'react';
import { Pagination } from './Pagination';

export interface TableColumn<T> {
  /** Property key on the row object, or a unique string for render-only columns */
  key: keyof T | string;
  header: string;
  /** Optional custom cell renderer. Falls back to `row[key]` as a string. */
  render?: (row: T) => React.ReactNode;
  /** Optional CSS class applied to both <th> and <td> */
  className?: string;
}

export interface TablePaginationConfig {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  totalItems?: number;
  itemName?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  /** Used for React key — must return a unique string per row */
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  /** Number of skeleton rows shown while loading */
  skeletonRows?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /** Optional additional CSS class on the wrapping <div> */
  className?: string;
  /** Optional pagination config to render standardized pagination footer */
  pagination?: TablePaginationConfig;
}

const SKELETON_CELL_STYLE: React.CSSProperties = {
  height: '1rem',
  background: 'var(--skeleton-base, #e2e8f0)',
  borderRadius: '4px',
  animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
};

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  skeletonRows = 5,
  emptyMessage = 'No results found.',
  onRowClick,
  className,
  pagination,
}: TableProps<T>): React.ReactElement {
  const rowClickable = Boolean(onRowClick);

  return (
    <div className={`table-wrapper ${className ?? ''}`.trim()}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            // Skeleton loading rows
            Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <tr key={`skeleton-${rowIdx}`} className="skeleton-row">
                {columns.map((col) => (
                  <td key={String(col.key)} className={col.className}>
                    <div style={SKELETON_CELL_STYLE} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty-cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={rowClickable ? 'table-row-clickable' : undefined}
                role={rowClickable ? 'button' : undefined}
                tabIndex={rowClickable ? 0 : undefined}
                onKeyDown={
                  rowClickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick!(row);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className={col.className}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pagination && pagination.totalItems !== undefined && pagination.totalItems > 0 && (
        <div className="pagination-footer">
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing{' '}
            {Math.min(
              (pagination.currentPage - 1) * (pagination.pageSize || 10) + 1,
              pagination.totalItems
            )}
            –
            {Math.min(
              pagination.currentPage * (pagination.pageSize || 10),
              pagination.totalItems
            )}{' '}
            of {pagination.totalItems} {pagination.itemName || 'items'}
          </span>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.onPageSizeChange}
            pageSizeOptions={pagination.pageSizeOptions || [10, 25, 30, 50, 100]}
            totalItems={pagination.totalItems}
          />
        </div>
      )}
    </div>
  );
}
