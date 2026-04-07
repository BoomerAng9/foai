import { NextRequest, NextResponse } from 'next/server';
import {
  listForms,
  paperformAvailable,
  FORM_CATALOG,
  getFormsByVertical,
  type FormCatalogEntry,
} from '@/lib/paperform/client';

/* ──────────────────────────────────────────────────────────────
 *  GET /api/forms
 *  Query:
 *    vertical?    — athletics | workforce | agents | universal
 *    includeLive  — when '1' fetches the live Paperform list too
 *
 *  Returns the curated catalog + optional live Paperform data so
 *  the UI can show both the mapped use cases and raw forms.
 * ────────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const vertical = url.searchParams.get('vertical') as FormCatalogEntry['vertical'] | null;
  const includeLive = url.searchParams.get('includeLive') === '1';

  const catalog = vertical ? getFormsByVertical(vertical) : FORM_CATALOG;

  if (!includeLive) {
    return NextResponse.json({ catalog, available: paperformAvailable() });
  }

  if (!paperformAvailable()) {
    return NextResponse.json({
      catalog,
      liveForms: [],
      available: false,
      error: 'Paperform_Access_Token not set',
    });
  }

  const liveForms = await listForms({ limit: 100 });
  return NextResponse.json({ catalog, liveForms, available: true });
}
