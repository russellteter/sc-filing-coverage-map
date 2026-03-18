import type { FilterState } from '@/components/Search/FilterPanel';

/**
 * Navigation Context Utilities
 *
 * Handles encoding/decoding filter state for URL parameters to preserve
 * user context when navigating between pages (map, race profiles, table view).
 */

/**
 * Encode filter state into URL query string format
 *
 * @example
 * encodeFilterState({ party: ['Democratic'], opportunity: ['HIGH_OPPORTUNITY'] })
 * // Returns: "party=Democratic&opportunity=HIGH_OPPORTUNITY"
 */
export function encodeFilterState(filters: FilterState): string {
  const params = new URLSearchParams();

  // Party filters
  if (filters.party.length > 0) {
    params.set('party', filters.party.join(','));
  }

  // Has candidate filter
  if (filters.hasCandidate !== 'all') {
    params.set('hasCandidate', filters.hasCandidate);
  }

  return params.toString();
}

/**
 * Decode URL query string into filter state object
 *
 * @example
 * decodeFilterState('party=Democratic&opportunity=HIGH_OPPORTUNITY')
 * // Returns: { party: ['Democratic'], opportunity: ['HIGH_OPPORTUNITY'], ... }
 */
export function decodeFilterState(queryString: string): Partial<FilterState> {
  const params = new URLSearchParams(queryString);
  const filters: Partial<FilterState> = {};

  // Party filters
  const partyParam = params.get('party');
  if (partyParam) {
    filters.party = partyParam.split(',').filter(Boolean);
  }

  // Has candidate filter
  const hasCandidateParam = params.get('hasCandidate');
  if (hasCandidateParam && (hasCandidateParam === 'yes' || hasCandidateParam === 'no')) {
    filters.hasCandidate = hasCandidateParam;
  }

  return filters;
}

/**
 * Build a return URL with preserved filter context
 *
 * @param pathname - The target pathname (e.g., '/', '/table')
 * @param filters - Current filter state to preserve
 * @param additionalParams - Additional URL params to include
 *
 * @example
 * buildReturnUrl('/', filters, { chamber: 'house', district: '15' })
 * // Returns: "/?chamber=house&district=15&party=Democratic&opportunity=HIGH_OPPORTUNITY"
 */
export function buildReturnUrl(
  pathname: string,
  filters: FilterState,
  additionalParams?: Record<string, string>
): string {
  const filterQuery = encodeFilterState(filters);
  const params = new URLSearchParams(filterQuery);

  // Add additional parameters
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value);
    });
  }

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

/**
 * Parse returnFilters from URL and merge with default filters
 *
 * @param searchParams - URL search params (from useSearchParams or window.location.search)
 * @param defaultFilters - Default filter state to merge with
 *
 * @example
 * const filters = parseReturnFilters(searchParams, defaultFilters);
 */
export function parseReturnFilters(
  searchParams: URLSearchParams | string,
  defaultFilters: FilterState
): FilterState {
  const params = typeof searchParams === 'string'
    ? new URLSearchParams(searchParams)
    : searchParams;

  const returnFiltersParam = params.get('returnFilters');

  if (!returnFiltersParam) {
    // No return filters, just use URL params directly
    const urlFilters = decodeFilterState(params.toString());
    return { ...defaultFilters, ...urlFilters };
  }

  // Decode the returnFilters parameter
  const returnFilters = decodeFilterState(returnFiltersParam);
  return { ...defaultFilters, ...returnFilters };
}

/**
 * Get current page context for "return" navigation
 * Captures chamber, district, and filter state
 */
export function getCurrentPageContext(
  chamber: 'house' | 'senate',
  district?: number,
  filters?: FilterState
): string {
  const params = new URLSearchParams();
  params.set('chamber', chamber);

  if (district) {
    params.set('district', district.toString());
  }

  if (filters) {
    const filterQuery = encodeFilterState(filters);
    if (filterQuery) {
      params.set('filters', filterQuery);
    }
  }

  return params.toString();
}
