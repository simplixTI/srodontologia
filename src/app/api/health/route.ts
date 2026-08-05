import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Liveness probe — never touches DB. Fast + free.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'sr-digital',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    environment: process.env.DEPLOY_ENV ?? process.env.NODE_ENV ?? 'unknown',
    time: new Date().toISOString()
  });
}
