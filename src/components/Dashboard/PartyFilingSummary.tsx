'use client';

import { useMemo, useState } from 'react';
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

interface DistrictDetail {
  districtNumber: number;
  demCount: number;
  repCount: number;
  otherCount: number;
  status: string;
  demNames: string[];
  repNames: string[];
}

/**
 * Party Filing Summary - breakdown of filing coverage by party
 *
 * Section A: Explicit summary table answering "how many districts are filled?"
 * Section B: Collapsible district-by-district detail table
 */
export function PartyFilingSummary({ districts, className = '' }: PartyFilingSummaryProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const { dem, rep, other, demPrimaries, unfiled, totalDistricts, districtDetails } = useMemo(() => {
    const total = districts.length > 0 ? districts.length : 124;
    const demDistrictSet = new Set<number>();
    const repDistrictSet = new Set<number>();
    const otherDistrictSet = new Set<number>();
    const demPrimaryDistricts = new Set<number>();
    let demCandidates = 0;
    let repCandidates = 0;
    let otherCandidates = 0;

    const details: DistrictDetail[] = [];

    for (const district of districts) {
      let dCount = 0;
      let rCount = 0;
      let oCount = 0;
      const dNames: string[] = [];
      const rNames: string[] = [];

      for (const candidate of district.candidates) {
        const party = candidate.party?.toLowerCase();
        if (party === 'democratic') {
          demCandidates++;
          dCount++;
          dNames.push(candidate.name);
          demDistrictSet.add(district.districtNumber);
        } else if (party === 'republican') {
          repCandidates++;
          rCount++;
          rNames.push(candidate.name);
          repDistrictSet.add(district.districtNumber);
        } else {
          otherCandidates++;
          oCount++;
          otherDistrictSet.add(district.districtNumber);
        }
      }

      // Include Dem incumbents in district coverage
      const isDemIncumbent = district.incumbent?.party === 'Democratic';
      if (isDemIncumbent) {
        demDistrictSet.add(district.districtNumber);
      }

      if (dCount >= 2) {
        demPrimaryDistricts.add(district.districtNumber);
      }

      // Determine status — count Dem incumbents as Dem coverage
      // This aligns table status with map coloring logic
      const hasDemCoverage = dCount > 0 || isDemIncumbent;

      let status: string;
      if (dCount === 0 && rCount === 0 && oCount === 0 && !isDemIncumbent) {
        status = 'Unfiled';
      } else if (dCount >= 2) {
        status = 'Dem Primary';
      } else if (hasDemCoverage && rCount >= 1) {
        status = 'Both Parties';
      } else if (hasDemCoverage) {
        status = 'Dem Filed';
      } else if (rCount >= 1) {
        status = 'Rep Only';
      } else {
        status = 'Other Only';
      }

      details.push({
        districtNumber: district.districtNumber,
        demCount: dCount,
        repCount: rCount,
        otherCount: oCount,
        status,
        demNames: dNames,
        repNames: rNames,
      });
    }

    details.sort((a, b) => a.districtNumber - b.districtNumber);

    const filedDistricts = new Set([...demDistrictSet, ...repDistrictSet, ...otherDistrictSet]);
    const unfiledCount = total - filedDistricts.size;

    const demStats: PartyStats = {
      candidates: demCandidates,
      districts: demDistrictSet.size,
      coverage: Math.round((demDistrictSet.size / total) * 100),
    };

    const repStats: PartyStats = {
      candidates: repCandidates,
      districts: repDistrictSet.size,
      coverage: Math.round((repDistrictSet.size / total) * 100),
    };

    const otherStats: PartyStats = {
      candidates: otherCandidates,
      districts: otherDistrictSet.size,
      coverage: Math.round((otherDistrictSet.size / total) * 100),
    };

    return {
      dem: demStats,
      rep: repStats,
      other: otherStats,
      demPrimaries: demPrimaryDistricts.size,
      unfiled: unfiledCount,
      totalDistricts: total,
      districtDetails: details,
    };
  }, [districts]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'Dem Filed':
      case 'Dem Primary':
        return '#1E40AF';
      case 'Both Parties':
        return '#6b21a8';
      case 'Rep Only':
        return '#991B1B';
      case 'Unfiled':
        return 'var(--status-attention, #EA580C)';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className={`glass-surface p-4 ${className}`.trim()}>
      <h3
        className="font-display text-sm font-semibold mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Filing Coverage by Party
      </h3>

      {/* Section A: Summary Table */}
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                borderBottom: '2px solid var(--border-subtle, #e5e7eb)',
              }}
            >
              <th className="text-left py-2 pr-4 font-semibold text-xs" style={{ color: '#6b7280' }}>
                Party
              </th>
              <th className="text-right py-2 px-3 font-semibold text-xs" style={{ color: '#6b7280' }}>
                Filed
              </th>
              <th className="text-right py-2 pl-3 font-semibold text-xs" style={{ color: '#6b7280' }}>
                Districts
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-subtle, #f3f4f6)' }}>
              <td className="py-2 pr-4 font-medium" style={{ color: '#1E40AF' }}>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                  style={{ background: '#1E40AF' }}
                />
                Democratic
              </td>
              <td className="text-right py-2 px-3 font-bold" style={{ color: '#1E40AF' }}>
                {dem.candidates}
              </td>
              <td className="text-right py-2 pl-3" style={{ color: '#374151' }}>
                {dem.districts} / {totalDistricts}{' '}
                <span className="text-xs" style={{ color: '#6b7280' }}>
                  ({dem.coverage}%)
                </span>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle, #f3f4f6)' }}>
              <td className="py-2 pr-4 font-medium" style={{ color: '#991B1B' }}>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                  style={{ background: '#991B1B' }}
                />
                Republican
              </td>
              <td className="text-right py-2 px-3 font-bold" style={{ color: '#991B1B' }}>
                {rep.candidates}
              </td>
              <td className="text-right py-2 pl-3" style={{ color: '#374151' }}>
                {rep.districts} / {totalDistricts}{' '}
                <span className="text-xs" style={{ color: '#6b7280' }}>
                  ({rep.coverage}%)
                </span>
              </td>
            </tr>
            {other.candidates > 0 && (
              <tr style={{ borderBottom: '1px solid var(--border-subtle, #f3f4f6)' }}>
                <td className="py-2 pr-4 font-medium" style={{ color: '#6b7280' }}>
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                    style={{ background: '#9CA3AF', border: '1px solid #6b7280' }}
                  />
                  Other
                </td>
                <td className="text-right py-2 px-3 font-bold" style={{ color: '#6b7280' }}>
                  {other.candidates}
                </td>
                <td className="text-right py-2 pl-3" style={{ color: '#374151' }}>
                  {other.districts} / {totalDistricts}{' '}
                  <span className="text-xs" style={{ color: '#6b7280' }}>
                    ({other.coverage}%)
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom summary row */}
      <div
        className="flex justify-between text-xs pt-2 mb-3"
        style={{ borderTop: '1px solid var(--border-subtle)', color: '#6b7280' }}
      >
        <span>
          Dem primaries:{' '}
          <strong style={{ color: '#1E40AF' }}>{demPrimaries} districts</strong>
        </span>
        <span>
          Unfiled:{' '}
          <strong style={{ color: 'var(--status-attention, #EA580C)' }}>
            {unfiled} districts
          </strong>
        </span>
      </div>

      {/* Section B: Collapsible District Detail */}
      <button
        onClick={() => setDetailOpen(!detailOpen)}
        className="w-full flex items-center justify-between text-xs font-medium py-2 px-3 rounded-lg transition-colors"
        style={{
          background: 'var(--bg-secondary, #f9fafb)',
          color: 'var(--text-muted, #6b7280)',
          border: '1px solid var(--border-subtle, #e5e7eb)',
        }}
      >
        <span>District Detail ({totalDistricts} districts)</span>
        <span style={{ fontSize: '10px' }}>{detailOpen ? '\u25BC' : '\u25B6'}</span>
      </button>

      {detailOpen && (
        <div
          className="mt-2 overflow-y-auto overflow-x-auto rounded-lg"
          style={{
            maxHeight: '400px',
            border: '1px solid var(--border-subtle, #e5e7eb)',
          }}
        >
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  position: 'sticky',
                  top: 0,
                  background: 'var(--bg-primary, #fff)',
                  borderBottom: '2px solid var(--border-subtle, #e5e7eb)',
                  zIndex: 1,
                }}
              >
                <th className="text-left py-1.5 px-2 font-semibold" style={{ color: '#6b7280' }}>
                  District
                </th>
                <th className="text-center py-1.5 px-2 font-semibold" style={{ color: '#1E40AF' }}>
                  Dem
                </th>
                <th className="text-center py-1.5 px-2 font-semibold" style={{ color: '#991B1B' }}>
                  Rep
                </th>
                <th className="text-left py-1.5 px-2 font-semibold" style={{ color: '#6b7280' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {districtDetails.map((d) => (
                <tr
                  key={d.districtNumber}
                  style={{
                    borderBottom: '1px solid var(--border-subtle, #f3f4f6)',
                    background:
                      d.status === 'Unfiled'
                        ? 'rgba(234, 88, 12, 0.04)'
                        : undefined,
                  }}
                >
                  <td className="py-1.5 px-2 font-medium" style={{ color: '#374151' }}>
                    HD {d.districtNumber}
                  </td>
                  <td className="text-center py-1.5 px-2" style={{ color: d.demCount > 0 ? '#1E40AF' : '#d1d5db' }}>
                    {d.demCount}
                  </td>
                  <td className="text-center py-1.5 px-2" style={{ color: d.repCount > 0 ? '#991B1B' : '#d1d5db' }}>
                    {d.repCount}
                  </td>
                  <td className="py-1.5 px-2">
                    <span
                      className="font-medium"
                      style={{ color: statusColor(d.status) }}
                    >
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PartyFilingSummary;
