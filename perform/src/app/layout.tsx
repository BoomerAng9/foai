import type { Metadata } from "next";
import "./globals.css";
import { NewsTicker } from "@/components/layout/NewsTicker";
import { BreakingBar } from "@/components/layout/BreakingBar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AudioPlayerProvider } from "@/context/AudioPlayerContext";
import { AudioPlayer } from "@/components/podcast/AudioPlayer";
import { SignInPrompt } from "@/components/SignInPrompt";

export const metadata: Metadata = {
  title: "Per|Form — Sports Grading & Ranking Platform",
  description: "TIE-powered grades for NFL, college football, and recruiting. The PFF competitor that runs itself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
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
