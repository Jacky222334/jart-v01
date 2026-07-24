/** Agenten-Tagebücher · Datei-Persistenz (Datum + Ort + Text) */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'agent-diaries.json');

export const DIARY_AGENTS = {
  ROTA: { person: 'Lotta', kana: 'ロタ', kanji: '露多' },
  ANDŌ: { person: 'Andrin', kana: 'アンドー', kanji: '安凛' },
  YUSTO: { person: 'Justus', kana: 'ユスト', kanji: '祐斗' },
  YAN: { person: 'Jan', kana: 'ヤン', kanji: '漸' },
};

const AGENTS = new Set(Object.keys(DIARY_AGENTS));

let cache = null;
let writeChain = Promise.resolve();

function emptyStore() {
  return { version: 1, updated_at: null, entries: [] };
}

async function ensureLoaded() {
  if (cache) return cache;
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    cache = {
      version: 1,
      updated_at: parsed.updated_at || null,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    cache = emptyStore();
  }
  return cache;
}

async function persist() {
  await mkdir(DATA_DIR, { recursive: true });
  const store = await ensureLoaded();
  store.updated_at = new Date().toISOString();
  const tmp = `${DATA_FILE}.${randomBytes(3).toString('hex')}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
  try {
    const { unlink } = await import('node:fs/promises');
    await unlink(tmp);
  } catch {
    /* */
  }
}

function queuePersist() {
  writeChain = writeChain.then(persist).catch((err) => {
    console.error('[diary]', err.message || err);
  });
  return writeChain;
}

function clampStr(v, max) {
  return String(v ?? '')
    .trim()
    .slice(0, max);
}

function normalizeAgent(agent) {
  let a = String(agent || '')
    .trim()
    .toUpperCase()
    .normalize('NFC');
  if (a === 'ANDO' || a === 'ANDÔ' || a === 'ANDŌ') return 'ANDŌ';
  return AGENTS.has(a) ? a : null;
}

function todayIso(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function listDiaryEntries({ agent = null, limit = 200 } = {}) {
  const store = await ensureLoaded();
  let list = store.entries.slice();
  const a = agent ? normalizeAgent(agent) : null;
  if (a) list = list.filter((e) => e.agent === a);
  list.sort((x, y) => String(y.created_at || y.date).localeCompare(String(x.created_at || x.date)));
  return {
    ok: true,
    updated_at: store.updated_at,
    agents: DIARY_AGENTS,
    entries: list.slice(0, Math.max(1, Math.min(500, Number(limit) || 200))),
  };
}

export async function addDiaryEntry(input = {}) {
  const agent = normalizeAgent(input.agent);
  if (!agent) {
    const err = new Error('Ungültiger Agent (ROTA, ANDŌ, YUSTO, YAN)');
    err.status = 400;
    throw err;
  }

  const body = clampStr(input.body || input.text, 4000);
  if (!body) {
    const err = new Error('Text fehlt');
    err.status = 400;
    throw err;
  }

  const title = clampStr(input.title, 120) || body.split(/\n/)[0].slice(0, 48);
  let date = clampStr(input.date, 32);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = todayIso();

  const place = clampStr(input.place || input.location || input.ort, 160);
  const lat = Number(input.lat);
  const lon = Number(input.lon);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lon);

  const entry = {
    id: `d_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`,
    agent,
    person: DIARY_AGENTS[agent].person,
    date,
    title,
    body,
    place: place || (hasGeo ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : ''),
    lat: hasGeo ? lat : null,
    lon: hasGeo ? lon : null,
    acc_m: Number.isFinite(Number(input.acc_m)) ? Number(input.acc_m) : null,
    source: clampStr(input.source, 40) || 'phone',
    created_at: new Date().toISOString(),
    // Default-Eval für Dashboard-Kompatibilität
    eval: { kultur: 70, fun: 70, team: 70 },
  };

  const store = await ensureLoaded();
  store.entries.push(entry);
  // Cap: 800 Einträge insgesamt
  if (store.entries.length > 800) {
    store.entries = store.entries.slice(-800);
  }
  await queuePersist();
  return { ok: true, entry };
}

export async function diaryStatus() {
  const store = await ensureLoaded();
  const byAgent = {};
  for (const a of AGENTS) byAgent[a] = 0;
  for (const e of store.entries) {
    if (byAgent[e.agent] != null) byAgent[e.agent] += 1;
  }
  return {
    ok: true,
    file: 'data/agent-diaries.json',
    count: store.entries.length,
    by_agent: byAgent,
    updated_at: store.updated_at,
  };
}
