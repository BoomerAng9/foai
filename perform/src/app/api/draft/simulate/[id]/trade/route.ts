import { NextRequest, NextResponse } from 'next/server';
import {
  getSimulation,
  generateTradeOffer,
  acceptTradeOffer,
  type TradeOffer,
} from '@/lib/draft/simulation-engine';

const pendingOffers = new Map<string, TradeOffer>();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sim = getSimulation(id);
  if (!sim) return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });

  const offer = generateTradeOffer(id);
  if (offer) {
    pendingOffers.set(offer.offer_id, offer);
    return NextResponse.json({ has_offer: true, offer });
  }
  return NextResponse.json({ has_offer: false });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { action, offer_id } = body;
  const sim = getSimulation(id);
  if (!sim) return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
  if (sim.mode !== 'war-room') {
    return NextResponse.json({ error: 'Trades only available in War Room mode' }, { status: 400 });
  }

  if (action === 'accept' && offer_id) {
    const offer = pendingOffers.get(offer_id);
    if (!offer) {
      return NextResponse.json({ error: 'Offer expired or not found' }, { status: 404 });
    }
    const updated = acceptTradeOffer(id, offer_id, offer);
    pendingOffers.delete(offer_id);
    if (!updated) {
      return NextResponse.json({ error: 'Could not process trade' }, { status: 400 });
    }
    return NextResponse.json({
      status: 'accepted',
      trade: updated.trades[updated.trades.length - 1],
      simulation_status: updated.status,
    });
  }

  if (action === 'decline' && offer_id) {
    pendingOffers.delete(offer_id);
    return NextResponse.json({ status: 'declined', simulation_status: sim.status });
  }

  return NextResponse.json({ error: 'Invalid action. Use accept or decline.' }, { status: 400 });
}
