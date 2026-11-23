import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/daeroom';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status_aktif } = await req.json();
    await queryDb("UPDATE pengguna SET status_aktif = $1 WHERE id_pengguna = $2 AND peran = 'gatekeeper'", [
      Boolean(status_aktif),
      id,
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await queryDb("DELETE FROM pengguna WHERE id_pengguna = $1 AND peran = 'gatekeeper'", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
