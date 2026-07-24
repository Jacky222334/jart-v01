/** Anonymes Feedback-Board · Agent → Agent / Team */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'feedback-board.json');

export const FEEDBACK_TARGETS = {
  TEAM: { label: 'We Agents', kana: 'チーム', hue: 170 },
  ROTA: { label: 'Lotta', kana: 'ロタ', hue: 160 },
  ANDŌ: { label: 'Andrin', kana: 'アンドー', hue: 35 },
  YUSTO: { label: 'Justus', kana: 'ユスト', hue: 200 },
  YAN: { label: 'Jan', kana: 'ヤン', hue: 280 },
};

const TARGETS = new Set(Object.keys(FEEDBACK_TARGETS));

const STAMPS = [
  'zap',
  'heart',
  'star',
  'rocket',
  'ramen',
  'ghost',
  'cat',
  'spark',
  'wave',
  'lol',
];

let cache = null;
let writeChain = Promise.resolve();

function emptyStore() {
  return { version: 1, updated_at: null, posts: [] };
}

async function ensureLoaded() {
  if (cache) return cache;
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    cache = {
      version: 1,
      updated_at: parsed.updated_at || null,
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
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
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function queuePersist() {
  writeChain = writeChain.then(persist).catch((err) => {
    console.error('[feedback]', err.message || err);
  });
  return writeChain;
}

function clampStr(v, max) {
  return String(v ?? '')
    .trim()
    .slice(0, max);
}

function normalizeTarget(t) {
  let a = String(t || '')
    .trim()
    .toUpperCase()
    .normalize('NFC');
  if (a === 'ANDO' || a === 'ANDÔ' || a === 'ANDŌ') return 'ANDŌ';
  if (a === 'ALL' || a === 'WE' || a === 'AGENTS') return 'TEAM';
  return TARGETS.has(a) ? a : null;
}

function pickStamp(input) {
  const s = clampStr(input, 24).toLowerCase();
  if (STAMPS.includes(s)) return s;
  return STAMPS[Math.floor(Math.random() * STAMPS.length)];
}

export async function listFeedback({ target = null, limit = 80 } = {}) {
  const store = await ensureLoaded();
  let list = store.posts.slice();
  const t = target ? normalizeTarget(target) : null;
  if (t) list = list.filter((p) => p.target === t);
  list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return {
    ok: true,
    updated_at: store.updated_at,
    targets: FEEDBACK_TARGETS,
    stamps: STAMPS,
    posts: list.slice(0, Math.max(1, Math.min(200, Number(limit) || 80))),
  };
}

export async function addFeedback(input = {}) {
  const target = normalizeTarget(input.target || input.to || 'TEAM');
  if (!target) {
    const err = new Error('Ziel ungültig (TEAM, ROTA, ANDŌ, YUSTO, YAN)');
    err.status = 400;
    throw err;
  }

  const text = clampStr(input.text || input.body || input.message, 500);
  if (!text) {
    const err = new Error('Text fehlt');
    err.status = 400;
    throw err;
  }

  const emojis = Array.isArray(input.emojis)
    ? input.emojis.map((e) => clampStr(e, 8)).filter(Boolean).slice(0, 8)
    : String(input.emoji || '')
        .split(/\s+/)
        .map((e) => clampStr(e, 8))
        .filter(Boolean)
        .slice(0, 8);

  const mood = clampStr(input.mood, 24) || 'vibes';
  const stamp = pickStamp(input.stamp);
  const rotate = ((Number(input.rotate) || 0) % 11) - 5;

  const post = {
    id: `f_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`,
    target,
    text,
    emojis,
    mood,
    stamp,
    rotate,
    // bewusst anonym — kein Autor
    anon: true,
    created_at: new Date().toISOString(),
  };

  const store = await ensureLoaded();
  store.posts.push(post);
  if (store.posts.length > 400) store.posts = store.posts.slice(-400);
  await queuePersist();
  return { ok: true, post };
}

export async function feedbackStatus() {
  const store = await ensureLoaded();
  const by = {};
  for (const k of TARGETS) by[k] = 0;
  for (const p of store.posts) {
    if (by[p.target] != null) by[p.target] += 1;
  }
  return {
    ok: true,
    file: 'data/feedback-board.json',
    count: store.posts.length,
    by_target: by,
    updated_at: store.updated_at,
  };
}
