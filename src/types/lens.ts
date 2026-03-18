/**
 * Lens Type Definitions for Multi-Lens Visualization System
 *
 * The lens system transforms the map from a single view into a strategic
 * intelligence platform with switchable visualization modes.
 */

/**
 * Lens identifiers - the available visualization modes
 */
export type LensId = 'dem-filing';

/**
 * Legend item configuration for a lens
 */
export interface LensLegendItem {
  /** Color hex code or CSS value */
  color: string;
  /** Pattern ID if using SVG pattern instead of solid color */
  pattern?: string;
  /** Short label for legend display */
  label: string;
  /** Longer description for tooltips/accessibility */
  description: string;
}

/**
 * Complete definition of a lens including display properties and legend
 */
export interface LensDefinition {
  /** Unique lens identifier */
  id: LensId;
  /** Display label for the lens */
  label: string;
  /** Short label for mobile/compact displays */
  shortLabel: string;
  /** Description of what this lens shows */
  description: string;
  /** Icon name or SVG path (optional) */
  icon?: string;
  /** Legend items for this lens */
  legendItems: LensLegendItem[];
  /** Footnote text for the legend */
  footnote: string;
}

/**
 * All lens definitions with their configurations
 * v4.0 Slate Professional palette - aligned with districtColors.ts
 */
export const LENS_DEFINITIONS: Record<LensId, LensDefinition> = {
  /**
   * Dem Filing Lens
   * Shows Democratic coverage vs gaps in candidate filing
   * v4.0: Heat map colors for priority/opportunity gaps
   */
  'dem-filing': {
    id: 'dem-filing',
    label: 'Dem Filing',
    shortLabel: 'Filing',
    description: 'Democratic candidate filing coverage',
    icon: 'file-text',
    legendItems: [
      {
        color: '#1E40AF',
        label: 'Dem Filed',
        description: 'At least one Democratic candidate has filed',
      },
      {
        color: '#0F2980',
        label: 'Dem Primary',
        description: 'Two or more Democratic candidates (primary)',
      },
      {
        color: '#991B1B',
        label: 'Rep Only',
        description: 'Republican filed, no Democratic candidate',
      },
      {
        color: '#7C3AED',
        label: 'Both Parties',
        description: 'Both Democratic and Republican candidates filed',
      },
      {
        color: '#E2E8F0',
        label: 'Unfiled',
        description: 'No candidates have filed in this district',
      },
    ],
    footnote: 'Filing status from VREMS ballot filing data',
  },
};

/**
 * Default lens when none specified
 */
export const DEFAULT_LENS: LensId = 'dem-filing';

/**
 * Validate if a string is a valid lens ID
 */
export function isValidLensId(value: unknown): value is LensId {
  return typeof value === 'string' && value === 'dem-filing';
}

/**
 * Get lens definition by ID with fallback to default
 */
export function getLensDefinition(lensId: LensId | string): LensDefinition {
  if (isValidLensId(lensId)) {
    return LENS_DEFINITIONS[lensId];
  }
  return LENS_DEFINITIONS[DEFAULT_LENS];
}

/**
 * Array of all lens IDs for iteration
 */
export const ALL_LENS_IDS: LensId[] = ['dem-filing'];
