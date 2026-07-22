/* Agenten-Tagebuch + Tages-Evaluation (Kultur / Fun / Team) */
(() => {
  const DIARIES = {
    ROTA: {
      person: "Lotta",
      kana: "ロタ",
      entries: [
        {
          date: "2026-07-18",
          title: "Erster Fix",
          body: "Signal fing an zu atmen. Stadtlichter wie Morse. Kurs Richtung Zürich und Glarus – Näfels/Mollis – gemerkt.",
          eval: { kultur: 62, fun: 71, team: 78 },
        },
        {
          date: "2026-07-20",
          title: "Regen über Shibuya",
          body: "Beispiel-Ort Tokio im Neon. Pfützen spiegeln die Kanji. Mic 1 war still, Mic 2 flüsterte.",
          eval: { kultur: 88, fun: 84, team: 80 },
        },
        {
          date: "2026-07-22",
          title: "Cam warm",
          body: "FRONT-Stream stabil. Lotta notiert: ‚Nicht zoomen, wenn das Herz zu laut ist.‘",
          eval: { kultur: 74, fun: 79, team: 91 },
        },
      ],
    },
    ANDŌ: {
      person: "Andrin",
      kana: "アンドー",
      entries: [
        {
          date: "2026-07-17",
          title: "Rückspiegel",
          body: "REAR sah nur Asphalt und eine gelbe Linie. Andrin zählte Satelliten wie Sterne.",
          eval: { kultur: 55, fun: 68, team: 72 },
        },
        {
          date: "2026-07-19",
          title: "HDOP besser",
          body: "Genauigkeit zog an. Spur auf der Karte wurde dünner, der Zweifel auch.",
          eval: { kultur: 70, fun: 66, team: 85 },
        },
        {
          date: "2026-07-21",
          title: "Nachtfahrt",
          body: "Gegenverkehr als Punkte. Tagebuch: ‚Wenn niemand hupt, ist die Stadt ehrlich.‘",
          eval: { kultur: 76, fun: 82, team: 77 },
        },
        {
          date: "2026-07-23",
          title: "Agenten-Check",
          body: "ANDŌ online. Trail gespeichert. Nächster Eintrag erst, wenn sich etwas bewegt.",
          eval: { kultur: 69, fun: 75, team: 93 },
        },
      ],
    },
    YUSTO: {
      person: "Justus",
      kana: "ユスト",
      entries: [
        {
          date: "2026-07-16",
          title: "Raster",
          body: "LEFT-Cam im Grid-Modus. Justus suchte den Blob im Rauschen und fand einen Witz.",
          eval: { kultur: 58, fun: 86, team: 74 },
        },
        {
          date: "2026-07-19",
          title: "Code-Regen",
          body: "Links am Rand liefen Katakana. Er sagte, Python klingt nach Mitternacht.",
          eval: { kultur: 81, fun: 90, team: 82 },
        },
        {
          date: "2026-07-22",
          title: "Distanz",
          body: "Kilometer nach Zürich und Näfels/Mollis flimmerten im HUD. Kein Drama – nur Zahlen mit Charakter.",
          eval: { kultur: 73, fun: 77, team: 88 },
        },
      ],
    },
    YAN: {
      person: "Jan",
      kana: "ヤン",
      entries: [
        {
          date: "2026-07-15",
          title: "Scan start",
          body: "RIGHT-Cam: Rauschen, Crosshair, F-Zähler. Yan schrieb nur: ‚Noch kein Eintrag – warte.‘",
          eval: { kultur: 48, fun: 60, team: 70 },
        },
        {
          date: "2026-07-18",
          title: "Milchstraße",
          body: "Globus zog weit raus. Sterne, dann wieder Tokio. Kurzer Straßenblick, dann Kosmos.",
          eval: { kultur: 92, fun: 85, team: 79 },
        },
        {
          date: "2026-07-21",
          title: "Vier Stimmen",
          body: "ROTA, ANDŌ, YUSTO, YAN. Vier Fenster, ein Dashboard. Heute: ruhig, wach, verbunden.",
          eval: { kultur: 80, fun: 78, team: 96 },
        },
        {
          date: "2026-07-23",
          title: "Heute",
          body: "Live-SIM läuft. Echtes GPS kann jederzeit den Beispiel-Ort ablösen. Bereit.",
          eval: { kultur: 84, fun: 81, team: 94 },
        },
      ],
    },
  };

  function fmtDay(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.`;
  }

  function fmtLong(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function scoreClass(v) {
    if (v >= 85) return "hi";
    if (v >= 70) return "mid";
    return "lo";
  }

  function avg(ev) {
    return Math.round((ev.kultur + ev.fun + ev.team) / 3);
  }

  function evalHtml(entry) {
    const ev = entry.eval || { kultur: 0, fun: 0, team: 0 };
    const a = avg(ev);
    return `
      <div class="agent-eval" data-date="${escapeHtml(entry.date)}">
        <div class="eval-head">
          <span class="eval-label">評価 · Evaluation</span>
          <span class="eval-day">${fmtDay(entry.date)}</span>
          <strong class="eval-total ${scoreClass(a)}">${a}</strong>
        </div>
        <div class="eval-bars">
          <div class="eval-row">
            <span class="eval-name">文化 · Kultur</span>
            <div class="eval-track"><i style="width:${ev.kultur}%"></i></div>
            <b class="${scoreClass(ev.kultur)}">${ev.kultur}</b>
          </div>
          <div class="eval-row">
            <span class="eval-name">楽 · Fun</span>
            <div class="eval-track fun"><i style="width:${ev.fun}%"></i></div>
            <b class="${scoreClass(ev.fun)}">${ev.fun}</b>
          </div>
          <div class="eval-row">
            <span class="eval-name">絆 · Team</span>
            <div class="eval-track team"><i style="width:${ev.team}%"></i></div>
            <b class="${scoreClass(ev.team)}">${ev.team}</b>
          </div>
        </div>
      </div>
    `;
  }

  function mountDiaries() {
    const grid = document.getElementById("camGrid");
    if (!grid) return;

    const tiles = [...grid.querySelectorAll(".cam-tile")];
    if (!tiles.length) return;

    grid.classList.add("cam-grid--with-diary");
    tiles.forEach((tile) => {
      const agent = tile.dataset.agent;
      const book = DIARIES[agent];
      if (!book) return;

      const col = document.createElement("div");
      col.className = "agent-col";
      tile.parentNode.insertBefore(col, tile);
      col.appendChild(tile);

      const sorted = [...book.entries].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0
      );
      const latest = sorted[0];

      const diary = document.createElement("div");
      diary.className = "agent-diary";
      diary.innerHTML = `
        <div class="diary-head">
          <span class="diary-label">日誌 · Tagebuch</span>
          <span class="diary-agent">${escapeHtml(book.kana)} · ${escapeHtml(book.person)}</span>
        </div>
        <div class="diary-days" role="tablist">
          ${sorted
            .map(
              (e, i) => `
            <button type="button" class="diary-day${i === 0 ? " is-active" : ""}"
              data-date="${escapeHtml(e.date)}"
              aria-pressed="${i === 0 ? "true" : "false"}"
              title="${escapeHtml(e.title)}">
              ${fmtDay(e.date)}
            </button>`
            )
            .join("")}
        </div>
        <div class="diary-entry" data-agent="${escapeHtml(agent)}">
          <time datetime="${escapeHtml(latest.date)}">${fmtLong(latest.date)}</time>
          <strong>${escapeHtml(latest.title)}</strong>
          <p>${escapeHtml(latest.body)}</p>
        </div>
        <p class="diary-hint">Tag anklicken · Evaluation folgt darunter</p>
      `;
      col.appendChild(diary);

      const evalWrap = document.createElement("div");
      evalWrap.className = "eval-wrap";
      evalWrap.innerHTML = evalHtml(latest);
      col.appendChild(evalWrap);

      const entryEl = diary.querySelector(".diary-entry");
      const showDay = (entry) => {
        entryEl.innerHTML = `
          <time datetime="${escapeHtml(entry.date)}">${fmtLong(entry.date)}</time>
          <strong>${escapeHtml(entry.title)}</strong>
          <p>${escapeHtml(entry.body)}</p>
        `;
        entryEl.classList.remove("flash");
        void entryEl.offsetWidth;
        entryEl.classList.add("flash");
        evalWrap.innerHTML = evalHtml(entry);
        evalWrap.classList.remove("flash");
        void evalWrap.offsetWidth;
        evalWrap.classList.add("flash");
      };

      diary.querySelectorAll(".diary-day").forEach((btn) => {
        btn.addEventListener("click", () => {
          const date = btn.dataset.date;
          const entry = book.entries.find((e) => e.date === date);
          if (!entry) return;
          diary.querySelectorAll(".diary-day").forEach((b) => {
            b.classList.toggle("is-active", b === btn);
            b.setAttribute("aria-pressed", b === btn ? "true" : "false");
          });
          showDay(entry);
        });
      });
    });
  }

  function boot() {
    const tryMount = () => {
      const grid = document.getElementById("camGrid");
      if (grid && grid.querySelector(".cam-tile")) {
        mountDiaries();
        return true;
      }
      return false;
    };
    if (tryMount()) return;
    const iv = setInterval(() => {
      if (tryMount()) clearInterval(iv);
    }, 40);
    setTimeout(() => clearInterval(iv), 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
