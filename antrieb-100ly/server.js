#!/usr/bin/env node
/** Antrieb 100LY · Standalone static server */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 8770;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function contentType(file) {
  return MIME[extname(file).toLowerCase()] || 'application/octet-stream';
}

async function serve(req, res) {
  try {
    let url = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    if (url === '/') url = '/index.html';
    const safe = normalize(url).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(ROOT, safe);

    let st = await stat(filePath).catch(() => null);
    if (!st) {
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
      'Cache-Control': 'public, max-age=300',
    });
    res.end(body);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500');
  }
}

createServer(serve).listen(PORT, '0.0.0.0', () => {
  console.log(`Antrieb 100LY → http://0.0.0.0:${PORT}/`);
});
