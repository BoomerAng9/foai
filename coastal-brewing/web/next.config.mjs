/** @type {import('next').NextConfig} */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Allow Next.js to compile the sibling @aims/voice-library package, which
  // is imported via the tsconfig path alias and lives outside this Next app's
  // root. Without this, the build emits "Module parse failed" on the .ts files.
  transpilePackages: ["@aims/voice-library"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_BASE}/api/:path*` },
      { source: "/static/:path*", destination: `${API_BASE}/static/:path*` },
      { source: "/route", destination: `${API_BASE}/route` },
      { source: "/run", destination: `${API_BASE}/run` },
      { source: "/check", destination: `${API_BASE}/check` },
      { source: "/approve/:path*", destination: `${API_BASE}/approve/:path*` },
      { source: "/healthz", destination: `${API_BASE}/healthz` },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "brewing.foai.cloud" },
    ],
  },
};

export default nextConfig;
