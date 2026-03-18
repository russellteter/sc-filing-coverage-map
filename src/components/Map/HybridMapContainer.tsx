'use client';

import { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import type { Map as LeafletMapType } from 'leaflet';
import DistrictMap from './DistrictMap';
import type { CandidatesData, ElectionsData } from '@/types/schema';
import type { ChamberType } from '@/lib/leafletLoader';
import type { LensId } from '@/types/lens';
import { DEFAULT_LENS } from '@/types/lens';
import type { OpportunityData } from '@/lib/districtColors';

// Lazy load Leaflet components for zero initial bundle impact
const LeafletMap = lazy(() => import('./LeafletMap'));
const DistrictGeoJSONLayer = lazy(() => import('./DistrictGeoJSONLayer'));
const CountyBoundaryLayer = lazy(() => import('./CountyBoundaryLayer'));

type MapMode = 'svg' | 'leaflet';
type LegislativeChamber = 'house' | 'senate';

export interface HybridMapContainerProps {
  /** Initial chamber (default: 'house') */
  initialChamber?: LegislativeChamber | 'congressional';
  /** Candidate data for coloring */
  candidatesData: CandidatesData;
  /** Election history for margin-based coloring */
  electionsData?: ElectionsData | null;
  /** Currently selected district */
  selectedDistrict: number | null;
  /** Callback when district is clicked */
  onDistrictClick: (districtNumber: number) => void;
  /** Callback when district is hovered */
  onDistrictHover: (districtNumber: number | null) => void;
  /** Filter to specific districts */
  filteredDistricts?: Set<number>;
  /** State code for multi-state support (default: 'sc') */
  stateCode?: string;
  /** Show chamber toggle (default: true) */
  showChamberToggle?: boolean;
  /** Show mode toggle button (default: true) */
  showModeToggle?: boolean;
  /** Additional className */
  className?: string;
  /** Active lens for multi-lens visualization (default: 'dem-filing') */
  activeLens?: LensId;
  /** Opportunity data for opportunity lens */
  opportunityData?: Record<string, OpportunityData>;
  /** When true, highlight only gap districts (no Dem filed) */
  gapsOnly?: boolean;
}

/**
 * Loading placeholder for Leaflet
 */
function LeafletLoadingFallback() {
  return (
    <div className="leaflet-loading-placeholder">
      <div className="leaflet-loading-content">
        <div className="leaflet-loading-spinner" />
        <span>Loading interactive map...</span>
      </div>
    </div>
  );
}

/**
 * HybridMapContainer
 *
 * Renders SVG district map by default for fast initial load.
 * Upgrades to Leaflet with pan/zoom on user interaction.
 *
 * Features:
 * - SVG mode (default): Fast, no JS overhead, SEO-friendly
 * - Leaflet mode: Pan/zoom, tile layers, interactive features
 * - Chamber toggle: House / Senate / Congressional
 * - Preserves selected district across mode switches
 */
export default function HybridMapContainer({
  initialChamber = 'house',
  candidatesData,
  electionsData,
  selectedDistrict,
  onDistrictClick,
  onDistrictHover,
  filteredDistricts,
  stateCode = 'sc',
  showChamberToggle = true,
  showModeToggle = true,
  className,
  activeLens = DEFAULT_LENS,
  opportunityData,
  gapsOnly = false,
}: HybridMapContainerProps) {
  const [mode, setMode] = useState<MapMode>('svg');
  const [chamber, setChamber] = useState<LegislativeChamber | 'congressional'>(initialChamber);
  const [leafletMap, setLeafletMap] = useState<LeafletMapType | null>(null);
  const [hoveredCounty, setHoveredCounty] = useState<string | null>(null);

  // Toggle between SVG and Leaflet mode
  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'svg' ? 'leaflet' : 'svg'));
  }, []);

  // Chamber options
  const chamberOptions = useMemo(() => [
    { value: 'house' as const, label: 'House' },
    { value: 'senate' as const, label: 'Senate' },
    { value: 'congressional' as const, label: 'Congress' },
  ], []);

  // Handle chamber change
  const handleChamberChange = useCallback((newChamber: LegislativeChamber | 'congressional') => {
    setChamber(newChamber);
    // Congressional requires Leaflet (no SVG available)
    if (newChamber === 'congressional' && mode === 'svg') {
      setMode('leaflet');
    }
  }, [mode]);

  // Render SVG map (House/Senate only)
  const renderSvgMap = () => {
    if (chamber === 'congressional') {
      // Congressional doesn't have SVG, auto-switch to Leaflet
      return null;
    }

    return (
      <DistrictMap
        chamber={chamber}
        candidatesData={candidatesData}
        electionsData={electionsData}
        selectedDistrict={selectedDistrict}
        onDistrictClick={onDistrictClick}
        onDistrictHover={onDistrictHover}
        filteredDistricts={filteredDistricts}
        stateCode={stateCode}
        activeLens={activeLens}
        opportunityData={opportunityData}
        gapsOnly={gapsOnly}
      />
    );
  };

  // Handle map ready callback
  const handleMapReady = useCallback((map: LeafletMapType) => {
    setLeafletMap(map);
  }, []);

  // Render Leaflet map
  const renderLeafletMap = () => (
    <Suspense fallback={<LeafletLoadingFallback />}>
      <LeafletMap className="w-full h-full" onMapReady={handleMapReady}>
        {/* County boundaries (shown at zoom 8-10) */}
        {stateCode === 'sc' && (
          <CountyBoundaryLayer
            map={leafletMap}
            stateCode={stateCode}
            minZoom={8}
            maxZoom={10}
            onCountyHover={setHoveredCounty}
          />
        )}
        {/* District boundaries */}
        <DistrictGeoJSONLayer
          chamber={chamber as ChamberType}
          stateCode={stateCode}
          candidatesData={candidatesData}
          electionsData={electionsData}
          selectedDistrict={selectedDistrict}
          onDistrictClick={onDistrictClick}
          onDistrictHover={onDistrictHover}
          filteredDistricts={filteredDistricts}
          activeLens={activeLens}
          opportunityData={opportunityData}
          gapsOnly={gapsOnly}
        />
      </LeafletMap>
    </Suspense>
  );

  return (
    <div className={`hybrid-map-container relative ${className || ''}`}>
      {/* Controls */}
      <div className="absolute top-2 left-2 z-10 flex gap-2">
        {/* Chamber Toggle */}
        {showChamberToggle && (
          <div className="glass-control flex rounded-lg overflow-hidden">
            {chamberOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleChamberChange(option.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  chamber === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/90 text-gray-700 hover:bg-blue-50'
                }`}
                aria-pressed={chamber === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Map Container */}
      <div className="w-full h-full min-h-[300px]">
        {mode === 'svg' && chamber !== 'congressional' ? renderSvgMap() : renderLeafletMap()}
      </div>

      {/* Mode Indicator */}
      {mode === 'leaflet' && (
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2">
          <span className="glass-badge px-2 py-1 text-xs text-gray-600 bg-white/80 rounded">
            Interactive Mode
          </span>
          {hoveredCounty && (
            <span className="glass-badge px-2 py-1 text-xs text-gray-700 bg-white/90 rounded font-medium">
              {hoveredCounty} County
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { HybridMapContainer };
