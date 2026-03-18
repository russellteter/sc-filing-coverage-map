'use client';

import type { StrategicTableRow } from '@/lib/exportCSV';

export type SortField = keyof StrategicTableRow;
export type SortDirection = 'asc' | 'desc';

interface TableHeaderProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

interface ColumnDef {
  field: SortField;
  label: string;
  width: string;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
}

const columns: ColumnDef[] = [
  { field: 'districtId', label: 'District', width: 'w-24', align: 'left' },
  { field: 'incumbent', label: 'Incumbent', width: 'w-36', align: 'left', hideOnMobile: true },
  { field: 'challenger', label: 'Challenger', width: 'w-36', align: 'left', hideOnMobile: true },
  { field: 'tierLabel', label: 'Tier', width: 'w-32', align: 'left' },
  { field: 'opportunityScore', label: 'Score', width: 'w-20', align: 'center' },
  { field: 'marginDisplay', label: '2024 Margin', width: 'w-28', align: 'right' },
  { field: 'districtId', label: 'Actions', width: 'w-24', align: 'center' }, // Using districtId as dummy field for Actions (non-sortable)
];

export default function TableHeader({
  sortField,
  sortDirection,
  onSort,
}: TableHeaderProps) {
  return (
    <thead className="strategic-table-header">
      <tr>
        {columns.map((col, index) => {
          const isActive = sortField === col.field;
          const isActionsColumn = col.label === 'Actions';
          const textAlign =
            col.align === 'center'
              ? 'text-center'
              : col.align === 'right'
              ? 'text-right'
              : 'text-left';

          return (
            <th
              key={`${col.field}-${index}`}
              className={`strategic-table-th ${col.width} ${textAlign} ${
                col.hideOnMobile ? 'hidden md:table-cell' : ''
              }`}
              scope="col"
            >
              {isActionsColumn ? (
                // Actions column - non-sortable
                <span className="font-medium text-xs uppercase" style={{ color: 'var(--text-muted)' }}>
                  {col.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSort(col.field)}
                  className={`strategic-table-sort-btn ${isActive ? 'active' : ''}`}
                  aria-label={`Sort by ${col.label} ${
                    isActive
                      ? sortDirection === 'asc'
                        ? 'descending'
                        : 'ascending'
                      : 'ascending'
                  }`}
                >
                  <span>{col.label}</span>
                  <span className="sort-icon" aria-hidden="true">
                  {isActive ? (
                    sortDirection === 'asc' ? (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    )
                  ) : (
                    <svg
                      className="w-3.5 h-3.5 opacity-40"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                  )}
                </span>
              </button>
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

export { columns };
