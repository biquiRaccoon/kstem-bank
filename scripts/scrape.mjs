// K-STEM Bank 교구 목록 수집기 (Node 20+, 외부 패키지 없음)
// 서울시교육청 11개 교육지원청의 공개 교구목록(ssei.sen.go.kr)을 모아 public/data.json 으로 저장합니다.
// 사용: node scripts/scrape.mjs [이전 data.json URL 또는 경로(선택)]
import { writeFile, readFile, mkdir } from 'node:fs/promises';

export const OFFICES = [
  { id: 'dbedu',   name: '동부' },
  { id: 'sbedu',   name: '서부' },
  { id: 'nbedu',   name: '남부' },
  { id: 'bbedu',   name: '북부' },
  { id: 'jbedu',   name: '중부' },
  { id: 'gdspedu', name: '강동송파' },
  { id: 'gsycedu', name: '강서양천' },
  { id: 'gnscedu', name: '강남서초' },
  { id: 'dgedu',   name: '동작관악' },
  { id: 'sdgjedu', name: '성동광진' },
  { id: 'sbgbedu', name: '성북강북' },
];

const BASE = 'https://ssei.sen.go.kr/fus/MI000000000000000351/gyoguManageList.do';
const UA = 'Mozilla/5.0 (compatible; KSTEM-Loan-Desk/1.0; +https://github.com)';

const decode = s => s
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/\s+/g, ' ').trim();

export function parsePage(html) {
  const tbody = (html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i) || [])[1] || '';
  const rows = [];
  for (const tr of tbody.split(/<tr[\s>]/i).slice(1)) {
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
    if (tds.length < 5) continue;
    const seq = (tr.match(/fncView\('(\d+)'\)/) || [])[1];
    if (!seq) continue;
    const img = (tr.match(/<img[^>]+src="([^"]+)"/i) || [])[1] || '';
    rows.push({
      seq,
      name: decode(tds[2]),
      cat: decode(tds[3]),
      qty: parseInt(decode(tds[4]).replace(/[^\d]/g, ''), 10) || 0,
      img: img.includes('/uploads/') ? img.replace(/^http:/, 'https:') : '',
    });
  }
  const text = decode(html);
  const total = parseInt((text.match(/총\s*([\d,]+)\s*건/) || [])[1]?.replace(/,/g, '') || '0', 10);
  const pages = parseInt((text.match(/총\s*[\d,]+\s*건\s*\d+\s*\/\s*(\d+)/) || [])[1] || '1', 10);
  return { rows, total, pages };
}

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise(res => setTimeout(res, 1500 * i));
    }
  }
}

async function scrapeOffice(o) {
  const url = p => `${BASE}?board_id=${o.id}&jojik_cd=${o.id}&pageIndex=${p}`;
  const first = parsePage(await get(url(1)));
  let rows = first.rows;
  for (let p = 2; p <= Math.min(first.pages, 60); p++) {
    rows = rows.concat(parsePage(await get(url(p))).rows);
    await new Promise(res => setTimeout(res, 300)); // 원본 서버 부담 줄이기
  }
  // 중복 제거
  const seen = new Set();
  rows = rows.filter(r => !seen.has(r.seq) && seen.add(r.seq));
  if (first.total && rows.length < first.total * 0.9) throw new Error(`일부만 수집됨 ${rows.length}/${first.total}`);
  return rows;
}

async function loadPrevious(src) {
  if (!src) return null;
  try {
    const txt = /^https?:/.test(src) ? await get(src, 1) : await readFile(src, 'utf8');
    return JSON.parse(txt);
  } catch { return null; }
}

async function main() {
  const prev = await loadPrevious(process.argv[2]);
  const now = new Date().toISOString();
  const offices = [];
  let ok = 0;
  for (const o of OFFICES) {
    try {
      const items = await scrapeOffice(o);
      offices.push({ ...o, ok: true, fetchedAt: now, items });
      ok++;
      console.log(`✓ ${o.name}: ${items.length}건`);
    } catch (e) {
      const old = prev?.offices?.find(x => x.id === o.id);
      offices.push({ ...o, ok: false, error: String(e.message || e), fetchedAt: old?.fetchedAt || null, items: old?.items || [] });
      console.log(`✗ ${o.name}: ${e.message} (이전 데이터 ${old?.items?.length || 0}건 유지)`);
    }
  }
  if (ok === 0 && !prev) { console.error('모든 지원청 수집 실패'); process.exit(1); }
  await mkdir('public', { recursive: true });
  await writeFile('public/data.json', JSON.stringify({ updatedAt: now, okCount: ok, offices }));
  console.log(`완료: ${ok}/${OFFICES.length}개 지원청, 총 ${offices.reduce((s, o) => s + o.items.length, 0)}건`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
