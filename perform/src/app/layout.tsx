import type { Metadata } from "next";
import { Outfit, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { NewsTicker } from "@/components/layout/NewsTicker";
import { BreakingBar } from "@/components/layout/BreakingBar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AudioPlayerProvider } from "@/context/AudioPlayerContext";
import { AudioPlayer } from "@/components/podcast/AudioPlayer";
import { SignInPrompt } from "@/components/SignInPrompt";

// Self-hosted fonts via next/font — replaces the render-blocking Google
// Fonts @import in globals.css that caused FOUT-driven CLS on the
// homepage (Lighthouse CLS 0.245 pre-fix). The `variable` assignments
// expose font faces as CSS custom properties so existing Tailwind
// font-outfit / font-mono utilities and inline fontFamily strings keep
// working without changes.
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
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Per|Form — Sports Grading & Ranking Platform",
  description: "TIE-powered grades for NFL, college football, and recruiting. The PFF competitor that runs itself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${outfit.variable} ${plexMono.variable} ${inter.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col" style={{ background: 'var(--pf-bg)' }}>
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
