/**
 * CSV Export Utility for SC Election Map 2026
 * Converts district data to CSV format and triggers download
 */

import type {
  CandidatesData,
  OpportunityData,
  ElectionsData,
  District,
  DistrictOpportunity,
  DistrictElectionHistory,
  Chamber,
} from '@/types/schema';

/**
 * Row data structure for the strategic table
 */
export interface StrategicTableRow {
  districtId: string;
  districtNumber: number;
  chamber: Chamber;
  incumbent: string;
  incumbentParty: string;
  challenger: string;
  challengerParty: string;
  tier: string;
  tierLabel: string;
  opportunityScore: number;
  margin2024: number | null;
  marginDisplay: string;
  hasDemocrat: boolean;
  hasRepublican: boolean;
  needsCandidate: boolean;
  openSeat: boolean;
  recommendation: string;
}

/**
 * Escape CSV field values - handles commas, quotes, and newlines
 */
function escapeCSVField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  // If the value contains commas, quotes, or newlines, wrap in quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape any quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Convert array of strategic table rows to CSV string
 */
function arrayToCSV(
  data: StrategicTableRow[],
  columns: { key: keyof StrategicTableRow; header: string }[]
): string {
  // Header row
  const headerRow = columns.map((col) => escapeCSVField(col.header)).join(',');

  // Data rows
  const dataRows = data.map((row) =>
    columns.map((col) => escapeCSVField(row[col.key])).join(',')
  );

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Trigger browser download of CSV file
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Build strategic table rows from raw data sources
 */
export function buildTableRows(
  candidatesData: CandidatesData,
  opportunityData: OpportunityData,
  electionsData: ElectionsData,
  chamber: Chamber
): StrategicTableRow[] {
  const rows: StrategicTableRow[] = [];
  const districts = candidatesData[chamber];
  const opportunities = opportunityData[chamber];
  const elections = electionsData[chamber];

  for (const [districtNum, district] of Object.entries(districts)) {
    const opportunity = opportunities[districtNum];
    const electionHistory = elections[districtNum];

    if (!opportunity) continue;

    // Find challenger (non-incumbent Democrat or first Democrat)
    const demCandidate = district.candidates.find(
      (c) => c.party?.toLowerCase() === 'democratic'
    );
    const repCandidate = district.candidates.find(
      (c) => c.party?.toLowerCase() === 'republican'
    );

    // Get 2024 margin
    const election2024 = electionHistory?.elections?.['2024'];
    const margin2024 = election2024 ? election2024.margin : null;
    const winner2024 = election2024?.winner;
    const marginSign = winner2024?.party === 'Republican' ? '+' : '-';
    const marginDisplay = margin2024 !== null ? `${marginSign}${margin2024.toFixed(1)}%` : 'N/A';

    // Determine incumbent info
    const incumbent = district.incumbent;
    const incumbentName = incumbent?.name || 'Open Seat';
    const incumbentParty = incumbent?.party || 'N/A';

    // Determine challenger (primary non-incumbent of interest)
    let challengerName = '';
    let challengerParty = '';
    if (demCandidate) {
      challengerName = demCandidate.name;
      challengerParty = 'Democratic';
    } else if (repCandidate && !repCandidate.isIncumbent) {
      challengerName = repCandidate.name;
      challengerParty = 'Republican';
    } else if (district.candidates.length > 0) {
      const nonIncumbent = district.candidates.find((c) => !c.isIncumbent);
      if (nonIncumbent) {
        challengerName = nonIncumbent.name;
        challengerParty = nonIncumbent.party || 'Unknown';
      }
    }

    rows.push({
      districtId: `${chamber === 'house' ? 'HD' : 'SD'}-${districtNum}`,
      districtNumber: parseInt(districtNum, 10),
      chamber,
      incumbent: incumbentName,
      incumbentParty,
      challenger: challengerName,
      challengerParty,
      tier: opportunity.tier,
      tierLabel: opportunity.tierLabel,
      opportunityScore: opportunity.opportunityScore,
      margin2024,
      marginDisplay,
      hasDemocrat: opportunity.flags.hasDemocrat,
      hasRepublican: !!repCandidate,
      needsCandidate: opportunity.flags.needsCandidate,
      openSeat: opportunity.flags.openSeat,
      recommendation: opportunity.recommendation,
    });
  }

  return rows;
}

/**
 * Export strategic table data to CSV file
 */
export function exportToCSV(
  rows: StrategicTableRow[],
  filename: string = 'sc-election-strategic-data.csv'
): void {
  const columns: { key: keyof StrategicTableRow; header: string }[] = [
    { key: 'districtId', header: 'District' },
    { key: 'chamber', header: 'Chamber' },
    { key: 'incumbent', header: 'Incumbent' },
    { key: 'incumbentParty', header: 'Incumbent Party' },
    { key: 'challenger', header: 'Challenger' },
    { key: 'challengerParty', header: 'Challenger Party' },
    { key: 'tierLabel', header: 'Strategic Tier' },
    { key: 'opportunityScore', header: 'Opportunity Score' },
    { key: 'marginDisplay', header: '2024 Margin' },
    { key: 'hasDemocrat', header: 'Has Democrat' },
    { key: 'needsCandidate', header: 'Needs Candidate' },
    { key: 'openSeat', header: 'Open Seat' },
    { key: 'recommendation', header: 'Recommendation' },
  ];

  const csvContent = arrayToCSV(rows, columns);
  downloadCSV(csvContent, filename);
}

/**
 * Export filtered data with custom columns
 */
export function exportFilteredToCSV(
  rows: StrategicTableRow[],
  chamber: Chamber,
  tierFilter?: string[]
): void {
  let filtered = rows;

  if (tierFilter && tierFilter.length > 0) {
    filtered = rows.filter((row) => tierFilter.includes(row.tier));
  }

  const chamberLabel = chamber === 'house' ? 'House' : 'Senate';
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `sc-${chamberLabel.toLowerCase()}-strategic-${dateStr}.csv`;

  exportToCSV(filtered, filename);
}
