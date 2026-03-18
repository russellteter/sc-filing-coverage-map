'use client';

import { useMemo } from 'react';
import type { LensId } from '@/types/lens';
import { LENS_DEFINITIONS, DEFAULT_LENS } from '@/types/lens';

interface LegendProps {
  /** Active lens - determines which legend items to show */
  activeLens?: LensId;
  className?: string;
}

/**
 * Legend component (v3.3) - Always-visible top-edge legend
 *
 * Design principles:
 * - Integrated into map container's top edge
 * - Horizontal flow with subtle dividers
 * - Always visible (no hover/pin behavior)
 * - Glassmorphic surface continuous with map frame
 */
export default function Legend({ activeLens = DEFAULT_LENS, className = '' }: LegendProps) {
  // Get legend items from the active lens definition
  const { legendItems, label: lensLabel } = useMemo(() => {
    const lens = LENS_DEFINITIONS[activeLens];
    return {
      legendItems: lens.legendItems,
      label: lens.label,
    };
  }, [activeLens]);

  return (
    <div
      className={`map-legend-integrated ${className}`}
      role="region"
      aria-label={`${lensLabel} legend`}
    >
      {/* Lens label (compact) */}
      <span className="legend-lens-label">{lensLabel}</span>

      {/* Divider */}
      <span className="legend-divider" aria-hidden="true" />

      {/* Legend items - horizontal flow */}
      <ul className="legend-items-row" aria-label="District status legend">
        {legendItems.map((item, index) => (
          <li key={item.label} className="legend-item-inline">
            {item.pattern ? (
              <span
                className={`legend-swatch-inline legend-pattern-${item.pattern}`}
                aria-hidden="true"
              />
            ) : (
              <span
                className="legend-swatch-inline"
                style={{
                  backgroundColor: item.color,
                  border: item.color === '#FFFFFF' ? '1px solid #CBD5E1' : undefined,
                }}
                aria-hidden="true"
              />
            )}
            <span className="legend-label-inline">{item.label}</span>
            {/* Divider between items (not after last) */}
            {index < legendItems.length - 1 && (
              <span className="legend-item-divider" aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
