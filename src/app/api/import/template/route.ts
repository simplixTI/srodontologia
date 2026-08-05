import { NextResponse } from 'next/server';
import { getEntity } from '@/lib/import/entities';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const entityKey = url.searchParams.get('entity') ?? '';
  const entity = getEntity(entityKey);
  if (!entity) return NextResponse.json({ ok: false, error: 'unknown_entity' }, { status: 400 });

  return new NextResponse(entity.templateCsv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${entity.key}-template.csv"`
    }
  });
}
