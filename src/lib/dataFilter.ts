/**
 * Data filtering utilities for candidate display
 * Handles filtering candidates by party based on toggle state
 */

import type { Candidate, District, Incumbent } from '@/types/schema';

export type RepublicanDataMode = 'none' | 'incumbents' | 'challengers' | 'all';

export interface FilterOptions {
  showRepublicanData: boolean;
  republicanDataMode: RepublicanDataMode;
}

/**
 * Filter candidates based on Republican toggle settings
 * @param candidates - Array of candidates to filter
 * @param incumbent - Current district incumbent info (if any)
 * @param options - Filter options including Republican toggle state
 * @returns Filtered candidates array
 */
export function filterCandidatesByParty(
  candidates: Candidate[],
  incumbent: Incumbent | null | undefined,
  options: FilterOptions
): Candidate[] {
  const { showRepublicanData, republicanDataMode } = options;

  return candidates.filter((candidate) => {
    const party = candidate.party?.toLowerCase();

    // Always show Democratic and unknown party candidates
    if (party === 'democratic' || !party) {
      return true;
    }

    // Republican candidates - filter based on toggle state
    if (party === 'republican') {
      if (!showRepublicanData || republicanDataMode === 'none') {
        return false;
      }

      // Check if this Republican is the incumbent
      const isIncumbent = candidate.isIncumbent ||
        (incumbent?.party === 'Republican' &&
         incumbent.name.toLowerCase() === candidate.name.toLowerCase());

      switch (republicanDataMode) {
        case 'incumbents':
          return isIncumbent;
        case 'challengers':
          return !isIncumbent;
        case 'all':
        default:
          return true;
      }
    }

    // Other parties - show them
    return true;
  });
}

/**
 * Get filtered candidates for a district
 * @param district - District data
 * @param options - Filter options
 * @returns Filtered candidates array
 */
export function getFilteredCandidates(
  district: District | null | undefined,
  options: FilterOptions
): Candidate[] {
  if (!district) {
    return [];
  }

  return filterCandidatesByParty(
    district.candidates,
    district.incumbent,
    options
  );
}

/**
 * Check if a district has visible Republican candidates based on filter
 * @param district - District data
 * @param options - Filter options
 * @returns true if Republicans are visible
 */
export function hasVisibleRepublicans(
  district: District | null | undefined,
  options: FilterOptions
): boolean {
  if (!district || !options.showRepublicanData) {
    return false;
  }

  const filtered = getFilteredCandidates(district, options);
  return filtered.some((c) => c.party?.toLowerCase() === 'republican');
}

/**
 * Group candidates by party for head-to-head display
 * @param candidates - Array of candidates (already filtered)
 * @returns Object with candidates grouped by party
 */
export function groupCandidatesByParty(candidates: Candidate[]): {
  democrats: Candidate[];
  republicans: Candidate[];
  others: Candidate[];
} {
  const democrats: Candidate[] = [];
  const republicans: Candidate[] = [];
  const others: Candidate[] = [];

  for (const candidate of candidates) {
    const party = candidate.party?.toLowerCase();
    if (party === 'democratic') {
      democrats.push(candidate);
    } else if (party === 'republican') {
      republicans.push(candidate);
    } else {
      others.push(candidate);
    }
  }

  return { democrats, republicans, others };
}

/**
 * Determine if we should show head-to-head view
 * (Both parties have visible candidates)
 */
export function shouldShowHeadToHead(
  district: District | null | undefined,
  options: FilterOptions
): boolean {
  if (!district || !options.showRepublicanData) {
    return false;
  }

  const filtered = getFilteredCandidates(district, options);
  const groups = groupCandidatesByParty(filtered);

  return groups.democrats.length > 0 && groups.republicans.length > 0;
}
