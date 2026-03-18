'use client';

/**
 * Skeleton Loading States for Voter Guide
 * Provides visual loading placeholders while data is being fetched
 */

// Skeleton for a single race card
export function RaceCardSkeleton() {
  return (
    <div className="skeleton-card p-4" style={{ minHeight: '200px' }}>
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="skeleton-text lg" style={{ width: '60%', marginBottom: '8px' }} />
          <div className="skeleton-text sm" style={{ width: '80%' }} />
        </div>
        <div className="skeleton-badge" />
      </div>

      {/* Incumbent section skeleton */}
      <div
        className="rounded-lg p-2 mb-3"
        style={{
          background: 'rgba(226, 232, 240, 0.3)',
          border: '1px solid rgba(226, 232, 240, 0.5)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="skeleton-text sm" style={{ width: '60px' }} />
            <div className="skeleton-badge" style={{ width: '24px' }} />
          </div>
        </div>
        <div className="skeleton-text" style={{ width: '120px', marginTop: '8px' }} />
      </div>

      {/* Candidates section skeleton */}
      <div>
        <div className="skeleton-text sm" style={{ width: '80px', marginBottom: '8px' }} />
        <div className="space-y-2">
          <div className="skeleton-text" style={{ width: '100%' }} />
          <div className="skeleton-text" style={{ width: '90%' }} />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="mt-3 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid rgba(226, 232, 240, 0.5)' }}>
        <div className="skeleton-text sm" style={{ width: '60px' }} />
        <div className="skeleton-text sm" style={{ width: '80px' }} />
      </div>
    </div>
  );
}

// Skeleton for section header
export function SectionHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="skeleton-avatar" />
      <div>
        <div className="skeleton-text lg" style={{ width: '150px', marginBottom: '8px' }} />
        <div className="skeleton-text sm" style={{ width: '200px' }} />
      </div>
    </div>
  );
}

// Skeleton for statewide races section
export function StatewideRacesSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <RaceCardSkeleton />
        <RaceCardSkeleton />
        <RaceCardSkeleton />
      </div>
    </div>
  );
}

// Skeleton for congressional races section
export function CongressionalRacesSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeaderSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RaceCardSkeleton />
        <RaceCardSkeleton />
      </div>
    </div>
  );
}

// Skeleton for timeline items
export function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="skeleton-timeline-dot" />
            {i < 4 && <div className="skeleton-timeline-line" />}
          </div>
          <div className="pb-4 flex-1">
            <div className="skeleton-text sm" style={{ width: '100px', marginBottom: '6px' }} />
            <div className="skeleton-text" style={{ width: '80%', marginBottom: '4px' }} />
            <div className="skeleton-text sm" style={{ width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton for voter resources section
export function VoterResourcesSkeleton() {
  return (
    <div className="space-y-6">
      <SectionHeaderSkeleton />

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-card p-4" style={{ minHeight: '80px' }}>
            <div className="flex items-center gap-3">
              <div className="skeleton-avatar" style={{ borderRadius: '50%' }} />
              <div className="flex-1">
                <div className="skeleton-text" style={{ width: '80%', marginBottom: '6px' }} />
                <div className="skeleton-text sm" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline skeleton */}
      <div className="skeleton-card p-4">
        <div className="skeleton-text lg" style={{ width: '180px', marginBottom: '16px' }} />
        <TimelineSkeleton />
      </div>
    </div>
  );
}

// Skeleton for KPI summary card
export function KPISummarySkeleton() {
  return (
    <div className="skeleton-card p-6" style={{ minHeight: '100px' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className="skeleton-text xl" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
            <div className="skeleton-text sm" style={{ width: '40px', marginTop: '8px' }} />
          </div>
          <div className="hidden sm:block w-px h-12" style={{ background: '#E2E8F0' }} />
          <div>
            <div className="skeleton-text lg" style={{ width: '150px', marginBottom: '8px' }} />
            <div className="skeleton-badge" style={{ width: '120px' }} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="skeleton-badge" style={{ width: '80px', height: '36px', borderRadius: '8px' }} />
          <div className="skeleton-badge" style={{ width: '80px', height: '36px', borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  );
}

// Full page skeleton for initial load
export function VoterGuidePageSkeleton() {
  return (
    <div className="space-y-10">
      <KPISummarySkeleton />
      <StatewideRacesSkeleton />
      <CongressionalRacesSkeleton />
      <VoterResourcesSkeleton />
    </div>
  );
}
