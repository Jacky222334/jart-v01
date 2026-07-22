/* Terminangebote Team Japan · Zeitzonen CH ↔ JP · Live-Videokonferenz (SIM) */
(() => {
  const TZ_CH = "Europe/Zurich";
  const TZ_JP = "Asia/Tokyo";

  const AGENTS = [
    { agent: "ROTA", person: "Lotta", kana: "ロタ", hue: 160 },
    { agent: "ANDŌ", person: "Andrin", kana: "アンドー", hue: 35 },
    { agent: "YUSTO", person: "Justus", kana: "ユスト", hue: 200 },
    { agent: "YAN", person: "Jan", kana: "ヤン", hue: 280 },
  ];

  let selectedSlot = null;
  let callTimer = 0;
  let callStartedAt = 0;
  let callRafs = [];

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function fmtInTz(date, tz, opts) {
    return new Intl.DateTimeFormat("de-CH", {
      timeZone: tz,
      ...opts,
    }).format(date);
  }

  function offsetHours(date) {
    const fmt = (tz) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      }).formatToParts(date);
      const raw = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+0";
      const m = raw.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (!m) return 0;
      const sign = m[1] === "-" ? -1 : 1;
      return sign * (Number(m[2]) + Number(m[3] || 0) / 60);
    };
    return Math.round((fmt(TZ_JP) - fmt(TZ_CH)) * 10) / 10;
  }

  /** Wandzeit in Zeitzone → Date (UTC-Instant) */
  function zonedWallTime(timeZone, year, month, day, hour, minute) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
    for (let i = 0; i < 5; i++) {
      const parts = Object.fromEntries(
        dtf
          .formatToParts(new Date(utc))
          .filter((p) => p.type !== "literal")
          .map((p) => [p.type, p.value])
      );
      const asIf = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second)
      );
      const want = Date.UTC(year, month - 1, day, hour, minute, 0);
      utc += want - asIf;
    }
    return new Date(utc);
  }

  function atLocalTomorrow(hour, minute = 0) {
    const now = new Date();
    const chParts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ_CH,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(now)
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, p.value])
    );
    const base = new Date(
      Date.UTC(Number(chParts.year), Number(chParts.month) - 1, Number(chParts.day))
    );
    base.setUTCDate(base.getUTCDate() + 1);
    return zonedWallTime(
      TZ_CH,
      base.getUTCFullYear(),
      base.getUTCMonth() + 1,
      base.getUTCDate(),
      hour,
      minute
    );
  }

  function buildSlots() {
    const slots = [];
    const labels = [
      { h: 9, m: 0, tag: "Morgen früh", best: true },
      { h: 18, m: 0, tag: "Morgen Abend", best: true },
      { h: 19, m: 30, tag: "Abend · empfohlen", best: true },
      { h: 20, m: 0, tag: "Abend · empfohlen", best: true },
      { h: 21, m: 0, tag: "Später Abend", best: false },
    ];
    labels.forEach((L, i) => {
      const when = atLocalTomorrow(L.h, L.m);
      slots.push({
        id: `slot-${i}`,
        when,
        tag: L.tag,
        best: L.best,
      });
    });
    return slots;
  }

  function slotCardHtml(slot) {
    const chDate = fmtInTz(slot.when, TZ_CH, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
    const chTime = fmtInTz(slot.when, TZ_CH, {
      hour: "2-digit",
      minute: "2-digit",
    });
    const jpDate = fmtInTz(slot.when, TZ_JP, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
    const jpTime = fmtInTz(slot.when, TZ_JP, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `
      <button type="button" class="meet-slot${slot.best ? " is-best" : ""}" data-id="${slot.id}">
        <span class="ms-tag">${slot.tag}${slot.best ? " · ★" : ""}</span>
        <span class="ms-ch"><b>スイス CH</b> ${chDate} · ${chTime}</span>
        <span class="ms-jp"><b>日本 JP</b> ${jpDate} · ${jpTime}</span>
      </button>
    `;
  }

  function ensureUi() {
    if (document.getElementById("meetModal")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "meetOpenBtn";
    btn.className = "meet-open-btn";
    btn.innerHTML = "📅 会議 · Termin Team Japan";
    const stack = document.querySelector(".status-stack");
    if (stack) stack.prepend(btn);
    else document.querySelector(".top")?.appendChild(btn);

    const modal = document.createElement("div");
    modal.id = "meetModal";
    modal.className = "meet-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="meet-dialog" role="dialog" aria-labelledby="meetTitle">
        <header class="meet-head">
          <div>
            <p class="meet-kicker">予約 · Terminangebot</p>
            <h2 id="meetTitle">Live mit Team Japan</h2>
            <p class="meet-tz" id="meetTzInfo"></p>
          </div>
          <button type="button" class="meet-x" id="meetClose" aria-label="Schliessen">×</button>
        </header>
        <p class="meet-hint">Beste Zeiten: <strong>abends</strong> · Vorschläge für <strong>morgen 09:00</strong> und <strong>18:00</strong> (Schweiz), mit Japan-Zeit daneben.</p>
        <div class="meet-slots" id="meetSlots"></div>
        <footer class="meet-foot">
          <button type="button" class="meet-confirm" id="meetConfirm" disabled>この時間で会議 · Termin wählen &amp; beitreten</button>
        </footer>
      </div>
    `;
    document.body.appendChild(modal);

    const call = document.createElement("div");
    call.id = "meetCall";
    call.className = "meet-call";
    call.hidden = true;
    call.innerHTML = `
      <div class="meet-call-bar">
        <span class="mc-live">● LIVE</span>
        <span class="mc-title" id="mcTitle">Team Japan · Videokonferenz</span>
        <span class="mc-clock" id="mcClock">00:00</span>
        <button type="button" class="mc-hang" id="mcHang">通話終了 · Auflegen</button>
      </div>
      <div class="meet-call-grid" id="mcGrid"></div>
      <div class="meet-call-sub" id="mcSub"></div>
    `;
    document.body.appendChild(call);

    btn.addEventListener("click", openModal);
    modal.querySelector("#meetClose").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    modal.querySelector("#meetConfirm").addEventListener("click", joinCall);
    call.querySelector("#mcHang").addEventListener("click", hangUp);
  }

  function openModal() {
    const modal = document.getElementById("meetModal");
    const slotsEl = document.getElementById("meetSlots");
    const tzEl = document.getElementById("meetTzInfo");
    const now = new Date();
    const off = offsetHours(now);
    const chNow = fmtInTz(now, TZ_CH, { hour: "2-digit", minute: "2-digit" });
    const jpNow = fmtInTz(now, TZ_JP, { hour: "2-digit", minute: "2-digit" });
    tzEl.textContent = `Jetzt · CH ${chNow} · JP ${jpNow} · Differenz ca. ${off >= 0 ? "+" : ""}${off} Std (Japan voraus)`;

    const slots = buildSlots();
    selectedSlot = null;
    document.getElementById("meetConfirm").disabled = true;
    slotsEl.innerHTML = slots.map(slotCardHtml).join("");
    slotsEl.querySelectorAll(".meet-slot").forEach((btn) => {
      btn.addEventListener("click", () => {
        slotsEl.querySelectorAll(".meet-slot").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        selectedSlot = slots.find((s) => s.id === btn.dataset.id) || null;
        document.getElementById("meetConfirm").disabled = !selectedSlot;
      });
    });
    modal.hidden = false;
    document.body.classList.add("meet-open");
  }

  function closeModal() {
    const modal = document.getElementById("meetModal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("meet-open");
  }

  function drawTile(canvas, agent, t) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const hue = agent.hue;
    ctx.fillStyle = `hsl(${hue}, 25%, 8%)`;
    ctx.fillRect(0, 0, w, h);
    // faux video noise / waves
    for (let i = 0; i < 6; i++) {
      const y = h * (0.2 + 0.12 * i) + Math.sin(t * 2 + i) * 6;
      ctx.strokeStyle = `hsla(${hue + i * 10}, 70%, 55%, 0.25)`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 8) {
        ctx.lineTo(x, y + Math.sin(x * 0.04 + t * 3 + i) * 4);
      }
      ctx.stroke();
    }
    // avatar circle
    const cx = w * 0.5;
    const cy = h * 0.42;
    const r = Math.min(w, h) * 0.18;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `hsla(${hue}, 80%, 65%, 0.9)`);
    g.addColorStop(1, `hsla(${hue}, 40%, 25%, 0.3)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 22px Syne, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(agent.kana, cx, cy + 8);
    ctx.fillStyle = "rgba(200,240,230,0.85)";
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillText(`${agent.agent} · ${agent.person}`, cx, h - 28);
    ctx.fillText("カメラ ON · SIM", cx, h - 12);
    // speaking bar
    const lvl = 0.3 + 0.7 * Math.abs(Math.sin(t * 4 + hue));
    ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
    ctx.fillRect(w * 0.2, h - 48, w * 0.6 * lvl, 4);
  }

  function joinCall() {
    if (!selectedSlot) return;
    closeModal();
    const call = document.getElementById("meetCall");
    const grid = document.getElementById("mcGrid");
    const ch = fmtInTz(selectedSlot.when, TZ_CH, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const jp = fmtInTz(selectedSlot.when, TZ_JP, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    document.getElementById("mcTitle").textContent =
      `会議 · ${selectedSlot.tag}`;
    document.getElementById("mcSub").innerHTML =
      `<span>🇨🇭 ${ch}</span><span>🇯🇵 ${jp}</span><span>Team Japan · ROTA ANDŌ YUSTO YAN</span>`;

    grid.innerHTML = AGENTS.map(
      (a) => `
      <div class="mc-tile" data-agent="${a.agent}">
        <canvas width="320" height="200"></canvas>
        <div class="mc-meta"><b>${a.kana}</b> ${a.agent}</div>
      </div>`
    ).join("");

    call.hidden = false;
    document.body.classList.add("meet-call-open");
    callStartedAt = performance.now();
    clearInterval(callTimer);
    callTimer = setInterval(() => {
      const sec = Math.floor((performance.now() - callStartedAt) / 1000);
      document.getElementById("mcClock").textContent =
        `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
    }, 250);

    callRafs.forEach((id) => cancelAnimationFrame(id));
    callRafs = [];
    AGENTS.forEach((agent, i) => {
      const canvas = grid.querySelectorAll("canvas")[i];
      const start = performance.now();
      const tick = (now) => {
        if (call.hidden) return;
        drawTile(canvas, agent, (now - start) / 1000);
        callRafs[i] = requestAnimationFrame(tick);
      };
      callRafs[i] = requestAnimationFrame(tick);
    });
  }

  function hangUp() {
    const call = document.getElementById("meetCall");
    if (call) call.hidden = true;
    document.body.classList.remove("meet-call-open");
    clearInterval(callTimer);
    callRafs.forEach((id) => cancelAnimationFrame(id));
    callRafs = [];
  }

  function boot() {
    ensureUi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
