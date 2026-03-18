'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import CandidateCard from './CandidateCard';
import CollapsibleSection from './CollapsibleSection';
import type { District } from '@/types/schema';

interface SidePanelProps {
  chamber: 'house' | 'senate';
  district: District | null;
  onClose: () => void;
}

export default function SidePanel({
  chamber,
  district,
  onClose,
}: SidePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ top: false, bottom: false });

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollState({
      top: el.scrollTop > 8,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 8,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll, district]);

  if (!district) {
    return (
      <div
        className="h-full flex items-center justify-center p-6"
        style={{ color: 'var(--text-muted)' }}
      >
        <div className="text-center animate-entrance">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'var(--background-alt)' }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: 'var(--brand-primary-light)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold font-display" style={{ color: 'var(--text-color)' }}>
            Select a District
          </p>
          <p className="text-sm mt-1">
            Click on a district to see candidates
          </p>
        </div>
      </div>
    );
  }

  const chamberLabel = chamber === 'house' ? 'House' : 'Senate';
  const hasDem = district.candidates.some((c) => c.party?.toLowerCase() === 'democratic');
  const hasRep = district.candidates.some((c) => c.party?.toLowerCase() === 'republican');
  const isContested = hasDem && hasRep;

  return (
    <div className="h-full flex flex-col side-panel">
      {/* Header */}
      <div
        className="border-b z-10 shrink-0 side-panel-header"
        style={{
          padding: '12px 16px',
          background: 'var(--glass-gradient)',
          borderColor: 'var(--class-purple-light)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold font-display" style={{ color: 'var(--text-color)' }}>
              {chamberLabel} District {district.districtNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all focus-ring"
            style={{ color: 'var(--text-muted)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--highlight-purple)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 mt-2 flex-wrap">
          <span className="badge badge-neutral">{chamberLabel}</span>
          {isContested && (
            <span className="badge badge-both">
              <span className="pulse-indicator" style={{ background: 'var(--color-excellent)', width: '6px', height: '6px' }} />
              Contested Race
            </span>
          )}
          {hasDem && !isContested && (
            <span className="badge badge-democrat">Democrat Running</span>
          )}
          {hasRep && !isContested && (
            <span className="badge badge-republican">Republican Running</span>
          )}
          {!hasDem && !hasRep && district.candidates.length > 0 && (
            <span className="badge badge-unknown">Party Unknown</span>
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div
        className="side-panel-scroll-wrapper flex-1 min-h-0 overflow-hidden"
        data-scroll-top={scrollState.top}
        data-scroll-bottom={scrollState.bottom}
      >
        <div
          ref={scrollRef}
          className="side-panel-scroll side-panel-body h-full overflow-y-auto"
          style={{ background: 'var(--glass-background)' }}
        >
          <div
            key={`${chamber}-${district.districtNumber}`}
            className="panel-entrance"
          >
            <CollapsibleSection
              title="Candidates"
              defaultOpen
              badge={
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    background: 'var(--class-purple-bg)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {district.candidates.length}
                </span>
              }
            >
              {district.candidates.length === 0 ? (
                <div className="text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  <div
                    className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--brand-primary-light)' }}
                  >
                    <svg
                      className="w-6 h-6"
                      style={{ color: 'var(--brand-primary)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <p className="font-medium" style={{ color: 'var(--text-color)' }}>
                    No candidates have filed yet
                  </p>
                  <p className="text-sm mt-1">Check back later for updates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {district.candidates.map((candidate, index) => (
                    <CandidateCard key={candidate.reportId} candidate={candidate} index={index} />
                  ))}
                </div>
              )}
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
}
