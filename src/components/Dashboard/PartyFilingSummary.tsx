'use client';

import { useMemo } from 'react';
import type { District } from '@/types/schema';

interface PartyFilingSummaryProps {
  districts: District[];
  className?: string;
}

interface PartyStats {
  candidates: number;
  districts: number;
  coverage: number;
}

/**
 * Party Filing Summary - breakdown of filing coverage by party
 *
 * Renders below KPI cards when dem-filing lens is active.
 * Shows per-party stats, Dem primaries, and unfiled districts.
 */
export function PartyFilingSummary({ districts, className = '' }: PartyFilingSummaryProps) {
  const stats = useMemo(() => {
    const totalDistricts = districts.length > 0 ? districts.length : 124;
    const demDistrictSet = new Set<number>();
    const repDistrictSet = new Set<number>();
    const demPrimaryDistricts = new Set<number>();
    let demCandidates = 0;
    let repCandidates = 0;

    for (const district of districts) {
      let demCount = 0;
      let repCount = 0;

      for (const candidate of district.candidates) {
        const party = candidate.party?.toLowerCase();
        if (party === 'democratic') {
          demCandidates++;
          demCount++;
          demDistrictSet.add(district.districtNumber);
        } else if (party === 'republican') {
          repCandidates++;
          repCount++;
          repDistrictSet.add(district.districtNumber);
        }
      }

      // Include Dem incumbents
      if (district.incumbent?.party === 'Democratic') {
        demDistrictSet.add(district.districtNumber);
      }

      if (demCount >= 2) {
        demPrimaryDistricts.add(district.districtNumber);
      }
    }

    const filedDistricts = new Set([...demDistrictSet, ...repDistrictSet]);
    const unfiled = totalDistricts - filedDistricts.size;

    const dem: PartyStats = {
      candidates: demCandidates,
      districts: demDistrictSet.size,
      coverage: Math.round((demDistrictSet.size / totalDistricts) * 100),
    };

    const rep: PartyStats = {
      candidates: repCandidates,
      districts: repDistrictSet.size,
      coverage: Math.round((repDistrictSet.size / totalDistricts) * 100),
    };

    return {
      dem,
      rep,
      demPrimaries: demPrimaryDistricts.size,
      unfiled,
      totalDistricts,
    };
  }, [districts]);

  return (
    <div className={`glass-surface p-4 ${className}`.trim()}>
      <h3
        className="font-display text-sm font-semibold mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Filing Coverage by Party
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Democratic stats */}
        <div
          className="rounded-lg p-3"
          style={{
            background: 'rgba(30, 64, 175, 0.06)',
            border: '1px solid rgba(30, 64, 175, 0.15)',
          }}
        >
          <div className="text-xs font-medium mb-1" style={{ color: '#1E40AF' }}>
            Democratic
          </div>
          <div className="text-lg font-bold" style={{ color: '#1E40AF' }}>
            {stats.dem.candidates}
            <span className="text-xs font-normal ml-1" style={{ color: '#6b7280' }}>
              candidates
            </span>
          </div>
          <div className="text-xs" style={{ color: '#6b7280' }}>
            {stats.dem.districts} districts ({stats.dem.coverage}%)
          </div>
        </div>

        {/* Republican stats */}
        <div
          className="rounded-lg p-3"
          style={{
            background: 'rgba(153, 27, 27, 0.06)',
            border: '1px solid rgba(153, 27, 27, 0.15)',
          }}
        >
          <div className="text-xs font-medium mb-1" style={{ color: '#991B1B' }}>
            Republican
          </div>
          <div className="text-lg font-bold" style={{ color: '#991B1B' }}>
            {stats.rep.candidates}
            <span className="text-xs font-normal ml-1" style={{ color: '#6b7280' }}>
              candidates
            </span>
          </div>
          <div className="text-xs" style={{ color: '#6b7280' }}>
            {stats.rep.districts} districts ({stats.rep.coverage}%)
          </div>
        </div>
      </div>

      {/* Bottom summary row */}
      <div
        className="flex justify-between text-xs pt-2"
        style={{ borderTop: '1px solid var(--border-subtle)', color: '#6b7280' }}
      >
        <span>
          Dem primaries:{' '}
          <strong style={{ color: '#1E40AF' }}>{stats.demPrimaries} districts</strong>
        </span>
        <span>
          Unfiled:{' '}
          <strong style={{ color: 'var(--status-attention, #EA580C)' }}>
            {stats.unfiled} districts
          </strong>
        </span>
      </div>
    </div>
  );
}

export default PartyFilingSummary;
