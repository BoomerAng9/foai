import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/gateway
 * Polls the Chicken-Hawk gateway for agent statuses.
 * Proxies to the actual gateway WebSocket/REST endpoint.
 */
export async function GET(request: NextRequest) {
  const host = request.nextUrl.searchParams.get('host') || 'localhost';
  const port = request.nextUrl.searchParams.get('port') || '3100';

  try {
    const gatewayUrl = `http://${host}:${port}/api/status`;
    const response = await fetch(gatewayUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { connected: false, error: `Gateway returned ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      connected: true,
      agents: data.agents || [],
      vps1: data.vps1 || 'unknown',
      vps2: data.vps2 || 'unknown',
      tailscale: data.tailscale || false,
    });
  } catch (error) {
    // In demo/simulation mode, return mock data
    return NextResponse.json({
      connected: false,
      simulationMode: true,
      message: 'Gateway unreachable. Running in simulation mode.',
    });
  }
}

/**
 * POST /api/gateway
 * Sends commands to the Chicken-Hawk gateway.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, action, agentId, payload } = body;

    const gatewayUrl = `http://${host || 'localhost'}:${port || 3100}/api/command`;
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, agentId, payload }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send command to gateway' },
      { status: 502 }
    );
  }
}
