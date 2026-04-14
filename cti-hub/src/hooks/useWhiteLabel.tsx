"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getBrandConfig,
  type BrandConfig,
  type PlatformSurface,
  surfaceFromHostname,
} from '@/lib/platform/surface';

const defaultHost: PlatformSurface = 'deploy';
const BrandContext = createContext<{ config: BrandConfig; host: PlatformSurface }>({
  config: getBrandConfig(defaultHost),
  host: defaultHost,
});

export function WhiteLabelProvider({
  children,
  initialHost = defaultHost,
}: {
  children: React.ReactNode;
  initialHost?: PlatformSurface;
}) {
  const [host, setHost] = useState<PlatformSurface>(initialHost);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHost(surfaceFromHostname(window.location.hostname));
  }, []);

  const config = getBrandConfig(host);
  return (
    <BrandContext.Provider value={{ config, host }}>
      {children}
    </BrandContext.Provider>
  );
}

export const useWhiteLabel = () => useContext(BrandContext);
