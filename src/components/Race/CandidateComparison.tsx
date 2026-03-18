'use client';

import type { Candidate, Incumbent } from '@/types/schema';
import { Badge } from '@/components/ui';

interface CandidateComparisonProps {
  candidates: Candidate[];
  incumbent: Incumbent | null | undefined;
}

/**
 * CandidateComparison - Side-by-side candidate details
 * Shows all filed candidates with party affiliation and filing info
 */
export default function CandidateComparison({
  candidates,
  incumbent,
}: CandidateComparisonProps) {
  // Group candidates by party
  const democraticCandidates = candidates.filter(
    (c) => c.party?.toLowerCase() === 'democratic'
  );
  const republicanCandidates = candidates.filter(
    (c) => c.party?.toLowerCase() === 'republican'
  );
  const otherCandidates = candidates.filter(
    (c) =>
      c.party?.toLowerCase() !== 'democratic' &&
      c.party?.toLowerCase() !== 'republican'
  );

  if (candidates.length === 0) {
    return (
      <div className="glass-surface rounded-xl p-5">
        <h3
          className="text-base font-semibold font-display mb-4"
          style={{ color: 'var(--text-color)' }}
        >
          Candidates
        </h3>
        <div
          className="text-center py-8"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="text-sm font-medium">No candidates have filed yet</p>
          {incumbent && (
            <p className="text-xs mt-2">
              Incumbent: {incumbent.name} ({incumbent.party})
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-surface rounded-xl p-5">
      <h3
        className="text-base font-semibold font-display mb-4"
        style={{ color: 'var(--text-color)' }}
      >
        All Filed Candidates ({candidates.length})
      </h3>

      <div className="space-y-4">
        {/* Democratic candidates */}
        {democraticCandidates.length > 0 && (
          <PartySection
            title="Democratic"
            candidates={democraticCandidates}
            color="var(--class-purple)"
          />
        )}

        {/* Republican candidates */}
        {republicanCandidates.length > 0 && (
          <PartySection
            title="Republican"
            candidates={republicanCandidates}
            color="#DC2626"
          />
        )}

        {/* Other/Unknown candidates */}
        {otherCandidates.length > 0 && (
          <PartySection
            title="Other / Unknown"
            candidates={otherCandidates}
            color="var(--text-muted)"
          />
        )}
      </div>
    </div>
  );
}

interface PartySectionProps {
  title: string;
  candidates: Candidate[];
  color: string;
}

function PartySection({ title, candidates, color }: PartySectionProps) {
  return (
    <div>
      <div
        className="flex items-center gap-2 mb-2 pb-2 border-b"
        style={{ borderColor: 'var(--class-purple-light)' }}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ background: color }}
        />
        <h4
          className="text-sm font-semibold"
          style={{ color }}
        >
          {title}
        </h4>
        <span
          className="text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          ({candidates.length})
        </span>
      </div>

      <div className="space-y-2">
        {candidates.map((candidate, index) => (
          <CandidateRow
            key={candidate.reportId || `${candidate.name}-${index}`}
            candidate={candidate}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

interface CandidateRowProps {
  candidate: Candidate;
  index: number;
}

function CandidateRow({ candidate, index }: CandidateRowProps) {
  const isKjatwood = candidate.source === 'kjatwood';
  const isEthics = candidate.source === 'ethics';

  // Format date
  const formattedDate = candidate.filedDate
    ? new Date(candidate.filedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg animate-entrance"
      style={{
        background: 'var(--class-purple-bg)',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div className="flex-1 min-w-0">
        {/* Name and status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-medium text-sm"
            style={{ color: 'var(--text-color)' }}
          >
            {formatName(candidate.name)}
          </span>

          {candidate.isIncumbent && (
            <Badge variant="healthy" size="sm">
              Incumbent
            </Badge>
          )}

          {isKjatwood && (
            <Badge variant="excellent" size="sm">
              Confirmed
            </Badge>
          )}
        </div>

        {/* Filing details */}
        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {formattedDate && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formattedDate}
            </span>
          )}

          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isKjatwood
              ? 'Known candidate'
              : isEthics
              ? 'Ethics filing'
              : candidate.status || 'Unknown'}
          </span>
        </div>
      </div>

      {/* External link */}
      {candidate.ethicsUrl && (
        <a
          href={candidate.ethicsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 ml-3 p-2 rounded-lg transition-colors hover:bg-white/50"
          style={{ color: 'var(--class-purple)' }}
          aria-label={`View ethics filing for ${candidate.name}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  );
}

/**
 * Format name from "Last, First" to "First Last"
 */
function formatName(name: string): string {
  if (name.includes(',')) {
    return name.split(',').reverse().join(' ').trim();
  }
  return name;
}
