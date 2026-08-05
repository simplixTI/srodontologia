import { NextResponse } from 'next/server';
import { generateIcs, getEvent } from '@/features/calendar/queries';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { eventId: string } }) {
  const ev = await getEvent(params.eventId);
  if (!ev) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const ics = await generateIcs(params.eventId);
  if (!ics) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${params.eventId}.ics"`
    }
  });
}
