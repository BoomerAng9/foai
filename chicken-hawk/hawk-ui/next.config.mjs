/** @type {import('next').NextConfig} */
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://hawk-gateway:8000';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone builds don't ship sharp by default — `/_next/image` returns
  // 400 for any optimization request. Serve raw assets instead. The hawk PNGs
  // and SVG are pre-sized so we don't need on-the-fly optimization.
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // Public chat (anonymous, persona-prepended) — proxied to gateway.
      { source: '/api/public/chat', destination: `${GATEWAY_URL}/api/public/chat` },
      // Server-tier API routes proxied to FastAPI gateway. The Next.js side
      // never owns auth state — it forwards bearer/cookie to the gateway.
      { source: '/api/gateway/:path*', destination: `${GATEWAY_URL}/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
