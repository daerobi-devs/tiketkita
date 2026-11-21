import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DAEROOM_URL = process.env.DAEROOM_URL || 'https://apiv1.daeroom.my.id';
const DAEROOM_API_KEY = process.env.DAEROOM_API_KEY || '';
const S3_URL = process.env.NEXT_PUBLIC_S3_URL || 'https://s3.daeroom.my.id';
const BUCKET = process.env.DAEROOM_S3_BUCKET || 'webkonser-assets';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File poster tidak ditemukan.' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `poster-${Date.now()}.${ext}`;

    // Try uploading to Daeroom Cloud MinIO S3 first
    try {
      const s3Form = new FormData();
      s3Form.append('file', file);
      s3Form.append('path', `posters/${fileName}`);

      const upRes = await fetch(`${DAEROOM_URL}/v1/storage/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${DAEROOM_API_KEY}` },
        body: s3Form,
      });

      if (upRes.ok) {
        const publicUrl = `${S3_URL}/${BUCKET}/posters/${fileName}`;
        return NextResponse.json({ url: publicUrl, storage: 'daeroom-s3' });
      }
    } catch {
      // Fallback to local public/posters if S3 endpoint unavailable
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const destDir = path.join(process.cwd(), 'public', 'posters');
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, fileName), bytes);

    return NextResponse.json({ url: `/posters/${fileName}`, storage: 'local' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
