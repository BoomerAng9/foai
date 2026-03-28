import { NextResponse } from 'next/server';

// No auth gate — internal power tool. All routes open.
export function middleware() {
  return NextResponse.next();
}

export const config = { matcher: [] };
