'use client';

/**
 * MapLibre GL JS provider — free-tier vector tiles via MapTiler.
 *
 * Uses a custom dark style tuned for the ACHIEVEMOR tactical aesthetic.
 * All child overlays (pins, drawers, composer) use useMap() for projection.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MLMap, StyleSpecification } from 'maplibre-gl';
import {
  MapContext,
  DEFAULT_CAMERA,
  type MapCamera,
  type MapContextValue,
  type MapProviderProps,
} from './provider';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

// MapTiler style URLs. Dark/tactical uses the "dataviz-dark" style which
// reads as a reconnaissance display out of the box; satellite adds terrain.
function styleUrl(style: string): string {
  if (!MAPTILER_KEY) {
    // Fallback to the free OSM raster tiles — functional but not cinematic.
    return 'https://demotiles.maplibre.org/style.json';
  }
  switch (style) {
    case 'satellite':
      return `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`;
    case 'light':
      return `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_KEY}`;
    case 'tactical':
    case 'dark':
    default:
      return `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;
  }
}

export function MapLibreProvider({
  initialCamera = DEFAULT_CAMERA,
  style = 'tactical',
  onCameraChange,
  className,
  children,
}: MapProviderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [camera, setCamera] = useState<MapCamera>(initialCamera);

  // MapLibre imports browser-only (WebGL + workers). Load on client mount.
  useEffect(() => {
    let disposed = false;
    let instance: MLMap | null = null;

    (async () => {
      if (!containerRef.current) return;
      const maplibre = await import('maplibre-gl');
      await import('maplibre-gl/dist/maplibre-gl.css');
      if (disposed || !containerRef.current) return;

      instance = new maplibre.Map({
        container: containerRef.current,
        style: styleUrl(style) as unknown as StyleSpecification,
        center: [initialCamera.lng, initialCamera.lat],
        zoom: initialCamera.zoom,
        pitch: initialCamera.pitch ?? 0,
        bearing: initialCamera.bearing ?? 0,
        attributionControl: { compact: true },
        // WebGL performance — avoid preserveDrawingBuffer unless screenshotting.
        preserveDrawingBuffer: false,
      });

      mapRef.current = instance;

      instance.on('load', () => {
        if (!disposed) setIsReady(true);
      });

      const syncCamera = () => {
        if (!instance || disposed) return;
        const c = instance.getCenter();
        const next: MapCamera = {
          lat: c.lat,
          lng: c.lng,
          zoom: instance.getZoom(),
          pitch: instance.getPitch(),
          bearing: instance.getBearing(),
        };
        setCamera(next);
        onCameraChange?.(next);
      };

      // Sync on 'move' (pan/zoom tick) AND 'moveend' so overlays track
      // smoothly during user interaction. Production could throttle the
      // 'move' handler with requestAnimationFrame if 60fps React re-renders
      // become a bottleneck, but Framer Motion + React 19 handle this fine
      // for 5–50 overlay markers.
      instance.on('move', syncCamera);
      instance.on('zoom', syncCamera);
      instance.on('moveend', syncCamera);
      instance.on('zoomend', syncCamera);
    })();

    return () => {
      disposed = true;
      instance?.remove();
      mapRef.current = null;
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  const project = useCallback<MapContextValue['project']>((lngLat) => {
    const m = mapRef.current;
    if (!m) return null;
    const p = m.project([lngLat.lng, lngLat.lat]);
    const canvas = m.getCanvas();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (p.x < -50 || p.y < -50 || p.x > w + 50 || p.y > h + 50) return null;
    return { x: p.x, y: p.y };
  }, []);

  const flyTo = useCallback<MapContextValue['flyTo']>((target) => {
    const m = mapRef.current;
    if (!m) return;
    m.flyTo({
      center: [target.lng ?? camera.lng, target.lat ?? camera.lat],
      zoom: target.zoom ?? camera.zoom,
      pitch: target.pitch ?? camera.pitch,
      bearing: target.bearing ?? camera.bearing,
      speed: 1.2,
      curve: 1.42,
      essential: true,
    });
  }, [camera]);

  const value = useMemo<MapContextValue>(
    () => ({
      providerName: 'maplibre',
      camera,
      isReady,
      project,
      flyTo,
    }),
    [camera, isReady, project, flyTo],
  );

  return (
    <div className={className ?? 'relative w-full h-full'}>
      <div ref={containerRef} className="absolute inset-0" />
      <MapContext.Provider value={value}>
        {/* Overlays render above the MapLibre canvas */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full pointer-events-auto">{children}</div>
        </div>
      </MapContext.Provider>
    </div>
  );
}
