'use client';

import { Button } from '@/components/ui';

interface ChamberToggleProps {
  chamber: 'house' | 'senate';
  onChange: (chamber: 'house' | 'senate') => void;
}

/**
 * Chamber toggle for switching between House and Senate views.
 * Uses Button primitive for consistent styling and WCAG-compliant touch targets.
 */
export default function ChamberToggle({ chamber, onChange }: ChamberToggleProps) {
  return (
    <div
      className="inline-flex bg-[var(--class-purple-bg)] rounded-lg p-1 border border-[var(--class-purple-light)] gap-1"
      role="tablist"
      aria-label="Chamber selection"
    >
      <Button
        variant={chamber === 'house' ? 'primary' : 'ghost'}
        size="md"
        onClick={() => onChange('house')}
        role="tab"
        aria-selected={chamber === 'house'}
        aria-controls="map-container"
        className={`
          rounded-md
          ${chamber === 'house' ? 'shadow-sm' : ''}
        `}
      >
        House (124)
      </Button>
      <Button
        variant={chamber === 'senate' ? 'primary' : 'ghost'}
        size="md"
        onClick={() => onChange('senate')}
        role="tab"
        aria-selected={chamber === 'senate'}
        aria-controls="map-container"
        className={`
          rounded-md
          ${chamber === 'senate' ? 'shadow-sm' : ''}
        `}
      >
        Senate (46)
      </Button>
    </div>
  );
}
