/** ONVIF PTZ für Tapo (WS-UsernameToken Digest) */
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULTS = {
  host: '192.168.1.191',
  port: 2020,
  user: 'Cam091',
  password: '',
  profile: 'profile_1',
};

function wsSecurityHeader(user, password) {
  const nonce = randomBytes(16);
  const created = new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z');
  const digest = createHash('sha1')
    .update(Buffer.concat([nonce, Buffer.from(created), Buffer.from(password)]))
    .digest('base64');
  const nonceB64 = nonce.toString('base64');
  return `<wsse:Security s:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><wsse:UsernameToken><wsse:Username>${user}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${digest}</wsse:Password><wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonceB64}</wsse:Nonce><wsu:Created>${created}</wsu:Created></wsse:UsernameToken></wsse:Security>`;
}

async function loadTapoCreds(root) {
  const out = { ...DEFAULTS };
  try {
    const text = await readFile(join(root, 'wlan_loca.txt'), 'utf8');
    const ip = /IP:\s*([\d.]+)/.exec(text);
    const user = /Kamerakonto:\s*(\S+)/.exec(text);
    const pass = /Passwort:\s*(\S+)/.exec(text);
    if (ip) out.host = ip[1];
    if (user) out.user = user[1];
    if (pass) out.password = pass[1];
  } catch { /* */ }
  if (!out.password) {
    try {
      const env = await readFile(join(root, '.env.tapo'), 'utf8');
      const p = /TAPO_C220_PASS=(.+)/.exec(env);
      const u = /TAPO_C220_USER=(.+)/.exec(env);
      const h = /TAPO_C220_HOST=(.+)/.exec(env);
      if (p) out.password = p[1].trim();
      if (u) out.user = u[1].trim();
      if (h) out.host = h[1].trim();
    } catch { /* */ }
  }
  if (process.env.TAPO_C220_PASS) out.password = process.env.TAPO_C220_PASS;
  if (process.env.TAPO_C220_USER) out.user = process.env.TAPO_C220_USER;
  if (process.env.TAPO_C220_HOST) out.host = process.env.TAPO_C220_HOST;
  return out;
}

async function onvifSoap(creds, bodyInner) {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema">
 <s:Header>${wsSecurityHeader(creds.user, creds.password)}</s:Header>
 <s:Body>${bodyInner}</s:Body>
</s:Envelope>`;
  const url = `http://${creds.host}:${creds.port}/onvif/service`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
    body: envelope,
    signal: AbortSignal.timeout(5000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ONVIF ${res.status}: ${text.slice(0, 180)}`);
  return text;
}

/** ContinuousMove: pan/tilt in [-1..1], durationMs then Stop */
export async function ptzMove(root, { pan = 0, tilt = 0, durationMs = 400 } = {}) {
  const creds = await loadTapoCreds(root);
  if (!creds.password) throw new Error('kein Tapo-Passwort');
  const px = Math.max(-1, Math.min(1, Number(pan) || 0));
  const py = Math.max(-1, Math.min(1, Number(tilt) || 0));
  const profile = creds.profile;
  await onvifSoap(
    creds,
    `<tptz:ContinuousMove>
      <tptz:ProfileToken>${profile}</tptz:ProfileToken>
      <tptz:Velocity>
        <tt:PanTilt x="${px}" y="${py}"/>
      </tptz:Velocity>
    </tptz:ContinuousMove>`,
  );
  const wait = Math.max(80, Math.min(3000, Number(durationMs) || 400));
  await new Promise((r) => setTimeout(r, wait));
  await onvifSoap(
    creds,
    `<tptz:Stop>
      <tptz:ProfileToken>${profile}</tptz:ProfileToken>
      <tptz:PanTilt>true</tptz:PanTilt>
      <tptz:Zoom>true</tptz:Zoom>
    </tptz:Stop>`,
  );
  return { ok: true, pan: px, tilt: py, durationMs: wait, host: creds.host };
}

export async function ptzStop(root) {
  const creds = await loadTapoCreds(root);
  await onvifSoap(
    creds,
    `<tptz:Stop>
      <tptz:ProfileToken>${creds.profile}</tptz:ProfileToken>
      <tptz:PanTilt>true</tptz:PanTilt>
      <tptz:Zoom>true</tptz:Zoom>
    </tptz:Stop>`,
  );
  return { ok: true };
}

export { loadTapoCreds };
