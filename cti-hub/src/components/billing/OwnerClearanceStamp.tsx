/**
 * OwnerClearanceStamp — visual treatment shown to owner accounts in
 * place of the normal pricing tier grid (or as an overlay above it).
 *
 * Used by:
 *   src/app/(dashboard)/pricing/page.tsx
 *   src/app/(dashboard)/billing/page.tsx
 *
 * Owners never see Stripe checkout buttons. The bypass is enforced
 * server-side in the Stripe checkout routes; this component is the
 * client-side visual confirmation.
 */
import { Shield } from 'lucide-react';

type Variant = 'full' | 'banner';

interface OwnerClearanceStampProps {
  /**
   * 'full'   — large centered stamp, for replacing/overlaying the tier grid.
   * 'banner' — compact horizontal banner, for stacking above other content.
   */
  variant?: Variant;
}

export function OwnerClearanceStamp({ variant = 'full' }: OwnerClearanceStampProps) {
  if (variant === 'banner') {
    return (
      <div className="border-2 border-[#F5A623]/50 bg-[#F5A623]/5 px-6 py-5 flex items-center gap-4 rounded-sm">
        <Shield className="w-7 h-7 text-[#F5A623] shrink-0" />
        <div className="flex-1">
          <p className="font-mono text-base font-bold text-[#F5A623] tracking-widest uppercase">
            Unlimited Berth · Owner Clearance
          </p>
          <p className="text-xs text-[#999] mt-1">
            All features unlocked. Payment flows are bypassed. No checkout required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center p-12 border-2 border-[#F5A623]/40 rounded-2xl bg-[#F5A623]/5 max-w-xl">
        <Shield className="w-12 h-12 text-[#F5A623] mx-auto mb-6" />
        <p className="font-black text-3xl text-[#F5A623] tracking-widest uppercase">
          Unlimited Berth
        </p>
        <p className="font-mono text-sm text-[#F2EAD3] mt-3 uppercase tracking-[0.2em]">
          Owner Clearance
        </p>
        <p className="font-mono text-xs text-[#999] mt-6">
          No checkout required. All features unlocked.
        </p>
      </div>
    </div>
  );
}
