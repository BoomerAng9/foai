// When perform runs as the Cloud Run Class B service behind Traefik on
// perform.foai.cloud, we need a distinct asset prefix so its /_next/* URLs
// don't collide with the VPS perform container's /_next/* (different build
// hashes). Traefik's file provider maps perform.foai.cloud/cr/* back to the
// Cloud Run origin with the /cr prefix stripped, so same-origin is preserved
// (no CORS). The VPS build leaves CLOUD_RUN_ASSET_PREFIX unset → no-op.
const CLOUD_RUN_ASSET_PREFIX = process.env.CLOUD_RUN_ASSET_PREFIX || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  assetPrefix: CLOUD_RUN_ASSET_PREFIX,
  // Workspace packages live as raw TypeScript at ../aims-tools/*. Next.js
  // must transpile them (no compiled JS exists) and resolve `.js` import
  // specifiers to `.ts` files (TS path-alias convention).
  transpilePackages: ['@aims/tie-matrix', '@aims/spinner'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias || {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' https:",
            "media-src 'self' blob: data: https:",
            "frame-src 'self' https://*.firebaseapp.com",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'a.espncdn.com',
        pathname: '/**',
      },
    ],
  },
  // Simulation surfaces retired 2026-04-23 per owner directive
  // ("kill this simulation all together"). These paths 308-redirect to the
  // live draft landing so old bookmarks/links don't 404.
  async redirects() {
    return [
      { source: '/draft/simulate', destination: '/draft', permanent: true },
      { source: '/draft/simulate/:path*', destination: '/draft', permanent: true },
      { source: '/draft/war-room', destination: '/draft', permanent: true },
      { source: '/draft/war-room/:path*', destination: '/draft', permanent: true },
      { source: '/draft/mock', destination: '/draft', permanent: true },
      { source: '/draft/results/:path*', destination: '/draft', permanent: true },
    ];
  },
};
export default nextConfig;
