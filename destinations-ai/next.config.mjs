/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Standalone output produces a minimal Node server bundle at .next/standalone
  // that the Cloud Run Dockerfile copies verbatim — ~40MB image vs 300MB+ full.
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'api.maptiler.com' },
      { protocol: 'https', hostname: 'tile.googleapis.com' },
    ],
  },
  // MapLibre ships raw workers + WebGL; mark it external at the server so
  // Next doesn't try to bundle it for SSR.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('maplibre-gl');
    }
    return config;
  },
  // Security headers — real production defaults.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
