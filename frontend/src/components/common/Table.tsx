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

export interface TableColumn<T> {
  /** Property key on the row object, or a unique string for render-only columns */
  key: keyof T | string;
  header: string;
  /** Optional custom cell renderer. Falls back to `row[key]` as a string. */
  render?: (row: T) => React.ReactNode;
  /** Optional CSS class applied to both <th> and <td> */
  className?: string;
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
    </div>
  );
}
