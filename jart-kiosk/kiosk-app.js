import { ColorEngine } from './overlay.js';
import { createKioskAudioMeter } from './audioMeter.js';

export function initKiosk({
  pieces,
  slideMs,
  shuffle = true,
  showGallery = true,
  audio = true,
  startup = null,
  music = false,
  musicSrc = '/audio/interstellar.mp3',
  musicPlaylist = null,
  musicVolume = 1,
}) {
  const art = document.getElementById('art');
  const wrap = document.getElementById('frame-wrap');
  const titleEl = document.getElementById('title');
  const metaEl = document.getElementById('meta');
  const barEl = document.getElementById('bar');
  const root = document.getElementById('root');
  const hud = document.getElementById('hud');
  const galleryLink = document.getElementById('gallery-link');
  const speechEl = document.getElementById('speech-bubble');
  const numEl = document.getElementById('piece-num') || (() => {
    const el = document.createElement('div');
    el.id = 'piece-num';
    el.setAttribute('aria-hidden', 'true');
    hud?.prepend(el);
    return el;
  })();
  let numTimer = null;

  if (!showGallery && galleryLink) galleryLink.style.display = 'none';

  const engine = new ColorEngine(root);
  const kioskAudio = audio ? createKioskAudioMeter(document.getElementById('hud')) : null;
  if (kioskAudio) {
    kioskAudio.hookIframe(art);
    kioskAudio.startLive(engine);

    kioskAudio.onDrive((a) => {
      engine.feedAudio(a);
      const stage = document.getElementById('stage');
      const scale = 1 + a.bass * 0.045 + a.beat * 0.055;
      const tx = (a.l - a.r) * 14;
      const ty = -a.mid * 8 - a.beat * 5;
      const rot = (a.mid - a.treble) * 1.2;
      stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${rot}deg)`;
    });
  }

  let order = [];
  let index = 0;
  let slideStart = 0;
  let currentDuration = slideMs;
  let autoTimer = null;
  let startupTimer = null;
  let showingStartup = false;
  let lastTapAt = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let menu = null;
  let menuButton = null;
  let menuCount = null;
  let menuList = null;
  let musicEl = null;
  let musicButton = null;
  let musicWanted = Boolean(music);
  const musicTracks = (musicPlaylist?.length ? musicPlaylist : [musicSrc]).map((track) => (
    typeof track === 'string' ? { src: track, title: 'Kosmische Musik' } : track
  ));
  let musicTrackIndex = Math.floor(Math.random() * musicTracks.length);

  function shuffleArr(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function resetCycle(reshuffle) {
    order = reshuffle && shuffle ? shuffleArr(pieces) : [...pieces];
    index = 0;
    renderMenuList();
  }

  function tickBar() {
    const elapsed = Date.now() - slideStart;
    barEl.style.width = `${Math.min(100, (elapsed / currentDuration) * 100)}%`;
  }

  function setSpeech(text) {
    if (!speechEl) return;
    speechEl.textContent = text || '';
    speechEl.classList.toggle('visible', Boolean(text));
  }

  function updateMusicButton() {
    if (!musicButton || !musicEl) return;
    const playing = !musicEl.paused;
    musicButton.classList.toggle('playing', playing);
    musicButton.textContent = playing ? 'Sound aus' : 'Sound an';
    musicButton.setAttribute('aria-pressed', String(playing));
    musicButton.title = musicTracks[musicTrackIndex]?.title || 'Kosmische Sounds';
  }

  function loadMusicTrack(nextIndex = musicTrackIndex) {
    if (!musicEl || !musicTracks.length) return;
    musicTrackIndex = (nextIndex + musicTracks.length) % musicTracks.length;
    const track = musicTracks[musicTrackIndex];
    musicEl.src = track.src;
    musicEl.loop = musicTracks.length === 1;
    updateMusicButton();
  }

  async function playLoadedMusic() {
    musicEl.volume = Math.max(0, Math.min(1, musicVolume));
    await musicEl.play();
  }

  async function nextMusicTrack() {
    if (!musicEl || !musicWanted) return;
    loadMusicTrack(musicTrackIndex + 1);
    try {
      await playLoadedMusic();
    } catch {
      musicWanted = false;
    }
    updateMusicButton();
  }

  async function setMusic(on) {
    if (!musicEl) return;
    musicWanted = on;
    try {
      if (on) {
        if (!musicEl.src) loadMusicTrack();
        await playLoadedMusic();
      } else {
        musicEl.pause();
      }
    } catch {
      musicWanted = false;
    }
    updateMusicButton();
  }

  function initMusic() {
    musicEl = document.createElement('audio');
    musicEl.id = 'interstellar-music';
    musicEl.preload = 'auto';
    musicEl.volume = Math.max(0, Math.min(1, musicVolume));
    loadMusicTrack();

    musicButton = document.createElement('button');
    musicButton.id = 'music-toggle';
    musicButton.type = 'button';
    musicButton.setAttribute('aria-pressed', 'false');
    musicButton.textContent = 'Sound an';
    musicButton.addEventListener('click', () => setMusic(!musicWanted));
    musicEl.addEventListener('ended', nextMusicTrack);
    musicEl.addEventListener('play', updateMusicButton);
    musicEl.addEventListener('pause', updateMusicButton);

    hud.append(musicEl, musicButton);
    if (musicWanted) setMusic(true);
  }

  function setMenuOpen(open) {
    if (!menu || !menuButton) return;
    menu.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  }

  function toggleMenu() {
    setMenuOpen(!menu?.classList.contains('open'));
  }

  function renderMenuActive() {
    if (!menu) return;
    menu.querySelectorAll('[data-menu-index]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.menuIndex) === index);
    });
  }

  function renderMenuList() {
    if (!menuList || !menuCount) return;
    menuList.replaceChildren();
    menuCount.textContent = `${order.length} Animationen fest geladen`;

    order.forEach((piece, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.menuIndex = String(i);
      button.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span>${piece.title}`;
      button.addEventListener('click', () => selectPiece(i));
      menuList.appendChild(button);
    });

    renderMenuActive();
  }

  function formatSlideDuration(ms) {
    if (ms >= 60_000) return `${Math.round(ms / 60_000)} min`;
    return `${Math.round(ms / 1000)} s`;
  }

  function showPieceNumber(i) {
    if (!numEl) return;
    const digits = String(order.length).length;
    numEl.textContent = String(i + 1).padStart(Math.max(2, digits), '0');
    numEl.classList.remove('pop', 'hold', 'fade');
    void numEl.offsetWidth;
    numEl.classList.add('pop');
    if (numTimer) clearTimeout(numTimer);
    numTimer = setTimeout(() => {
      numEl.classList.remove('pop');
      numEl.classList.add('hold');
      numTimer = setTimeout(() => {
        numEl.classList.remove('hold');
        numEl.classList.add('fade');
      }, 2200);
    }, 480);
  }

  function showPiece(i) {
    const piece = order[i];
    currentDuration = slideMs;
    setSpeech('');
    titleEl.textContent = piece.title;
    metaEl.textContent = `${i + 1}/${order.length} · ${formatSlideDuration(slideMs)}`;
    showPieceNumber(i);
    engine.randomize();
    wrap.classList.add('fade');
    setTimeout(() => {
      art.src = piece.path;
      wrap.classList.remove('fade');
      kioskAudio?.resume();
    }, 700);
    slideStart = Date.now();
    barEl.style.width = '0%';
    renderMenuActive();
  }

  function finishStartup() {
    if (startupTimer) clearTimeout(startupTimer);
    startupTimer = null;
    showingStartup = false;
    setSpeech('');
    showPiece(index);
    scheduleAuto();
  }

  function showStartup() {
    if (!startup?.path) return false;
    showingStartup = true;
    currentDuration = startup.ms || 20000;
    titleEl.textContent = startup.title || 'Start';
    metaEl.textContent = `${Math.round(currentDuration / 1000)} s · danach Pi-Playlist`;
    setSpeech(startup.bubble);
    engine.randomize();
    wrap.classList.add('fade');
    setTimeout(() => {
      art.src = startup.path;
      wrap.classList.remove('fade');
      kioskAudio?.resume();
    }, 700);
    slideStart = Date.now();
    barEl.style.width = '0%';
    startupTimer = setTimeout(finishStartup, currentDuration);
    return true;
  }

  function advance() {
    if (showingStartup) {
      finishStartup();
      return false;
    }
    index = (index + 1) % order.length;
    if (index === 0 && shuffle) resetCycle(true);
    showPiece(index);
    return true;
  }

  function scheduleAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(advance, slideMs);
  }

  function manualAdvance() {
    if (advance()) {
      // Automatik bleibt aktiv, startet ab dem direkt gewählten Werk neu.
      scheduleAuto();
    }
  }

  function selectPiece(nextIndex) {
    if (showingStartup) finishStartup();
    index = nextIndex;
    showPiece(index);
    scheduleAuto();
    setMenuOpen(false);
  }

  function initMenu() {
    menuButton = document.createElement('button');
    menuButton.id = 'menu-toggle';
    menuButton.type = 'button';
    menuButton.setAttribute('aria-controls', 'kiosk-menu');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.textContent = 'Menü';

    menu = document.createElement('nav');
    menu.id = 'kiosk-menu';
    menu.setAttribute('aria-label', 'Kiosk Animationen');
    menu.innerHTML = `
      <div class="menu-head">
        <span>Weiter mit</span>
        <button type="button" id="menu-close" aria-label="Menü schließen">×</button>
      </div>
      <div class="menu-count"></div>
      <div class="menu-list"></div>
    `;

    menuList = menu.querySelector('.menu-list');
    menuCount = menu.querySelector('.menu-count');
    renderMenuList();

    menuButton.addEventListener('click', toggleMenu);
    menu.querySelector('#menu-close').addEventListener('click', () => setMenuOpen(false));
    hud.append(menuButton, menu);
  }

  function bindDoubleTap() {
    const layer = document.createElement('div');
    layer.id = 'touch-layer';
    hud.appendChild(layer);

    const hit = (x, y) => {
      const now = performance.now();
      const dx = x - lastTapX;
      const dy = y - lastTapY;
      const close = Math.hypot(dx, dy) < 70;
      if (now - lastTapAt < 420 && close) {
        lastTapAt = 0;
        layer.classList.add('tap-hit');
        setTimeout(() => layer.classList.remove('tap-hit'), 140);
        manualAdvance();
        return;
      }
      lastTapAt = now;
      lastTapX = x;
      lastTapY = y;
    };

    layer.addEventListener('touchend', (e) => {
      const t = e.changedTouches?.[0];
      if (!t) return;
      e.preventDefault();
      hit(t.clientX, t.clientY);
    }, { passive: false });

    layer.addEventListener('click', (e) => {
      hit(e.clientX, e.clientY);
    });
  }

  resetCycle(false);
  engine.start();
  initMusic();
  initMenu();
  bindDoubleTap();
  setInterval(tickBar, 200);
  if (!showStartup()) {
    showPiece(0);
    scheduleAuto();
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') toggleMenu();
    if (e.key === 'Escape') setMenuOpen(false);
    if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') manualAdvance();
    if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
      index = (index - 1 + order.length) % order.length;
      showPiece(index);
    }
  });
}
