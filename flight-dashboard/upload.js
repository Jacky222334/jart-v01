/* iPhone-tauglicher Foto/Video-Upload auf die Plattform */
(() => {
  const AGENTS = ["TEAM", "ROTA", "ANDŌ", "YUSTO", "YAN"];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtSize(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function refreshList() {
    const grid = document.getElementById("upGrid");
    if (!grid) return;
    try {
      const res = await fetch("/api/uploads", { cache: "no-store" });
      const data = await res.json();
      const files = data.files || [];
      if (!files.length) {
        grid.innerHTML =
          '<p class="up-empty">Noch keine Uploads · Foto oder Video wählen</p>';
        return;
      }
      grid.innerHTML = files
        .map((f) => {
          if (f.kind === "video") {
            return `<a class="up-tile video" href="${escapeHtml(f.url)}" target="_blank" rel="noopener">
              <video src="${escapeHtml(f.url)}#t=0.1" muted playsinline preload="metadata"></video>
              <span>${escapeHtml(f.name)} · ${fmtSize(f.size)}</span>
            </a>`;
          }
          return `<a class="up-tile" href="${escapeHtml(f.url)}" target="_blank" rel="noopener">
            <img src="${escapeHtml(f.url)}" alt="" loading="lazy" />
            <span>${escapeHtml(f.name)} · ${fmtSize(f.size)}</span>
          </a>`;
        })
        .join("");
    } catch {
      grid.innerHTML = '<p class="up-empty">Liste nicht ladbar</p>';
    }
  }

  async function uploadFile(file, agent, statusEl) {
    statusEl.textContent = `Lade hoch… ${file.name}`;
    statusEl.className = "up-status busy";
    const fd = new FormData();
    fd.append("file", file, file.name || "iphone.jpg");
    const res = await fetch(`/api/upload?agent=${encodeURIComponent(agent)}`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    const data = await res.json();
    statusEl.textContent = `✓ Hochgeladen: ${data.name}`;
    statusEl.className = "up-status ok";
    await refreshList();
  }

  function mount() {
    const host = document.getElementById("uploadPanel");
    if (!host || host.dataset.ready) return;
    host.dataset.ready = "1";
    host.innerHTML = `
      <div class="up-head">
        <div>
          <p class="up-kicker">送信 · Upload</p>
          <h2>Foto / Video vom iPhone</h2>
          <p class="up-sub">Mediathek oder Kamera · direkt auf den Pi</p>
        </div>
      </div>
      <div class="up-body">
        <label class="up-agent-label">Agent
          <select id="upAgent">
            ${AGENTS.map((a) => `<option value="${a}">${a}</option>`).join("")}
          </select>
        </label>
        <div class="up-actions">
          <label class="up-btn">
            📷 Foto / Video wählen
            <input type="file" id="upFile" accept="image/*,video/*" />
          </label>
          <label class="up-btn cam">
            📸 Kamera
            <input type="file" id="upCam" accept="image/*,video/*" capture="environment" />
          </label>
        </div>
        <p class="up-hint">iPhone: Safari → diese Seite im WLAN öffnen → Datei wählen → fertig. Max. ~80 MB.</p>
        <p class="up-status" id="upStatus">Bereit</p>
        <div class="up-grid" id="upGrid"></div>
      </div>
    `;

    const status = host.querySelector("#upStatus");
    const agentSel = host.querySelector("#upAgent");
    const onPick = async (input) => {
      const file = input.files && input.files[0];
      input.value = "";
      if (!file) return;
      try {
        await uploadFile(file, agentSel.value, status);
      } catch (err) {
        status.textContent = `Fehler: ${err.message || err}`;
        status.className = "up-status err";
      }
    };
    host.querySelector("#upFile").addEventListener("change", (e) => onPick(e.target));
    host.querySelector("#upCam").addEventListener("change", (e) => onPick(e.target));
    refreshList();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
