#!/usr/bin/env node
/** Push ohne Xcode-git · isomorphic-git + gh token */
import { execSync } from 'node:child_process';
import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

const ROOT = new URL('..', import.meta.url).pathname;
const REPO = 'https://github.com/Jacky222334/jart-v01.git';
const BRANCH = 'main';

const SKIP = new Set([
  'node_modules', '.git', '.cursor', '.DS_Store', 'agent-transcripts',
]);

async function walk(dir, base = dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = await stat(p);
    if (st.isDirectory()) out.push(...await walk(p, base));
    else out.push(relative(base, p));
  }
  return out;
}

async function main() {
  const token = process.env.GH_TOKEN || execSync('gh auth token', { encoding: 'utf8' }).trim();
  const gitDir = join(ROOT, '.git');
  try { await stat(gitDir); } catch { await git.init({ fs: await import('node:fs'), dir: ROOT, defaultBranch: BRANCH }); }

  const fs = await import('node:fs');
  const files = await walk(ROOT);
  for (const f of files) {
    await git.add({ fs, dir: ROOT, filepath: f });
  }

  const head = await git.resolveRef({ fs, dir: ROOT, ref: 'HEAD' }).catch(() => null);
  if (!head) {
    await git.commit({
      fs, dir: ROOT,
      message: 'jart_v01 · Antrieb 100LY · Paradise Happy End · Railway',
      author: { name: 'jart', email: 'jart@local.dev' },
    });
  } else {
    await git.commit({
      fs, dir: ROOT,
      message: `deploy ${new Date().toISOString().slice(0, 16)} · jart_v01 update`,
      author: { name: 'jart', email: 'jart@local.dev' },
    });
  }

  const remotes = await git.listRemotes({ fs, dir: ROOT });
  if (!remotes.find((r) => r.remote === 'origin')) {
    await git.addRemote({ fs, dir: ROOT, remote: 'origin', url: REPO });
  }

  console.log('→ push', REPO);
  await git.push({
    fs, dir: ROOT, http, remote: 'origin', ref: BRANCH,
    onAuth: () => ({ username: 'x-access-token', password: token }),
    force: false,
  });
  console.log('✓ GitHub push ok');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
