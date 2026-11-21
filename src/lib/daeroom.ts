import crypto from 'crypto';

const DAEROOM_URL = process.env.DAEROOM_URL || 'https://apiv1.daeroom.my.id';
const DAEROOM_API_KEY = process.env.DAEROOM_API_KEY || '';
const DAEROOM_READONLY_KEY = process.env.DAEROOM_READONLY_KEY || '';
const DAEROOM_S3_BUCKET = process.env.DAEROOM_S3_BUCKET || 'webkonser-assets';
const S3_URL = process.env.NEXT_PUBLIC_S3_URL || 'https://s3.daeroom.my.id';

export interface QueryResult<T = Record<string, unknown>> {
  success: boolean;
  rows: T[];
  rowCount: number;
}

export async function queryDb<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  readonly = false
): Promise<QueryResult<T>> {
  const key = readonly && DAEROOM_READONLY_KEY ? DAEROOM_READONLY_KEY : DAEROOM_API_KEY;
  const res = await fetch(`${DAEROOM_URL}/v1/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ sql, params }),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Daeroom query error (${res.status})`);
  }
  return data;
}

export function hashPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

export const daeroomStorage = {
  getPublicUrl(name: string) {
    return `${S3_URL}/${DAEROOM_S3_BUCKET}/${name}`;
  },
};
