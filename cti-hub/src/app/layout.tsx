import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { WhiteLabelProvider } from "@/hooks/useWhiteLabel";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "The Deploy Platform",
  description: "Think it. Say it. Let's build it.",
  keywords: ["Deploy Platform", "AI Operations", "ACHEEVY", "ACHIEVEMOR"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        <WhiteLabelProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </WhiteLabelProvider>
      </body>
    </html>
  );
}
