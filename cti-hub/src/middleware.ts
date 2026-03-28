import { NextResponse } from 'next/server';

// DEV MODE — all routes open, no auth gate
export function middleware() {
  return NextResponse.next();
}

export const config = { matcher: [] };
