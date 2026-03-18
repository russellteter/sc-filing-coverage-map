'use client';

import { useState, useMemo, useCallback } from 'react';
import TableHeader, { type SortField, type SortDirection } from './TableHeader';
import TableRow from './TableRow';
import type { StrategicTableRow } from '@/lib/exportCSV';

interface StrategicTableProps {
  rows: StrategicTableRow[];
  onRowClick: (row: StrategicTableRow) => void;
  isLoading?: boolean;
}

/**
 * Compare function for sorting table rows
 */
function compareRows(
  a: StrategicTableRow,
  b: StrategicTableRow,
  field: SortField,
  direction: SortDirection
): number {
  let aVal = a[field];
  let bVal = b[field];

  // Handle null/undefined
  if (aVal === null || aVal === undefined) aVal = '';
  if (bVal === null || bVal === undefined) bVal = '';

  // Special handling for margin - sort by numeric value
  if (field === 'marginDisplay') {
    const aMargin = a.margin2024 ?? -999;
    const bMargin = b.margin2024 ?? -999;
    return direction === 'asc' ? aMargin - bMargin : bMargin - aMargin;
  }

  // Numeric comparison
  if (typeof aVal === 'number' && typeof bVal === 'number') {
    return direction === 'asc' ? aVal - bVal : bVal - aVal;
  }

  // Boolean comparison
  if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
    const aNum = aVal ? 1 : 0;
    const bNum = bVal ? 1 : 0;
    return direction === 'asc' ? aNum - bNum : bNum - aNum;
  }

  // String comparison
  const aStr = String(aVal).toLowerCase();
  const bStr = String(bVal).toLowerCase();
  if (direction === 'asc') {
    return aStr.localeCompare(bStr);
  }
  return bStr.localeCompare(aStr);
}

export default function StrategicTable({
  rows,
  onRowClick,
  isLoading = false,
}: StrategicTableProps) {
  const [sortField, setSortField] = useState<SortField>('opportunityScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = useCallback((field: SortField) => {
    setSortField((prevField) => {
      if (prevField === field) {
        // Toggle direction if same field
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      // New field - default to descending for scores, ascending for text
      setSortDirection(
        field === 'opportunityScore' || field === 'margin2024' ? 'desc' : 'asc'
      );
      return field;
    });
  }, []);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => compareRows(a, b, sortField, sortDirection));
  }, [rows, sortField, sortDirection]);

  if (isLoading) {
    return (
      <div className="strategic-table-container">
        <div className="strategic-table-wrapper">
          <table className="strategic-table" role="grid">
            <thead className="strategic-table-header">
              <tr>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <th key={i} className="strategic-table-th">
                    <div className="skeleton-base skeleton-shimmer h-4 w-20 rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="strategic-table-row">
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <td key={j} className="strategic-table-td">
                      <div className="skeleton-base skeleton-shimmer h-4 w-full rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="strategic-table-container">
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="var(--text-muted)"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-lg font-medium" style={{ color: 'var(--text-color)' }}>
            No districts match your filters
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Try adjusting your filter criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="strategic-table-container">
      {/* Results count */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Showing <span className="font-semibold" style={{ color: 'var(--text-color)' }}>{sortedRows.length}</span> districts
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Sorted by {sortField === 'opportunityScore' ? 'Score' : sortField}{' '}
          ({sortDirection === 'asc' ? 'Low to High' : 'High to Low'})
        </p>
      </div>

      {/* Table wrapper for horizontal scroll on mobile */}
      <div className="strategic-table-wrapper">
        <table
          className="strategic-table"
          role="grid"
          aria-label="Strategic district data"
        >
          <TableHeader
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <tbody>
            {sortedRows.map((row, index) => (
              <TableRow
                key={row.districtId}
                row={row}
                index={index}
                onClick={onRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile scroll hint */}
      <div className="md:hidden mt-2 text-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Scroll horizontally for more columns
        </p>
      </div>
    </div>
  );
}
