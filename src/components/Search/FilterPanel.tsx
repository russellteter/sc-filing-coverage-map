'use client';

import { useState, useRef, useEffect } from 'react';

export interface FilterState {
  party: string[];
  hasCandidate: 'all' | 'yes' | 'no';
}

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  className?: string;
  variant?: 'dropdown' | 'horizontal';
}

export const defaultFilters: FilterState = {
  party: [],
  hasCandidate: 'all',
};

// Dropdown component for filter groups
function FilterDropdown({
  label,
  value,
  options,
  onChange,
  multiSelect = false,
  selectedValues = [],
}: {
  label: string;
  value?: string;
  options: { value: string; label: string; color?: string }[];
  onChange: (value: string) => void;
  multiSelect?: boolean;
  selectedValues?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = multiSelect
    ? selectedValues.length > 0
      ? `${selectedValues.length} selected`
      : 'All'
    : options.find((o) => o.value === value)?.label || 'All';

  const hasSelection = multiSelect ? selectedValues.length > 0 : value && value !== 'all';

  return (
    <div className="flex items-center gap-2 filter-group" ref={dropdownRef}>
      <label className="text-xs uppercase font-medium tracking-wide text-slate-500 filter-group-label">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 min-w-[120px] bg-white border rounded-md text-sm cursor-pointer transition-colors filter-select ${
            hasSelection
              ? 'border-blue-600 bg-blue-50 text-blue-700 filter-select-active'
              : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="truncate">{displayValue}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-1 filter-dropdown" role="listbox">
            {options.map((option) => {
              const isSelected = multiSelect
                ? selectedValues.includes(option.value)
                : value === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    if (!multiSelect) setIsOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded cursor-pointer transition-colors filter-dropdown-item ${
                    isSelected ? 'bg-blue-50 text-blue-700 filter-dropdown-item-selected' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  style={option.color ? { '--item-color': option.color } as React.CSSProperties : undefined}
                >
                  {multiSelect && (
                    <span className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 transition-colors filter-checkbox ${
                      isSelected ? 'bg-blue-600 border-blue-600 text-white filter-checkbox-checked' : 'border-slate-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  )}
                  {option.color && (
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FilterPanel({
  filters,
  onFilterChange,
  className = '',
  variant = 'horizontal',
}: FilterPanelProps) {
  const partyOptions = [
    { value: 'Democratic', label: 'Democrats', color: 'var(--party-dem)' },
    { value: 'Republican', label: 'Republicans', color: 'var(--party-rep)' },
    { value: 'unknown', label: 'Unknown Party', color: 'var(--status-attention)' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Districts' },
    { value: 'yes', label: 'Has Candidates' },
    { value: 'no', label: 'No Candidates' },
  ];

  const toggleParty = (party: string) => {
    const newParties = filters.party.includes(party)
      ? filters.party.filter((p) => p !== party)
      : [...filters.party, party];
    onFilterChange({ ...filters, party: newParties });
  };

  const activeFilterCount = filters.party.length + (filters.hasCandidate !== 'all' ? 1 : 0);

  const clearFilters = () => {
    onFilterChange(defaultFilters);
  };

  // Horizontal variant - Class Dashboard style
  // Using Tailwind classes directly for critical layout to ensure production build works
  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-4 flex-wrap filter-bar ${className}`}>
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 filter-bar-label">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          FILTERS
        </span>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors filter-reset"
            aria-label="Reset all filters"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset All
          </button>
        )}

        <div className="w-px h-6 bg-slate-200 filter-bar-divider" />

        {/* Party Filter */}
        <FilterDropdown
          label="PARTY"
          options={partyOptions}
          multiSelect
          selectedValues={filters.party}
          onChange={toggleParty}
        />

        {/* Status Filter */}
        <FilterDropdown
          label="STATUS"
          value={filters.hasCandidate}
          options={statusOptions}
          onChange={(value) => onFilterChange({ ...filters, hasCandidate: value as 'all' | 'yes' | 'no' })}
        />
      </div>
    );
  }

  // Original dropdown variant (for backwards compatibility)
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium"
        style={{
          background: isExpanded ? 'var(--class-purple, #4739E7)' : 'var(--card-bg, #FFFFFF)',
          borderColor: 'var(--class-purple-light, #DAD7FA)',
          color: isExpanded ? 'white' : 'var(--text-primary)',
        }}
        aria-expanded={isExpanded}
        aria-controls="filter-panel"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span
            className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full"
            style={{
              background: isExpanded ? 'white' : 'var(--class-purple, #4739E7)',
              color: isExpanded ? 'var(--class-purple, #4739E7)' : 'white',
            }}
          >
            {activeFilterCount}
          </span>
        )}
        <svg className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div
          id="filter-panel"
          className="mt-2 p-4 rounded-lg border"
          style={{
            background: 'var(--card-bg, #FFFFFF)',
            borderColor: 'var(--class-purple-light, #DAD7FA)',
          }}
        >
          {/* Original dropdown content... simplified for brevity */}
          <p className="text-sm text-gray-500">Use horizontal variant for better UX</p>
        </div>
      )}
    </div>
  );
}
