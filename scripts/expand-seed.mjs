// seed/seed-compact.json → public/seed-data.json, public/data.json (첫 배포용)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { OFFICES } from './scrape.mjs';
const c = JSON.parse(await readFile('seed/seed-compact.json', 'utf8'));
const offices = OFFICES.map(o => ({ ...o, ok: true, fetchedAt: c.collectedAt,
  items: (c.offices[o.id] || []).map(([seq, name, cat, qty, p]) => ({ seq, name, cat, qty, img: p ? `https://${o.id}.sen.go.kr/uploads/BFS/GYOGU/${p}` : '' })) }));
const data = { updatedAt: c.collectedAt, okCount: offices.length, seed: true, offices };
await mkdir('public', { recursive: true });
await writeFile('public/seed-data.json', JSON.stringify(data));
await writeFile('public/data.json', JSON.stringify(data));
console.log(offices.map(o => `${o.name}:${o.items.length}`).join(' '), '합계', offices.reduce((s,o)=>s+o.items.length,0));
