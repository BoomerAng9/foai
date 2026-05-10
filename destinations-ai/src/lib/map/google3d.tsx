'use client';

/**
 * Google Maps Photorealistic 3D Tiles provider.
 *
 * Uses the official Google Maps 3D Web Component (<gmp-map-3d>) — GA April 2026,
 * part of the Maps JavaScript API (`v=alpha` channel at time of writing). Loads
 * the Maps JS SDK dynamically, registers the element, exposes camera + project
 * through the same MapContext the MapLibre provider uses.
 *
 * REQUIRES:
 *   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY set
 *   - The referenced API key has Maps JS, Map Tiles, and Places APIs enabled
 *   - Billing enabled on the GCP project (photorealistic 3D Tiles is metered)
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  MapContext,
  DEFAULT_CAMERA,
  type MapCamera,
  type MapContextValue,
  type MapProviderProps,
} from './provider';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const LOADER_ID = 'gmp-loader';

// Google's 3D web component exposes non-standard HTML attributes; declare
// a minimal TS shape so we can address it without `any`.
interface Gmp3DElement extends HTMLElement {
  center?: { lat: number; lng: number; altitude?: number };
  heading?: number;
  tilt?: number;
  range?: number;
  flyCameraTo?: (options: {
    endCamera: { center: { lat: number; lng: number; altitude?: number }; tilt?: number; heading?: number; range?: number };
    durationMillis?: number;
  }) => void;
}

function loadMapsSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('ssr'));
    if (document.getElementById(LOADER_ID)) {
      // Already loading — resolve when ready.
      const check = () =>
        window.customElements?.get('gmp-map-3d') ? resolve() : setTimeout(check, 50);
      check();
      return;
    }
    if (!GOOGLE_MAPS_API_KEY) {
      return reject(new Error(
        '[destinations-ai/google3d] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set — ' +
        'photorealistic 3D Tiles requires a Maps Platform key with 3D + Tiles APIs enabled.',
      ));
    }
    const script = document.createElement('script');
    script.id = LOADER_ID;
    script.async = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}` +
      `&v=alpha&libraries=maps3d`;
    script.onload = () => {
      // Wait until the 3d component is defined.
      const check = () =>
        window.customElements?.get('gmp-map-3d') ? resolve() : setTimeout(check, 50);
      check();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps JS SDK'));
    document.head.appendChild(script);
  });
}

export function Google3DTilesProvider({
  initialCamera = DEFAULT_CAMERA,
  onCameraChange,
  className,
  children,
}: MapProviderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<Gmp3DElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [camera, setCamera] = useState<MapCamera>(initialCamera);

  useEffect(() => {
    let disposed = false;

    (async () => {
      try {
        await loadMapsSdk();
        if (disposed || !containerRef.current) return;

        const el = document.createElement('gmp-map-3d') as Gmp3DElement;
        el.setAttribute('style', 'width:100%;height:100%;display:block;');
        el.setAttribute(
          'center',
          `${initialCamera.lat},${initialCamera.lng},400`,
        );
        el.setAttribute('tilt', String(initialCamera.pitch ?? 67.5));
        el.setAttribute('heading', String(initialCamera.bearing ?? 0));
        el.setAttribute('range', '12000');
        el.setAttribute('default-labels-disabled', 'false');

        containerRef.current.appendChild(el);
        elementRef.current = el;

        // Camera-change events on the 3D element bubble via gmp-centerchange etc.
        const syncCamera = () => {
          if (!el || disposed) return;
          const c = el.center;
          if (!c) return;
          const next: MapCamera = {
            lat: c.lat,
            lng: c.lng,
            zoom: Math.log2(40000000 / Math.max(el.range ?? 1000, 100)),
            pitch: el.tilt ?? 0,
            bearing: el.heading ?? 0,
          };
          setCamera(next);
          onCameraChange?.(next);
        };

        el.addEventListener('gmp-centerchange', syncCamera);
        el.addEventListener('gmp-headingchange', syncCamera);
        el.addEventListener('gmp-tiltchange', syncCamera);
        el.addEventListener('gmp-rangechange', syncCamera);

        setIsReady(true);
      } catch (err) {
        // Provider fails loud — UI should show a fallback state.
        // Downstream UI can detect !isReady and render an alternative.

        console.error('[destinations-ai/google3d] init failed', err);
      }
    })();

    return () => {
      disposed = true;
      elementRef.current?.remove();
      elementRef.current = null;
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Project via the 3D component is non-trivial — the renderer does not expose
  // a direct lngLat→screen function today. For overlays we approximate using
  // the DOM element's bounding rect + the current camera. Good enough for pin
  // placement at typical zoom levels; a full Mercator reprojection lives in
  // Phase 2 when we add a WebGL overlay layer.
  const project = useCallback<MapContextValue['project']>(
    (lngLat) => {
      const host = containerRef.current;
      if (!host) return null;
      const rect = host.getBoundingClientRect();
      const cosLat = Math.cos((camera.lat * Math.PI) / 180);
      const scale = Math.pow(2, camera.zoom) * 2;
      const dx = (lngLat.lng - camera.lng) * scale * cosLat;
      const dy = (camera.lat - lngLat.lat) * scale;
      const x = rect.width / 2 + dx;
      const y = rect.height / 2 + dy;
      if (x < -50 || y < -50 || x > rect.width + 50 || y > rect.height + 50) return null;
      return { x, y };
    },
    [camera],
  );

  const flyTo = useCallback<MapContextValue['flyTo']>((target) => {
    const el = elementRef.current;
    if (!el || !el.flyCameraTo) return;
    el.flyCameraTo({
      endCamera: {
        center: {
          lat: target.lat ?? camera.lat,
          lng: target.lng ?? camera.lng,
          altitude: 400,
        },
        tilt: target.pitch ?? camera.pitch ?? 67.5,
        heading: target.bearing ?? camera.bearing ?? 0,
        range: target.zoom != null ? 40000000 / Math.pow(2, target.zoom) : 12000,
      },
      durationMillis: 2000,
    });
  }, [camera]);

  const value = useMemo<MapContextValue>(
    () => ({
      providerName: 'google3d',
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
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full pointer-events-auto">{children}</div>
        </div>
      </MapContext.Provider>
    </div>
  );
}
