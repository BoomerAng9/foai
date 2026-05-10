/**
 * Destinations AI — Map Provider abstraction.
 *
 * Two concrete providers ship in this package:
 *   - MapLibre GL JS via MapTiler (free tier, vector tiles) — default
 *   - Google Maps Photorealistic 3D Tiles (paid, cinematic 3D)
 *
 * Components consume the live map via `useMap()` for projection.
 * Swap providers at build time via NEXT_PUBLIC_MAP_PROVIDER.
 */

import { createContext, useContext } from 'react';

export type MapCamera = {
  lat: number;
  lng: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
};

export type MapStyle = 'dark' | 'light' | 'tactical' | 'satellite';
export type ProviderName = 'maplibre' | 'google3d';

export interface MapContextValue {
  /** Provider in use for this render. */
  providerName: ProviderName;
  /** Current camera — updates as the user pans/zooms. */
  camera: MapCamera;
  /** True once the underlying renderer has finished mounting. */
  isReady: boolean;
  /**
   * Project a geographic coordinate to viewport pixel coordinates.
   * Returns null when the point is off the currently-rendered viewport.
   */
  project: (lngLat: { lat: number; lng: number }) => { x: number; y: number } | null;
  /** Programmatically fly the camera to a new position. */
  flyTo: (target: Partial<MapCamera>) => void;
}

export const MapContext = createContext<MapContextValue | null>(null);

export function useMap(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) {
    throw new Error(
      '[destinations-ai/map] useMap() called outside <MapProvider>. ' +
        'Wrap your tree in <MapLibreProvider> or <Google3DTilesProvider>.',
    );
  }
  return ctx;
}

/**
 * Resolve which provider to instantiate. Build-time env wins; query-string
 * override allows A/B testing without a redeploy (?map=google3d).
 */
export function resolveProvider(searchParam?: string | null): ProviderName {
  if (searchParam === 'google3d' || searchParam === 'maplibre') return searchParam;
  const env = process.env.NEXT_PUBLIC_MAP_PROVIDER;
  if (env === 'google3d' || env === 'maplibre') return env;
  return 'maplibre';
}

// Default camera — Coastal Georgia corridor.
export const DEFAULT_CAMERA: MapCamera = {
  lat: 32.08,
  lng: -81.1,
  zoom: 10,
  pitch: 0,
  bearing: 0,
};

export interface MapProviderProps {
  initialCamera?: MapCamera;
  style?: MapStyle;
  onCameraChange?: (c: MapCamera) => void;
  className?: string;
  children?: React.ReactNode;
}
