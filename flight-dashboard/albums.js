/* Fotoalbum pro Agent (Tokio) + Team-Story「家族で日本へ」 */
(() => {
  const BASE = "media/tokyo-natural";

  const ALBUMS = {
    ROTA: {
      person: "Lotta",
      kana: "ロタ",
      kanji: "露多",
      role: "FRONT",
      photos: [
        { src: `${BASE}/day-street.jpg`, title: "街", cap: "Strasse bei Tag · Tokio" },
        { src: `${BASE}/neighborhood.jpg`, title: "町", cap: "Viertel · ruhiger Alltag" },
        { src: `${BASE}/cherry.jpg`, title: "桜", cap: "Natur · weiches Licht" },
      ],
    },
    ANDŌ: {
      person: "Andrin",
      kana: "アンドー",
      kanji: "安凛",
      role: "REAR",
      photos: [
        { src: `${BASE}/soft-city.jpg`, title: "空", cap: "Stadt am Tag · klar" },
        { src: `${BASE}/street-day.jpg`, title: "道", cap: "Weg zur Unterkunft" },
        { src: `${BASE}/park.jpg`, title: "公園", cap: "Pause im Park" },
      ],
    },
    YUSTO: {
      person: "Justus",
      kana: "ユスト",
      kanji: "祐斗",
      role: "LEFT",
      photos: [
        { src: `${BASE}/shrine.jpg`, title: "寺", cap: "Schrein · ruhig" },
        { src: `${BASE}/garden.jpg`, title: "庭", cap: "Garten · hell" },
        { src: `${BASE}/market.jpg`, title: "市", cap: "Markt · Menschen" },
      ],
    },
    YAN: {
      person: "Jan",
      kana: "ヤン",
      kanji: "漸",
      role: "RIGHT",
      photos: [
        { src: `${BASE}/cafe.jpg`, title: "食", cap: "Essen · gemeinsam" },
        { src: `media/route/villa/exterior.png`, title: "宿", cap: "Villa 隅田川 · Eingang" },
        { src: `media/route/villa/room-futon.png`, title: "部屋", cap: "Futon · angekommen" },
      ],
    },
  };

  const TEAM_STORY = [
    {
      agent: "ROTA",
      src: `${BASE}/day-street.jpg`,
      jp: "私たちは家族だ",
      en: "We are family",
      line: "Tag 1 beginnt in Zürich – Ziel Tokio, ganz natürlich.",
    },
    {
      agent: "ANDŌ",
      src: `${BASE}/neighborhood.jpg`,
      jp: "日本へ行こう",
      en: "Let's go Japan",
      line: "Ankunft in der Stadt. Füsse auf dem Asphalt.",
    },
    {
      agent: "YUSTO",
      src: `${BASE}/shrine.jpg`,
      jp: "一緒に",
      en: "Together",
      line: "Schrein, Garten, Markt – Tag 1 zu Ende.",
    },
    {
      agent: "YAN",
      src: `media/route/villa/exterior.png`,
      jp: "家族旅行",
      en: "Family trip",
      line: "Tag 2: Check-in Villa 隅田川 · Kōtō.",
    },
    {
      agent: "TEAM",
      src: `media/route/villa/terrace.png`,
      jp: "東京の物語",
      en: "Tokyo story",
      line: "ROTA · ANDŌ · YUSTO · YAN — Terrasse am Fluss.",
    },
    {
      agent: "TEAM",
      src: `media/route/villa/room-4beds.png`,
      jp: "ただいま",
      en: "We're home",
      line: "Vier Betten · Shoji-Licht · GPS endet hier – vorerst.",
    },
  ];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ensureLightbox() {
    let box = document.getElementById("photoLightbox");
    if (box) return box;
    box = document.createElement("div");
    box.id = "photoLightbox";
    box.className = "photo-lightbox";
    box.hidden = true;
    box.innerHTML = `
      <button type="button" class="lb-close" aria-label="Schliessen">×</button>
      <figure>
        <img id="lbImg" alt="" />
        <figcaption>
          <span class="lb-jp" id="lbJp"></span>
          <strong id="lbTitle"></strong>
          <p id="lbCap"></p>
        </figcaption>
      </figure>
    `;
    document.body.appendChild(box);
    box.querySelector(".lb-close").addEventListener("click", () => closeLightbox());
    box.addEventListener("click", (e) => {
      if (e.target === box) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
    return box;
  }

  function openLightbox({ src, title, cap, jp }) {
    const box = ensureLightbox();
    document.getElementById("lbImg").src = src;
    document.getElementById("lbImg").alt = title || "";
    document.getElementById("lbTitle").textContent = title || "";
    document.getElementById("lbCap").textContent = cap || "";
    document.getElementById("lbJp").textContent = jp || "東京";
    box.hidden = false;
    document.body.classList.add("lb-open");
  }

  function closeLightbox() {
    const box = document.getElementById("photoLightbox");
    if (!box) return;
    box.hidden = true;
    document.body.classList.remove("lb-open");
  }

  function mountAlbums() {
    const cols = document.querySelectorAll(".agent-col");
    if (!cols.length) return false;

    cols.forEach((col) => {
      if (col.querySelector(".agent-album")) return;
      const tile = col.querySelector(".cam-tile");
      const agent = tile && tile.dataset.agent;
      const album = ALBUMS[agent];
      if (!album) return;

      const el = document.createElement("div");
      el.className = "agent-album";
      el.innerHTML = `
        <div class="album-head">
          <span class="album-label">写真 · Album</span>
          <span class="album-jp">${escapeHtml(album.kanji)} ${escapeHtml(album.kana)}</span>
        </div>
        <div class="album-thumbs">
          ${album.photos
            .map(
              (p, i) => `
            <button type="button" class="album-thumb" data-i="${i}" title="${escapeHtml(p.cap)}">
              <img src="${escapeHtml(p.src)}" alt="${escapeHtml(p.title)}" loading="lazy" />
              <span>${escapeHtml(p.title)}</span>
            </button>`
            )
            .join("")}
        </div>
      `;
      col.appendChild(el);

      el.querySelectorAll(".album-thumb").forEach((btn) => {
        btn.addEventListener("click", () => {
          const p = album.photos[Number(btn.dataset.i)];
          if (!p) return;
          openLightbox({
            src: p.src,
            title: `${album.kanji} · ${p.title}`,
            cap: `${album.person} · ${p.cap}`,
            jp: p.title,
          });
        });
      });
    });
    return true;
  }

  function mountTeamStory() {
    const host = document.getElementById("teamStory");
    if (!host || host.dataset.ready) return;
    host.dataset.ready = "1";

    host.innerHTML = `
      <div class="team-story-head">
        <div class="team-jp-mark" aria-hidden="true">家</div>
        <div>
          <p class="team-kicker">チーム · 家族</p>
          <h2>家族で日本へ <em>We Family Go Japan</em></h2>
          <p class="team-sub">ROTA · ANDŌ · YUSTO · YAN — eine gemeinsame Story</p>
        </div>
        <div class="team-controls">
          <button type="button" class="family-reel-chip" id="familyReelToggle" aria-expanded="false" title="Familienfilm · 43s">
            <img src="anime-intro/family-films/clips/00-family-japan-film.jpg" alt="" width="36" height="64" loading="lazy" />
            <span>短編</span>
          </button>
          <button type="button" class="team-play" id="teamPlayBtn">▶ 開始 · Start</button>
          <button type="button" class="team-stop" id="teamStopBtn" disabled>■ 停止 · Stop</button>
        </div>
      </div>
      <div class="family-reel" id="familyReel" hidden>
        <div class="family-reel-stage">
          <video
            id="familyReelVideo"
            poster="anime-intro/family-films/clips/00-family-japan-film.jpg"
            playsinline
            preload="none"
            controls
          ></video>
        </div>
        <div class="family-reel-meta">
          <p class="family-reel-kicker">家族フィルム</p>
          <p class="family-reel-title">Tempel → Bambus → Ramen → Fuji</p>
          <p class="family-reel-note">10 Szenen · ~43s · stumm starten</p>
          <button type="button" class="family-reel-close" id="familyReelClose">schließen</button>
        </div>
      </div>
      <div class="team-frames" id="teamFrames">
        ${TEAM_STORY.map(
          (s, i) => `
          <button type="button" class="team-frame" data-i="${i}">
            <img src="${escapeHtml(s.src)}" alt="" loading="lazy" />
            <div class="team-frame-meta">
              <span class="tf-jp">${escapeHtml(s.jp)}</span>
              <span class="tf-en">${escapeHtml(s.en)}</span>
              <span class="tf-agent">${escapeHtml(s.agent)}</span>
            </div>
          </button>`
        ).join("")}
      </div>
      <div class="team-story-read" id="teamStoryRead" hidden>
        <p class="tsr-jp" id="tsrJp"></p>
        <p class="tsr-en" id="tsrEn"></p>
        <p class="tsr-line" id="tsrLine"></p>
      </div>
    `;

    const read = host.querySelector("#teamStoryRead");
    const playBtn = host.querySelector("#teamPlayBtn");
    const stopBtn = host.querySelector("#teamStopBtn");
    const reel = host.querySelector("#familyReel");
    const reelToggle = host.querySelector("#familyReelToggle");
    const reelClose = host.querySelector("#familyReelClose");
    const reelVideo = host.querySelector("#familyReelVideo");
    const FILM_SRC = "anime-intro/family-films/videos/00-family-japan-film.mp4";
    let storyIdx = 0;
    let storyTimer = 0;
    let playing = false;

    const closeReel = () => {
      if (!reel || !reelToggle || !reelVideo) return;
      reel.hidden = true;
      reelToggle.setAttribute("aria-expanded", "false");
      reelToggle.classList.remove("is-open");
      reelVideo.pause();
    };

    const openReel = () => {
      if (!reel || !reelToggle || !reelVideo) return;
      stopStory();
      reel.hidden = false;
      reelToggle.setAttribute("aria-expanded", "true");
      reelToggle.classList.add("is-open");
      if (!reelVideo.src) reelVideo.src = FILM_SRC;
      reelVideo.muted = true;
      reelVideo.play().catch(() => {});
    };

    reelToggle?.addEventListener("click", () => {
      if (reel?.hidden) openReel();
      else closeReel();
    });
    reelClose?.addEventListener("click", closeReel);

    const showFrame = (i, { lightbox = false } = {}) => {
      const s = TEAM_STORY[i];
      if (!s) return;
      storyIdx = i;
      host.querySelectorAll(".team-frame").forEach((f, j) => {
        f.classList.toggle("is-active", j === i);
      });
      read.hidden = false;
      document.getElementById("tsrJp").textContent = s.jp;
      document.getElementById("tsrEn").textContent = s.en;
      document.getElementById("tsrLine").textContent = s.line;
      if (lightbox) {
        openLightbox({
          src: s.src,
          title: s.en,
          cap: s.line,
          jp: s.jp,
        });
      }
    };

    const setPlayingUi = (on) => {
      playing = on;
      host.classList.toggle("is-playing", on);
      playBtn.disabled = on;
      stopBtn.disabled = !on;
      playBtn.textContent = on ? "▶ 再生中…" : "▶ 開始 · Start";
    };

    const stopStory = () => {
      if (storyTimer) {
        clearInterval(storyTimer);
        storyTimer = 0;
      }
      setPlayingUi(false);
    };

    const startStory = () => {
      if (playing) return;
      stopStory();
      setPlayingUi(true);
      showFrame(0, { lightbox: false });
      storyTimer = setInterval(() => {
        const next = storyIdx + 1;
        if (next >= TEAM_STORY.length) {
          stopStory();
          return;
        }
        showFrame(next, { lightbox: false });
      }, 2800);
    };

    // Einzelbild: nur ansehen, startet die Story nicht
    host.querySelectorAll(".team-frame").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (playing) return; // während Playback nicht unterbrechen per Klick
        showFrame(Number(btn.dataset.i), { lightbox: true });
      });
    });

    playBtn.addEventListener("click", startStory);
    stopBtn.addEventListener("click", stopStory);
  }

  function boot() {
    ensureLightbox();
    mountTeamStory();
    const tryAlbums = () => {
      if (mountAlbums()) return true;
      return false;
    };
    if (tryAlbums()) return;
    const iv = setInterval(() => {
      if (tryAlbums()) clearInterval(iv);
    }, 50);
    setTimeout(() => clearInterval(iv), 4000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
