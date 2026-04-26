import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Coastal Brewing Co. — Nothing chemically, ever.",
  description:
    "Small-batch coffee, whole-leaf tea, ceremonial matcha. Sourced through verified partners. Every public claim has a paper trail. Every cup is what the label says it is.",
  openGraph: {
    title: "Coastal Brewing Co.",
    description:
      "Nothing chemically, ever. Small-batch coffee, whole-leaf tea, ceremonial matcha — AI-managed, owner-signed.",
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
      className={`dark ${inter.variable} ${fraunces.variable} ${mono.variable}`}
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
                "Small-batch coffee, whole-leaf tea, and ceremonial matcha. AI-managed Lowcountry brand.",
              slogan: "Nothing chemically, ever.",
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
