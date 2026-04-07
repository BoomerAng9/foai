import { NextRequest, NextResponse } from 'next/server';
import {
  generateDesign,
  refineDesign,
  exportReact,
  stitchAvailable,
} from '@/lib/stitch-mcp/client';
import { curateDesign } from '@/lib/stitch-mcp/iller-ang-curator';
import type { DesignBrief, DesignVariant } from '@/lib/stitch-mcp/types';

/* ──────────────────────────────────────────────────────────────
 *  POST /api/stitch/generate
 *  Body: DesignBrief
 *  Returns:
 *    { variants: [{ variant, curation, reactCode }], winner, error? }
 *
 *  The full pipeline runs here:
 *    1. If openMindEnabled: generate 3 variants (conventional /
 *       contrarian / unexpected). Otherwise 1 conventional.
 *    2. Run Iller_Ang curation on each variant.
 *    3. Refine any that came back REFINE (up to 1 iteration).
 *    4. Export React code for every APPROVED variant.
 *    5. Pick a winner (first APPROVED, tie-break by approach priority).
 *
 *  Phase 1: Stitch API not wired → returns stub variants so the UI
 *  can be built and tested end-to-end.
 * ────────────────────────────────────────────────────────────── */

const APPROACH_PRIORITY: DesignVariant['approach'][] = [
  'conventional',
  'unexpected',
  'contrarian',
];

export async function POST(req: NextRequest) {
  try {
    const brief = (await req.json()) as DesignBrief;

    if (!brief.intent || !brief.screenType) {
      return NextResponse.json(
        { error: 'intent and screenType required' },
        { status: 400 },
      );
    }

    const approaches: DesignVariant['approach'][] = brief.openMindEnabled
      ? ['conventional', 'contrarian', 'unexpected']
      : ['conventional'];

    const results: Array<{
      variant: DesignVariant;
      curation: ReturnType<typeof curateDesign>;
      reactCode: string | null;
    }> = [];

    for (const approach of approaches) {
      // Step 1: generate
      let gen = await generateDesign(brief, approach);
      let variant: DesignVariant = {
        id: gen.designId,
        approach,
        briefSummary: `${approach} approach to: ${brief.intent.slice(0, 120)}`,
        stitchDesignId: gen.designId,
        previewUrl: gen.previewUrl ?? undefined,
        createdAt: new Date().toISOString(),
      };

      // Step 2: export React for curation (best effort)
      let reactCode = await exportReact(gen.designId);

      // Step 3: curate
      let curation = curateDesign({
        brief,
        variant,
        exportedCode: reactCode ?? undefined,
      });

      // Step 4: refine once if Iller_Ang asks for it
      if (curation.verdict === 'REFINE' && curation.refinementBrief) {
        gen = await refineDesign(gen.designId, curation.refinementBrief);
        variant = {
          ...variant,
          id: gen.designId,
          stitchDesignId: gen.designId,
          previewUrl: gen.previewUrl ?? undefined,
        };
        reactCode = await exportReact(gen.designId);
        curation = curateDesign({
          brief,
          variant,
          exportedCode: reactCode ?? undefined,
        });
      }

      variant.reactExport = reactCode ?? undefined;
      results.push({ variant, curation, reactCode });
    }

    // Step 5: pick winner — first APPROVED, else first REFINE, else first REJECT
    const approved = results.filter(r => r.curation.verdict === 'APPROVED');
    const winnerCandidates =
      approved.length > 0
        ? approved.sort(
            (a, b) =>
              APPROACH_PRIORITY.indexOf(a.variant.approach) -
              APPROACH_PRIORITY.indexOf(b.variant.approach),
          )
        : results;
    const winner = winnerCandidates[0] || null;

    return NextResponse.json({
      stitchConfigured: stitchAvailable(),
      variants: results,
      winner,
      pipeline: {
        grammarFiltered: true,
        scenariosStructured: true,
        openMindEnabled: brief.openMindEnabled,
        illerAngCurated: true,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stitch generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
