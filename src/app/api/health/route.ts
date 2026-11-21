import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/daeroom';

export async function GET() {
  try {
    const r = await queryDb<{ db: string }>('SELECT current_database() AS db');
    return NextResponse.json({ status: 'ok', database: r.rows[0]?.db, mode: 'postgres-daeroom' });
  } catch (err) {
    return NextResponse.json({ status: 'error', message: (err as Error).message }, { status: 500 });
  }
}
