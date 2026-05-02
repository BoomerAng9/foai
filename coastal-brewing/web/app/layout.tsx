import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CoastalAsciiBackground } from "@/components/coastal-ascii-bg";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Sitewide tagline mixes quality (what we're brewing toward) with the
// agentic experience (chat with ACHEEVY). "Nothing Chemically, Ever."
// remains the per-product motto on motto-eligible SKUs only — the catalog
// also carries flavored / functional / K-cup lines that cannot honestly
// carry that promise. Owner directive 2026-05-02 retired the prior
// label-promise tagline; see feedback memory of the same date.
export const metadata: Metadata = {
  title: "Coastal Brewing Co. — Coffee, tea, matcha, served by ACHEEVY.",
  description:
    "Small-batch coffee, whole-leaf tea, ceremonial matcha, flavored blends, and functional brews — brewed honest, served by ACHEEVY, our AI team. Sourced through verified partners. Every public claim has a paper trail.",
  openGraph: {
    title: "Coastal Brewing Co.",
    description:
      "Coffee, tea, matcha — brewed honest, served by ACHEEVY. AI-managed Lowcountry brand, owner-signed.",
    type: "website",
    siteName: "Coastal Brewing Co.",
  },
  other: {
    "ai-content-policy": "agent-readable",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${mono.variable}`}
    >
      <body className="min-h-screen antialiased font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Coastal Brewing Co.",
              url: "https://brewing.foai.cloud",
              description:
                "Small-batch coffee, whole-leaf tea, ceremonial matcha, flavored blends, and functional brews. AI-managed Lowcountry brand.",
              slogan: "Coffee, tea, matcha — brewed honest, served by ACHEEVY.",
            }),
          }}
        />
        <CoastalAsciiBackground />
        {children}
      </body>
    </html>
  );
}
