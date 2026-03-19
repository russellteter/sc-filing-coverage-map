/**
 * Lens-aware KPI calculations — dem-filing lens only.
 */

import type { LensId } from '@/types/lens';
import type { District } from '@/types/schema';

export interface KpiItem {
  label: string;
  value: number | string;
  description?: string;
  color?: string;
}

function getDemFilingKpis(districts: District[]): KpiItem[] {
  let demCandidates = 0;
  const demDistrictSet = new Set<number>();

  for (const district of districts) {
    const demCands = district.candidates.filter(c => c.party?.toLowerCase() === 'democratic');
    demCandidates += demCands.length;
    if (demCands.length > 0) {
      demDistrictSet.add(district.districtNumber);
    }
  }

  const totalDistricts = districts.length > 0 ? districts.length : 124;
  const coverage = Math.round((demDistrictSet.size / totalDistricts) * 100);
  const gaps = totalDistricts - demDistrictSet.size;

  return [
    { label: 'Dem Candidates', value: demCandidates, color: 'var(--party-dem)' },
    { label: 'Dem Coverage', value: `${coverage}%` },
    { label: 'Dem Gaps', value: gaps, color: 'var(--status-attention)' },
  ];
}

export function getLensKpis(
  activeLens: LensId,
  districts: District[],
  opportunityData: Record<string, unknown> = {}
): KpiItem[] {
  return getDemFilingKpis(districts);
}
