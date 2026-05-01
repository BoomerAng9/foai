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

// Per owner directive 2026-04-30: "Nothing Chemically, Ever." applies
// PER-PRODUCT, not catalog-wide (the catalog now carries 64 flavored
// SKUs + 5 mushroom + 10 K-cups that can't honestly carry the motto).
// Sitewide metadata uses the always-true line "Every cup is what the
// label says it is" instead. The motto badge appears conditionally on
// product detail pages where `motto_eligible: true`.
export const metadata: Metadata = {
  title: "Coastal Brewing Co. — Every cup is what the label says it is.",
  description:
    "Small-batch coffee, whole-leaf tea, ceremonial matcha, flavored blends, and functional brews. Sourced through verified partners. Every public claim has a paper trail.",
  openGraph: {
    title: "Coastal Brewing Co.",
    description:
      "Every cup is what the label says it is. AI-managed Lowcountry coffee brand — owner-signed, claims-voider compliant.",
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
              slogan: "Every cup is what the label says it is.",
            }),
          }}
        />
        <CoastalAsciiBackground />
        {children}
      </body>
    </html>
  );
}
