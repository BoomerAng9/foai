// frontend/app/onboarding/layout.tsx
import React, { ReactNode } from "react";
import { LogoWallBackground } from "@/components/LogoWallBackground";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <LogoWallBackground mode="hero">
      <div className="flex flex-1 items-center justify-center p-6 bg-transparent">
        <section className="auth-glass-card w-full max-w-xl rounded-[32px] p-8 md:p-12">
          {children}
        </section>
      </div>
    </LogoWallBackground>
  );
}
