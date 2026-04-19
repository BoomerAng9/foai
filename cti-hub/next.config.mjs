import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  turbopack: {
    root: projectRoot,
  },
  // `@aims/*` packages are raw TypeScript (no build step) consumed via
  // file: deps + tsconfig paths. transpilePackages runs them through SWC;
  // extensionAlias maps `.js` → `.ts` so their barrels (which use ESM
  // `./types.js`-style imports) resolve against the actual source files.
  transpilePackages: ['@aims/pricing-matrix', '@aims/spinner'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    // tsconfig paths resolve `@aims/spinner` / `@aims/pricing-matrix`
    // to `../aims-tools/*/src/index.ts` — bypassing node_modules. When
    // those files import `zod`, webpack walks up from `aims-tools/*/
    // src/` and never reaches cti-hub's node_modules. Explicitly
    // adding cti-hub's node_modules as a module-resolution root fixes
    // the transitive lookup.
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      ...(config.resolve.modules ?? ['node_modules']),
    ];
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
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
              "frame-src 'self' https://foai-aims.firebaseapp.com https://*.firebaseapp.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
