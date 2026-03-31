import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { createSandbox, listSandboxes, deploySandbox } from '@/lib/sandbox/deployer';

// GET — list user's sandboxes
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const sandboxes = await listSandboxes(auth.userId);
  return NextResponse.json({ sandboxes });
}

// POST — create + deploy a new sandbox
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { name, agents, template, customDomain, branding } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const sandbox = await createSandbox({
    name,
    userId: auth.userId,
    agents: agents || ['acheevy'],
    template: template || 'basic',
    customDomain,
    branding,
  });

  if (!sandbox) {
    return NextResponse.json({ error: 'Failed to create sandbox' }, { status: 500 });
  }

  // Deploy immediately
  const result = await deploySandbox(sandbox);

  return NextResponse.json({
    sandbox: { ...sandbox, status: 'live' },
    deployment: result,
  });
}
