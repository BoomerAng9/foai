"use client";

import React, { createContext, useContext } from 'react';

interface BrandConfig {
  systemName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
}

const config: BrandConfig = {
  systemName: 'CTI HUB',
  tagline: 'AI-Managed Solutions',
  primaryColor: '#00A3FF',
  accentColor: '#A855F7',
};

const BrandContext = createContext<{ config: BrandConfig }>({ config });

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  return (
    <BrandContext.Provider value={{ config }}>
      {children}
    </BrandContext.Provider>
  );
}

export const useWhiteLabel = () => useContext(BrandContext);
