/* Anonymes Feedback-Board · funny Stickies + Emojis · Dashboard-Wand */
(() => {
  const TARGETS = [
    { id: "ALL", label: "Alles" },
    { id: "TEAM", label: "We Agents" },
    { id: "ROTA", label: "ROTA" },
    { id: "ANDŌ", label: "ANDŌ" },
    { id: "YUSTO", label: "YUSTO" },
    { id: "YAN", label: "YAN" },
  ];

  const EMOJIS = [
    "😂", "🔥", "✨", "🫡", "🫶", "🍜", "🍣", "🗼", "🦊", "🐱",
    "👻", "🚀", "💥", "😎", "🤩", "💪", "🌸", "⚡", "🪩", "👽",
  ];

  const STAMP_ICON = {
    zap: "⚡",
    heart: "💖",
    star: "⭐",
    rocket: "🚀",
    ramen: "🍜",
    ghost: "👻",
    cat: "🐱",
    spark: "✨",
    wave: "🌊",
    lol: "😂",
  };

  const DOODLES = ["◎", "※", "✦", "⌁", "彡", "★", "◇", "▽"];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stampIcon(id) {
    return STAMP_ICON[id] || "✨";
  }

  function hashHue(id) {
    let h = 0;
    for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return 20 + (h % 300);
  }

  async function fetchPosts(filter) {
    try {
      const q =
        !filter || filter === "ALL"
          ? "/api/feedback?limit=48"
          : `/api/feedback?target=${encodeURIComponent(filter)}&limit=48`;
      const res = await fetch(q, { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.posts) ? data.posts : [];
    } catch {
      return [];
    }
  }

  function mount() {
    const host = document.getElementById("feedbackBoard");
    if (!host || host.dataset.ready) return;
    host.dataset.ready = "1";

    let filter = "ALL";
    let stamp = "spark";

    host.innerHTML = `
      <div class="fb-head">
        <div>
          <h2>Feedback Board</h2>
          <p class="fb-sub">Anonym · Agent → Agent · We Agents together</p>
        </div>
        <a class="fb-phone" href="feedback.html">iPhone schreiben →</a>
      </div>

      <div class="fb-doodle-rail" aria-hidden="true">
        ${DOODLES.map((d, i) => `<i style="--i:${i}">${d}</i>`).join("")}
      </div>

      <div class="fb-compose">
        <div class="fb-targets" role="group" aria-label="Ziel">
          ${TARGETS.filter((t) => t.id !== "ALL")
            .map(
              (t, i) => `
            <button type="button" data-to="${t.id}" class="${i === 0 ? "is-on" : ""}">${t.label}</button>`
            )
            .join("")}
        </div>
        <textarea class="fb-text" maxlength="500" rows="3" placeholder="Anonyme Nachricht… Emojis unten tippen 👇"></textarea>
        <div class="fb-emoji" aria-label="Emojis">
          ${EMOJIS.map((e) => `<button type="button" data-e="${e}">${e}</button>`).join("")}
        </div>
        <div class="fb-compose-row">
          <div class="fb-stamps">
            ${Object.entries(STAMP_ICON)
              .map(
                ([id, icon]) =>
                  `<button type="button" data-stamp="${id}" class="${id === stamp ? "is-on" : ""}" title="${id}">${icon}</button>`
              )
              .join("")}
          </div>
          <button type="button" class="fb-send">Anonym posten</button>
        </div>
        <p class="fb-status" data-fb-status></p>
      </div>

      <div class="fb-filters" role="tablist">
        ${TARGETS.map(
          (t) => `
          <button type="button" data-filter="${t.id}" class="${t.id === filter ? "is-on" : ""}">${t.label}</button>`
        ).join("")}
      </div>

      <div class="fb-wall" data-fb-wall></div>
    `;

    const textEl = host.querySelector(".fb-text");
    const statusEl = host.querySelector("[data-fb-status]");
    const wall = host.querySelector("[data-fb-wall]");
    let toTarget = "TEAM";

    function setStatus(msg, ok) {
      statusEl.textContent = msg || "";
      statusEl.dataset.ok = ok ? "1" : "0";
    }

    host.querySelector(".fb-targets").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-to]");
      if (!btn) return;
      toTarget = btn.dataset.to;
      host.querySelectorAll(".fb-targets [data-to]").forEach((b) => {
        b.classList.toggle("is-on", b === btn);
      });
    });

    host.querySelector(".fb-emoji").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-e]");
      if (!btn) return;
      const start = textEl.selectionStart ?? textEl.value.length;
      const end = textEl.selectionEnd ?? start;
      const v = textEl.value;
      textEl.value = v.slice(0, start) + btn.dataset.e + v.slice(end);
      textEl.focus();
      const pos = start + [...btn.dataset.e].length;
      try {
        textEl.setSelectionRange(pos, pos);
      } catch {
        /* */
      }
    });

    host.querySelector(".fb-stamps").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-stamp]");
      if (!btn) return;
      stamp = btn.dataset.stamp;
      host.querySelectorAll(".fb-stamps [data-stamp]").forEach((b) => {
        b.classList.toggle("is-on", b === btn);
      });
    });

    host.querySelector(".fb-filters").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-filter]");
      if (!btn) return;
      filter = btn.dataset.filter;
      host.querySelectorAll(".fb-filters [data-filter]").forEach((b) => {
        b.classList.toggle("is-on", b === btn);
      });
      renderWall();
    });

    host.querySelector(".fb-send").addEventListener("click", async () => {
      const text = textEl.value.trim();
      if (!text) {
        setStatus("Text fehlt", false);
        return;
      }
      setStatus("Sende…", false);
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: toTarget,
            text,
            stamp,
            rotate: Math.floor(Math.random() * 11) - 5,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Fehler");
        textEl.value = "";
        setStatus("Gepostet · anonym 🕵️", true);
        await renderWall();
      } catch (err) {
        setStatus(err.message || String(err), false);
      }
    });

    async function renderWall() {
      const posts = await fetchPosts(filter);
      if (!posts.length) {
        wall.innerHTML = `
          <div class="fb-empty">
            <span class="fb-empty-art" aria-hidden="true">👻📎✨</span>
            <p>Noch keine Zettel — wer traut sich?</p>
          </div>`;
        return;
      }

      wall.innerHTML = posts
        .map((p, i) => {
          const rot = p.rotate != null ? p.rotate : ((i * 3) % 9) - 4;
          const hue = hashHue(p.id || p.target);
          const team = p.target === "TEAM";
          return `
          <article class="fb-note" style="--rot:${rot}deg; --hue:${hue}" data-target="${escapeHtml(p.target)}">
            <div class="fb-note-tape" aria-hidden="true"></div>
            <div class="fb-note-stamp">${stampIcon(p.stamp)}</div>
            <div class="fb-note-to${team ? " is-team" : ""}">→ ${escapeHtml(p.target)}</div>
            <p>${escapeHtml(p.text)}</p>
            <div class="fb-note-foot">
              <span>🕵️ anon</span>
              <time>${new Date(p.created_at).toLocaleString("de-CH", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}</time>
            </div>
            <i class="fb-scribble" aria-hidden="true">${DOODLES[i % DOODLES.length]}</i>
          </article>`;
        })
        .join("");
    }

    renderWall();
    setInterval(renderWall, 18000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
