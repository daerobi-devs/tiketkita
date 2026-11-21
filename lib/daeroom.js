const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const DAEROOM_URL = process.env.DAEROOM_URL || 'https://apiv1.daeroom.my.id';
const DAEROOM_API_KEY = process.env.DAEROOM_API_KEY || '';
const DAEROOM_READONLY_KEY = process.env.DAEROOM_READONLY_KEY || '';
const DAEROOM_S3_BUCKET = process.env.DAEROOM_S3_BUCKET || 'webkonser-assets';
const S3_URL = process.env.NEXT_PUBLIC_S3_URL || 'https://s3.daeroom.my.id';

async function queryDb(sql, params = [], readonly = false) {
  const key = readonly && DAEROOM_READONLY_KEY ? DAEROOM_READONLY_KEY : DAEROOM_API_KEY;
  const res = await fetch(`${DAEROOM_URL}/v1/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ sql, params }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Daeroom query error (${res.status})`);
  }
  return data;
}

const daeroomStorage = {
  getPublicUrl(name) {
    return `${S3_URL}/${DAEROOM_S3_BUCKET}/${name}`;
  },
};

module.exports = {
  queryDb,
  daeroomStorage,
  DAEROOM_URL,
  DAEROOM_S3_BUCKET,
};
