/** USB-Geräte via lsusb → JSON (für /api/usb-devices). */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

const KNOWN = {
  '2982:1967': { alias: 'Ableton Push 2', kind: 'midi' },
  '1235:000e': { alias: 'Novation Launchpad', kind: 'midi' },
  '046d:085b': { alias: 'Logitech Webcam C925e', kind: 'video' },
  '046d:082d': { alias: 'Logitech HD Pro Webcam C920', kind: 'video' },
  '1d6b:0002': { alias: 'USB 2.0 Root Hub', kind: 'hub' },
  '1d6b:0003': { alias: 'USB 3.0 Root Hub', kind: 'hub' },
};

const LINE =
  /^Bus\s+(\d+)\s+Device\s+(\d+):\s+ID\s+([0-9a-fA-F]{4}):([0-9a-fA-F]{4})\s+(.*)$/;

export async function listUsbDevices() {
  let stdout = '';
  try {
    ({ stdout } = await execFileAsync('lsusb', [], { timeout: 4000 }));
  } catch (err) {
    return {
      ok: false,
      error: err.message || String(err),
      ts: new Date().toISOString(),
      count: 0,
      devices: [],
      video: [],
      midi: [],
    };
  }

  const devices = [];
  for (const line of stdout.split('\n')) {
    const m = LINE.exec(line.trim());
    if (!m) continue;
    const [, bus, device, vidRaw, pidRaw, name] = m;
    const vid = vidRaw.toLowerCase();
    const pid = pidRaw.toLowerCase();
    const id = `${vid}:${pid}`;
    const known = KNOWN[id];
    devices.push({
      bus: Number(bus),
      device: Number(device),
      vid,
      pid,
      id,
      name: name.trim(),
      alias: known?.alias || null,
      kind: known?.kind || 'other',
      path: `/dev/bus/usb/${String(bus).padStart(3, '0')}/${String(device).padStart(3, '0')}`,
    });
  }

  let video = [];
  let midi = [];
  try {
    const dev = await readdir('/dev');
    video = dev.filter((n) => /^video\d+$/.test(n)).map((n) => join('/dev', n)).sort();
  } catch { /* */ }
  try {
    const snd = await readdir('/dev/snd');
    midi = snd.filter((n) => n.startsWith('midi')).map((n) => join('/dev/snd', n)).sort();
  } catch { /* */ }

  return {
    ok: true,
    ts: new Date().toISOString(),
    count: devices.length,
    devices,
    video,
    midi,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  listUsbDevices().then((d) => {
    console.log(JSON.stringify(d, null, 2));
  });
}
