import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // `@aims/*` packages are raw TypeScript (no build step) consumed via
  // file: deps + tsconfig paths. transpilePackages runs them through SWC;
  // extensionAlias maps `.js` → `.ts` so their barrels (which use ESM
  // `./types.js`-style imports) resolve against the actual source files.
  transpilePackages: ['@aims/tie-matrix', '@aims/spinner', '@aims/pricing-matrix'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    // tsconfig paths resolve `@aims/tie-matrix` to `../aims-tools/
    // tie-matrix/src/index.ts` — bypassing the node_modules symlink
    // entirely. When THAT file imports `zod`, webpack walks up from
    // `aims-tools/tie-matrix/src/` looking for node_modules, never
    // reaching perform's. Explicitly adding perform's node_modules
    // to the module-resolution roots fixes the transitive lookup.
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      ...(config.resolve.modules ?? ['node_modules']),
    ];
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
};
export default nextConfig;
