/* Agenten-Tagebuch + interaktive Reise-Evaluation (Kultur / Fun / Team) */
(() => {
  const STORAGE_KEY = "jartEvalScores.v1";

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

  const DIMENSIONS = [
    { key: "kultur", label: "文化 · Kultur" },
    { key: "fun", label: "楽 · Fun", track: "fun" },
    { key: "team", label: "絆 · Team", track: "team" },
  ];

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function scoreKey(agent, date) {
    return `${agent}::${date}`;
  }

  function clampScore(n) {
    const v = Math.round(Number(n));
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(100, v));
  }

  function getEval(agent, entry) {
    const base = { ...(entry.eval || { kultur: 0, fun: 0, team: 0 }) };
    const store = loadStore();
    const saved = store[scoreKey(agent, entry.date)];
    if (saved && typeof saved === "object") {
      return {
        kultur: clampScore(saved.kultur ?? base.kultur),
        fun: clampScore(saved.fun ?? base.fun),
        team: clampScore(saved.team ?? base.team),
        custom: true,
      };
    }
    return { ...base, custom: false };
  }

  function setEval(agent, date, ev) {
    const store = loadStore();
    store[scoreKey(agent, date)] = {
      kultur: clampScore(ev.kultur),
      fun: clampScore(ev.fun),
      team: clampScore(ev.team),
      updated_at: new Date().toISOString(),
    };
    saveStore(store);
  }

  function fmtDay(iso) {
    const [, m, d] = iso.split("-");
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

  function evalHtml(agent, entry) {
    const ev = getEval(agent, entry);
    const a = avg(ev);
    return `
      <div class="agent-eval is-editable" data-agent="${escapeHtml(agent)}" data-date="${escapeHtml(entry.date)}" tabindex="0" role="button" aria-label="Evaluation bearbeiten">
        <div class="eval-head">
          <span class="eval-label">評価 · Evaluation</span>
          <span class="eval-day">${fmtDay(entry.date)}</span>
          <strong class="eval-total ${scoreClass(a)}" data-eval-total>${a}</strong>
        </div>
        <div class="eval-bars">
          ${DIMENSIONS.map(
            (d) => `
            <button type="button" class="eval-row" data-dim="${d.key}" title="Tippen · Score eingeben">
              <span class="eval-name">${d.label}</span>
              <div class="eval-track ${d.track || ""}"><i data-bar="${d.key}" style="width:${ev[d.key]}%"></i></div>
              <b class="${scoreClass(ev[d.key])}" data-val="${d.key}">${ev[d.key]}</b>
            </button>`
          ).join("")}
        </div>
        <p class="eval-hint">${ev.custom ? "Gespeichert · erneut tippen zum Ändern" : "Bereich tippen · eigenen Score eingeben"}</p>
      </div>
    `;
  }

  function paintEval(root, ev) {
    const a = avg(ev);
    const total = root.querySelector("[data-eval-total]");
    if (total) {
      total.textContent = String(a);
      total.className = `eval-total ${scoreClass(a)}`;
    }
    DIMENSIONS.forEach((d) => {
      const bar = root.querySelector(`[data-bar="${d.key}"]`);
      const val = root.querySelector(`[data-val="${d.key}"]`);
      if (bar) bar.style.width = `${ev[d.key]}%`;
      if (val) {
        val.textContent = String(ev[d.key]);
        val.className = scoreClass(ev[d.key]);
      }
    });
    const hint = root.querySelector(".eval-hint");
    if (hint) hint.textContent = "Gespeichert · erneut tippen zum Ändern";
  }

  function closeEditors() {
    document.querySelectorAll(".eval-editor").forEach((el) => el.remove());
    document.querySelectorAll(".agent-eval.is-editing").forEach((el) => {
      el.classList.remove("is-editing");
    });
  }

  function findEntryForEval(agent, date) {
    const book = DIARIES[agent];
    const seed = book?.entries.find((e) => e.date === date);
    if (seed) return seed;
    return { date, eval: { kultur: 70, fun: 70, team: 70 } };
  }

  function openEditor(evalRoot, focusDim) {
    const agent = evalRoot.dataset.agent;
    const date = evalRoot.dataset.date;
    const book = DIARIES[agent];
    const entry = findEntryForEval(agent, date);
    if (!entry || !book) return;

    closeEditors();
    evalRoot.classList.add("is-editing");
    const ev = getEval(agent, entry);

    const editor = document.createElement("div");
    editor.className = "eval-editor";
    editor.innerHTML = `
      <div class="eval-editor-card">
        <div class="eval-editor-head">
          <strong>${escapeHtml(book.person)} · ${fmtDay(date)}</strong>
          <button type="button" class="eval-editor-close" aria-label="Schliessen">×</button>
        </div>
        <p class="eval-editor-sub">Scores 0–100 · wird auf diesem Gerät gespeichert</p>
        ${DIMENSIONS.map(
          (d) => `
          <label class="eval-slider">
            <span>${d.label}</span>
            <div class="eval-slider-row">
              <input type="range" min="0" max="100" value="${ev[d.key]}" data-dim="${d.key}" />
              <input type="number" min="0" max="100" value="${ev[d.key]}" data-num="${d.key}" />
            </div>
          </label>`
        ).join("")}
        <div class="eval-editor-actions">
          <button type="button" class="eval-save">Speichern</button>
          <button type="button" class="eval-reset" title="Auf Standard zurück">Reset</button>
        </div>
      </div>
    `;
    evalRoot.appendChild(editor);

    const state = { ...ev };
    const sync = (dim, value) => {
      state[dim] = clampScore(value);
      const range = editor.querySelector(`[data-dim="${dim}"]`);
      const num = editor.querySelector(`[data-num="${dim}"]`);
      if (range) range.value = String(state[dim]);
      if (num) num.value = String(state[dim]);
    };

    editor.querySelectorAll("[data-dim]").forEach((input) => {
      input.addEventListener("input", () => sync(input.dataset.dim, input.value));
    });
    editor.querySelectorAll("[data-num]").forEach((input) => {
      input.addEventListener("input", () => sync(input.dataset.num, input.value));
      input.addEventListener("change", () => sync(input.dataset.num, input.value));
    });

    editor.querySelector(".eval-editor-close").addEventListener("click", (e) => {
      e.stopPropagation();
      closeEditors();
    });
    editor.querySelector(".eval-save").addEventListener("click", (e) => {
      e.stopPropagation();
      setEval(agent, date, state);
      paintEval(evalRoot, { ...state, custom: true });
      closeEditors();
    });
    editor.querySelector(".eval-reset").addEventListener("click", (e) => {
      e.stopPropagation();
      const store = loadStore();
      delete store[scoreKey(agent, date)];
      saveStore(store);
      const fresh = getEval(agent, entry);
      DIMENSIONS.forEach((d) => sync(d.key, fresh[d.key]));
      paintEval(evalRoot, fresh);
      closeEditors();
    });

    editor.addEventListener("click", (e) => e.stopPropagation());

    if (focusDim) {
      const focus = editor.querySelector(`[data-num="${focusDim}"]`);
      if (focus) {
        focus.focus();
        focus.select?.();
      }
    }
  }

  function bindEval(evalWrap) {
    evalWrap.addEventListener("click", (e) => {
      const row = e.target.closest(".eval-row");
      const root = e.target.closest(".agent-eval");
      if (!root || !evalWrap.contains(root)) return;
      if (e.target.closest(".eval-editor")) return;
      openEditor(root, row?.dataset.dim || "kultur");
    });
    evalWrap.addEventListener("keydown", (e) => {
      const root = e.target.closest(".agent-eval");
      if (!root || !evalWrap.contains(root)) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEditor(root, "kultur");
      }
    });
  }

  function entryKey(entry) {
    return entry.id || `${entry.date}::${entry.title || ""}`;
  }

  function mergeEntries(agent, liveList) {
    const book = DIARIES[agent];
    if (!book) return [];
    const seeds = book.entries.map((e) => ({
      ...e,
      place: e.place || "",
      live: false,
    }));
    const live = (liveList || [])
      .filter((e) => e.agent === agent)
      .map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title || "Eintrag",
        body: e.body || "",
        place: e.place || "",
        lat: e.lat,
        lon: e.lon,
        created_at: e.created_at,
        eval: e.eval || { kultur: 70, fun: 70, team: 70 },
        live: true,
      }));
    const merged = [...live, ...seeds];
    merged.sort((a, b) => {
      const da = `${a.date}T${a.created_at || "00:00:00"}`;
      const db = `${b.date}T${b.created_at || "00:00:00"}`;
      return db.localeCompare(da);
    });
    return merged;
  }

  function entryBodyHtml(entry) {
    const place = entry.place
      ? `<span class="diary-place">${escapeHtml(entry.place)}</span>`
      : "";
    const live = entry.live ? `<em class="diary-live-tag">LIVE</em>` : "";
    return `
      <time datetime="${escapeHtml(entry.date)}">${fmtLong(entry.date)}${live}</time>
      ${place}
      <strong>${escapeHtml(entry.title)}</strong>
      <p>${escapeHtml(entry.body)}</p>
    `;
  }

  async function fetchLiveEntries() {
    try {
      const res = await fetch("/api/diary?limit=200", { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.entries) ? data.entries : [];
    } catch {
      return [];
    }
  }

  function renderDiaryPanel(diary, evalWrap, agent, entries, activeKey) {
    const book = DIARIES[agent];
    const list = entries.length ? entries : mergeEntries(agent, []);
    const active = list.find((e) => entryKey(e) === activeKey) || list[0];
    if (!active) return;

    diary.innerHTML = `
      <div class="diary-head">
        <span class="diary-label">日誌 · Tagebuch</span>
        <span class="diary-agent">${escapeHtml(book.kana)} · ${escapeHtml(book.person)}</span>
      </div>
      <div class="diary-days" role="tablist">
        ${list
          .slice(0, 12)
          .map((e, i) => {
            const key = entryKey(e);
            const on = key === entryKey(active);
            return `
            <button type="button" class="diary-day${on ? " is-active" : ""}${e.live ? " is-live" : ""}"
              data-key="${escapeHtml(key)}"
              aria-pressed="${on ? "true" : "false"}"
              title="${escapeHtml(e.title)}">
              ${fmtDay(e.date)}${e.live ? " ·+" : ""}
            </button>`;
          })
          .join("")}
      </div>
      <div class="diary-entry" data-agent="${escapeHtml(agent)}">
        ${entryBodyHtml(active)}
      </div>
      <p class="diary-hint">
        <a class="diary-write" href="diary.html?agent=${encodeURIComponent(agent)}">iPhone schreiben</a>
        · Tag tippen · Score tippen
      </p>
    `;

    evalWrap.innerHTML = evalHtml(agent, active);

    const entryEl = diary.querySelector(".diary-entry");
    diary.querySelectorAll(".diary-day").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.key;
        const entry = list.find((e) => entryKey(e) === key);
        if (!entry) return;
        diary.querySelectorAll(".diary-day").forEach((b) => {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        entryEl.innerHTML = entryBodyHtml(entry);
        entryEl.classList.remove("flash");
        void entryEl.offsetWidth;
        entryEl.classList.add("flash");
        closeEditors();
        evalWrap.innerHTML = evalHtml(agent, entry);
        evalWrap.classList.remove("flash");
        void evalWrap.offsetWidth;
        evalWrap.classList.add("flash");
      });
    });
  }

  async function mountDiaries() {
    const grid = document.getElementById("camGrid");
    if (!grid) return;

    const tiles = [...grid.querySelectorAll(".cam-tile")];
    if (!tiles.length) return;
    if (grid.dataset.diaryReady) return;
    grid.dataset.diaryReady = "1";

    grid.classList.add("cam-grid--with-diary");
    const panels = [];

    // Spalten sofort bauen (Antenne/Eval brauchen .agent-col)
    tiles.forEach((tile) => {
      const agent = tile.dataset.agent;
      const book = DIARIES[agent];
      if (!book) return;

      const col = document.createElement("div");
      col.className = "agent-col";
      tile.parentNode.insertBefore(col, tile);
      col.appendChild(tile);

      // Antenna-Panel, falls schon vor dem Wrap eingefügt, mitnehmen
      const stray = [...grid.querySelectorAll(".agent-antenna")].find(
        (el) => el.dataset.agent === agent && !col.contains(el)
      );
      if (stray) col.appendChild(stray);

      const diary = document.createElement("div");
      diary.className = "agent-diary";
      col.appendChild(diary);

      const evalWrap = document.createElement("div");
      evalWrap.className = "eval-wrap";
      col.appendChild(evalWrap);
      bindEval(evalWrap);

      const seedEntries = mergeEntries(agent, []);
      renderDiaryPanel(diary, evalWrap, agent, seedEntries, seedEntries[0] ? entryKey(seedEntries[0]) : "");
      panels.push({ agent, diary, evalWrap, col });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".agent-eval")) closeEditors();
    });

    const refresh = async () => {
      if (document.querySelector(".agent-eval.is-editing")) return;
      const fresh = await fetchLiveEntries();
      panels.forEach(({ agent, diary, evalWrap }) => {
        const activeBtn = diary.querySelector(".diary-day.is-active");
        const keepKey = activeBtn?.dataset.key;
        const entries = mergeEntries(agent, fresh);
        renderDiaryPanel(
          diary,
          evalWrap,
          agent,
          entries,
          keepKey || (entries[0] && entryKey(entries[0]))
        );
      });
    };

    await refresh();
    setInterval(refresh, 15000);
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
