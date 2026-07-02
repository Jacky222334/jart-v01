#!/usr/bin/env node
/** jart_v01 · Static server für Railway / lokal */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8765;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.min.js': 'text/javascript; charset=utf-8',
};

function contentType(file) {
  if (file.endsWith('.min.js')) return MIME['.min.js'];
  return MIME[extname(file).toLowerCase()] || 'application/octet-stream';
}

async function serve(req, res) {
  try {
    let url = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    if (url === '/') url = '/jart-kiosk/index.html';
    const safe = normalize(url).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(ROOT, safe);

    let st;
    try {
      st = await stat(filePath);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404');
      return;
    }

    if (st.isDirectory()) {
      filePath = join(filePath, 'index.html');
      st = await stat(filePath);
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Cache-Control': filePath.includes('node_modules') ? 'public, max-age=86400' : 'public, max-age=300',
    });
    res.end(body);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500');
  }
}

createServer(serve).listen(PORT, '0.0.0.0', () => {
  console.log(`jart_v01 → http://0.0.0.0:${PORT}`);
});
