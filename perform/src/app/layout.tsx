import type { Metadata } from "next";
import { Outfit, IBM_Plex_Mono, Inter, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { NewsTicker } from "@/components/layout/NewsTicker";
import { BreakingBar } from "@/components/layout/BreakingBar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AudioPlayerProvider } from "@/context/AudioPlayerContext";
import { AudioPlayer } from "@/components/podcast/AudioPlayer";
import { SignInPrompt } from "@/components/SignInPrompt";

// Self-hosted fonts via next/font. Barlow Condensed + JetBrains Mono
// match the broadcast landing at / (public/landing/index.html); Outfit
// + IBM Plex Mono stay loaded during the theme migration so existing
// pages keep rendering until PR γ moves them over.
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-barlow",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Per|Form — Sports Grading & Ranking Platform",
  description: "TIE-powered grades for NFL, college football, and recruiting. The PFF competitor that runs itself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${barlow.variable} ${jetbrains.variable} ${outfit.variable} ${plexMono.variable} ${inter.variable}`}>
      <body
        className="font-sans antialiased min-h-screen flex flex-col"
        data-league="nfl"
        style={{ background: 'var(--pf-bg)' }}
      >
        <ThemeProvider>
          <AudioPlayerProvider>
            <div className="flex-1">
              {children}
            </div>
            <AudioPlayer />
            <SignInPrompt />
            <BreakingBar />
            <NewsTicker />
          </AudioPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
