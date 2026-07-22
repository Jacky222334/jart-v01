const listEl = document.getElementById('list');
const chipsEl = document.getElementById('chips');
const countEl = document.getElementById('count');
const stampEl = document.getElementById('stamp');
const videoEl = document.getElementById('video');
const midiEl = document.getElementById('midi');
const refreshBtn = document.getElementById('refresh');

const WATCH = [
  { key: 'push', test: (d) => d.id === '2982:1967' || /push/i.test(d.name), label: 'Push 2' },
  { key: 'launchpad', test: (d) => d.id === '1235:000e' || /launchpad/i.test(d.name), label: 'Launchpad' },
  { key: 'webcam', test: (d) => d.kind === 'video' || /webcam|logitech|c925|c920/i.test(d.name), label: 'Webcam' },
];

async function fetchUsb() {
  const res = await fetch('/api/usb-devices', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString('de-DE');
  } catch {
    return ts || '—';
  }
}

function renderChips(devices) {
  chipsEl.innerHTML = '';
  for (const w of WATCH) {
    const found = devices.some(w.test);
    const el = document.createElement('span');
    el.className = `chip ${found ? 'on' : 'off'}`;
    el.textContent = `${w.label}: ${found ? 'da' : 'fehlt'}`;
    chipsEl.appendChild(el);
  }
}

function renderList(devices) {
  listEl.innerHTML = '';
  if (!devices.length) {
    listEl.innerHTML = '<div class="err">Keine USB-Geräte gefunden.</div>';
    return;
  }

  const sorted = [...devices].sort((a, b) => {
    const rank = { midi: 0, video: 1, other: 2, hub: 3 };
    return (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9) || a.name.localeCompare(b.name);
  });

  for (const d of sorted) {
    const row = document.createElement('article');
    row.className = 'row';
    const title = d.alias || d.name;
    row.innerHTML = `
      <div class="kind ${d.kind || 'other'}">${d.kind || 'other'}</div>
      <div>
        <h2 class="title">${escapeHtml(title)}${d.alias ? ` <span class="alias">· erkannt</span>` : ''}</h2>
        <p class="detail">${escapeHtml(d.name)}</p>
        <p class="detail">Bus ${d.bus} · Device ${d.device}${d.path ? ` · ${escapeHtml(d.path)}` : ''}</p>
      </div>
      <div class="id">${escapeHtml(d.id)}</div>
    `;
    listEl.appendChild(row);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function refresh() {
  try {
    const data = await fetchUsb();
    if (!data.ok) throw new Error(data.error || 'Fehler');
    const devices = data.devices || [];
    countEl.textContent = `${data.count ?? devices.length} Geräte`;
    stampEl.textContent = fmtTime(data.ts);
    renderChips(devices);
    renderList(devices);
    videoEl.textContent = (data.video || []).join(', ') || '—';
    midiEl.textContent = (data.midi || []).join(', ') || '—';
  } catch (err) {
    listEl.innerHTML = `<div class="err">${escapeHtml(err.message || err)}</div>`;
    countEl.textContent = 'Fehler';
  }
}

refreshBtn.addEventListener('click', refresh);
refresh();
setInterval(refresh, 2500);
