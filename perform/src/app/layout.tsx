import type { Metadata } from "next";
import "./globals.css";
import { NewsTicker } from "@/components/layout/NewsTicker";
import { BreakingBar } from "@/components/layout/BreakingBar";

export const metadata: Metadata = {
  title: "Per|Form — Sports Grading & Ranking Platform",
  description: "TIE-powered grades for NFL, college football, and recruiting. The PFF competitor that runs itself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
        <div className="flex-1">
          {children}
        </div>
        <BreakingBar />
        <NewsTicker />
      </body>
    </html>
  );
}
