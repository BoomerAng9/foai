import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { getBudget, resetBudget } from '@/lib/budget';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const budget = await getBudget();
  return NextResponse.json(budget);
}

// Owner-only: reset budget
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const amount = typeof body.amount === 'number' ? body.amount : 20;
  const budget = await resetBudget(amount);
  return NextResponse.json(budget);
}
