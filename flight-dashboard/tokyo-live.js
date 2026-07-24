(() => {
  const LIVE = [
    {
      id: "shibuya-fnn",
      kind: "youtube",
      title: "Shibuya Scramble · Live",
      place: "渋谷 · Shibuya",
      youtube: "dfVK7ld38Ys",
      note: "FNN Prim Online",
    },
    {
      id: "shibuya-ann",
      kind: "youtube",
      title: "Shibuya Scramble · ANN",
      place: "渋谷 · Shibuya",
      youtube: "8H3nRCFVR6Y",
      note: "テレ朝ニュース",
    },
    {
      id: "shinjuku",
      kind: "youtube",
      title: "Shinjuku Kabukicho · 24h",
      place: "新宿 · Shinjuku",
      youtube: "DjdUEyjx8GM",
      note: "Kabukicho Live Channel",
    },
    {
      id: "rainbow-fnn",
      kind: "youtube",
      title: "Rainbow Bridge · Odaiba",
      place: "お台場 · Odaiba",
      youtube: "KR7qSzE1j_w",
      note: "FNN Prim Online",
    },
    {
      id: "rainbow-8k",
      kind: "youtube",
      title: "Rainbow Bridge · 8K View",
      place: "東京湾 · Tokyo Bay",
      youtube: "rOtP4TaG9MA",
      note: "TokyoStreetView",
    },
    {
      id: "tokyo-views",
      kind: "youtube",
      title: "Tokyo Views · Soft Jazz",
      place: "東京 · City Mix",
      youtube: "_k-5U7IeK8g",
      note: "Lofi / Relaxe",
    },
  ];

  const STILLS = [
    { src: "media/tokyo/shibuya.jpg", title: "Shibuya Crossing", place: "渋谷" },
    { src: "media/tokyo/neon-alley.jpg", title: "Neon Alley", place: "東京ナイト" },
    { src: "media/tokyo/asakusa.jpg", title: "Asakusa", place: "浅草" },
    { src: "media/tokyo/tokyo-tower.jpg", title: "Tokyo Tower", place: "芝公園" },
    { src: "media/tokyo/bridge.jpg", title: "Rainbow Bridge", place: "お台場" },
    { src: "media/tokyo/fuji.jpg", title: "Fuji Blick", place: "富士" },
    { src: "media/tokyo/train.jpg", title: "Zug", place: "JR" },
    { src: "media/tokyo/ramen.jpg", title: "Ramen", place: "食堂" },
    { src: "media/tokyo/temple.jpg", title: "Tempel", place: "寺" },
    { src: "media/tokyo/skyline.jpg", title: "Skyline", place: "都心" },
  ].map((s) => ({
    id: `still-${s.src.split("/").pop()}`,
    kind: "image",
    title: s.title,
    place: s.place,
    src: s.src,
    note: "Still",
  }));

  const FILMS = [
    {
      id: "film-00-family-japan",
      kind: "video",
      title: "Family Japan · Full Film",
      place: "01→10 · ~43s",
      src: "anime-intro/family-films/videos/00-family-japan-film.mp4",
      poster: "anime-intro/family-films/clips/00-family-japan-film.jpg",
      note: "Matched · Color Grade",
      loop: false,
      autoMs: 45000,
    },
    { file: "01-temple-shoes", title: "Tempel · Schuhe", place: "浅草" },
    { file: "02-bamboo-lost", title: "Bambus · Verirrt", place: "嵐山" },
    { file: "03-omikuji-badluck", title: "Omikuji", place: "神社" },
    { file: "04-ramen-slurp", title: "Ramen Slurp", place: "食堂" },
    { file: "05-deer-chaos", title: "Deer Chaos", place: "奈良" },
    { file: "06-escalator-wrong", title: "Rolltreppe", place: "駅" },
    { file: "07-capsule-hotel", title: "Capsule Hotel", place: "ホテル" },
    { file: "08-karaoke-chaos", title: "Karaoke", place: "カラオケ" },
    { file: "09-shinkansen-bento", title: "Shinkansen Bento", place: "新幹線" },
    { file: "10-team-photo-fuji", title: "Team Fuji", place: "富士" },
  ].map((f) =>
    f.src
      ? f
      : {
          id: `film-${f.file}`,
          kind: "video",
          title: f.title,
          place: f.place,
          src: `anime-intro/family-films/videos/${f.file}.mp4`,
          poster: `anime-intro/family-films/clips/${f.file}.gif`,
          note: "Family Film · Sora",
        }
  );

  const MODES = {
    live: LIVE,
    stills: STILLS,
    films: FILMS,
    all: [...LIVE, ...STILLS, ...FILMS],
  };

  let mode = "live";
  let index = 0;
  let autoSkip = false;
  let autoTimer = null;

  const root = document.getElementById("tokyoLive");
  if (!root) return;

  const stage = root.querySelector("[data-tl-stage]");
  const titleEl = root.querySelector("[data-tl-title]");
  const placeEl = root.querySelector("[data-tl-place]");
  const noteEl = root.querySelector("[data-tl-note]");
  const countEl = root.querySelector("[data-tl-count]");
  const statusEl = root.querySelector("[data-tl-status]");

  function playlist() {
    return MODES[mode] || LIVE;
  }

  function ytSrc(id) {
    const q = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
    });
    return `https://www.youtube-nocookie.com/embed/${id}?${q}`;
  }

  function clearAuto() {
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
  }

  function scheduleAuto() {
    clearAuto();
    if (!autoSkip) return;
    const item = playlist()[index];
    const ms =
      item?.autoMs ||
      (item?.kind === "video" ? 12000 : item?.kind === "image" ? 5000 : 28000);
    autoTimer = setTimeout(() => skip(1), ms);
  }

  function render() {
    const list = playlist();
    if (!list.length) return;
    if (index < 0) index = list.length - 1;
    if (index >= list.length) index = 0;
    const item = list[index];

    titleEl.textContent = item.title;
    placeEl.textContent = item.place;
    noteEl.textContent = item.note || "";
    countEl.textContent = `${index + 1} / ${list.length}`;
    statusEl.textContent =
      item.kind === "youtube"
        ? "LIVE · YouTube"
        : item.kind === "video"
          ? "FILM"
          : "BILD";

    stage.replaceChildren();
    stage.dataset.kind = item.kind;

    if (item.kind === "youtube") {
      const frame = document.createElement("iframe");
      frame.className = "tokyo-live-frame";
      frame.src = ytSrc(item.youtube);
      frame.title = item.title;
      frame.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      stage.appendChild(frame);
    } else if (item.kind === "video") {
      const vid = document.createElement("video");
      vid.className = "tokyo-live-media";
      vid.src = item.src;
      if (item.poster) vid.poster = item.poster;
      vid.controls = true;
      vid.playsInline = true;
      vid.muted = true;
      vid.autoplay = true;
      vid.loop = item.loop !== false;
      stage.appendChild(vid);
      vid.play().catch(() => {});
    } else {
      const img = document.createElement("img");
      img.className = "tokyo-live-media";
      img.src = item.src;
      img.alt = item.title;
      img.loading = "eager";
      stage.appendChild(img);
    }

    root.querySelectorAll("[data-tl-mode]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.tlMode === mode);
    });
    root.querySelector("[data-tl-auto]")?.classList.toggle("is-active", autoSkip);
    scheduleAuto();
  }

  function skip(dir) {
    index += dir;
    render();
  }

  function setMode(next) {
    if (!MODES[next]) return;
    mode = next;
    index = 0;
    render();
  }

  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tl-skip],[data-tl-mode],[data-tl-auto]");
    if (!t) return;
    if (t.dataset.tlSkip != null) {
      skip(Number(t.dataset.tlSkip) || 1);
      return;
    }
    if (t.dataset.tlMode) {
      setMode(t.dataset.tlMode);
      return;
    }
    if (t.hasAttribute("data-tl-auto")) {
      autoSkip = !autoSkip;
      render();
    }
  });

  root.tabIndex = 0;
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      skip(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      skip(-1);
    }
  });

  render();
})();
