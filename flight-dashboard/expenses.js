/* Ausgaben-Fenster · Konto / Bezahlinfo · automatische Aktivitäten (Tokio-SIM) */
(() => {
  const ACCOUNT = {
    name: "Team Japan · 家族カード",
    holder: "ROTA · ANDŌ · YUSTO · YAN",
    iban: "CH93 0076 2011 6238 5295 7",
    card: "···· 4821",
    bank: "Neon Travel · JP Desk",
    currency: "JPY",
    homeCurrency: "CHF",
    rate: 168.5, // SIM: 1 CHF ≈ 168.5 ¥
    startBalanceChf: 4200,
  };

  const ACTIVITIES = [
    {
      jp: "寿司",
      title: "Sushi am Zebrastreifen",
      place: "渋谷横断歩道 · Shibuya Crossing",
      yen: 2840,
      cat: "essen",
      agent: "ROTA",
    },
    {
      jp: "米",
      title: "Reis & Onigiri",
      place: "コンビニ · FamilyMart",
      yen: 480,
      cat: "essen",
      agent: "ANDŌ",
    },
    {
      jp: "電車",
      title: "JR Yamanote Ticket",
      place: "新宿駅 · Shinjuku",
      yen: 160,
      cat: "transit",
      agent: "YUSTO",
    },
    {
      jp: "宿",
      title: "Villa 隅田川 Anzahlung",
      place: "江東区常盤 · Villa Sumidagawa",
      yen: 18500,
      cat: "stay",
      agent: "YAN",
    },
    {
      jp: "喫茶",
      title: "Matcha Latte",
      place: "表参道 · Omotesando",
      yen: 720,
      cat: "essen",
      agent: "ROTA",
    },
    {
      jp: "横断",
      title: "Street-Food nahe Zebrastreifen",
      place: "東京 · Scramble Crossing",
      yen: 950,
      cat: "essen",
      agent: "ANDŌ",
    },
    {
      jp: "電車",
      title: "Metro to Asakusa",
      place: "銀座線",
      yen: 210,
      cat: "transit",
      agent: "YUSTO",
    },
    {
      jp: "寺",
      title: "Schrein-Opfergabe",
      place: "浅草寺 · Senso-ji",
      yen: 100,
      cat: "kultur",
      agent: "YAN",
    },
    {
      jp: "袋",
      title: "Konbini Wasser + Snack",
      place: "セブンイレブン",
      yen: 340,
      cat: "essen",
      agent: "ROTA",
    },
    {
      jp: "円",
      title: "Geldwechsel Rest",
      place: "空港 · Narita Desk",
      yen: 5000,
      cat: "cash",
      agent: "TEAM",
    },
    {
      jp: "ラーメン",
      title: "Ramen nach dem Regen",
      place: "渋谷裏通り",
      yen: 1200,
      cat: "essen",
      agent: "ANDŌ",
    },
    {
      jp: "taxi",
      title: "Taxi kurze Strecke",
      place: "宿 → 駅",
      yen: 980,
      cat: "transit",
      agent: "YUSTO",
    },
  ];

  let spentYen = 0;
  let feed = [];
  let idx = 0;
  let timer = 0;

  function fmtYen(n) {
    return `¥${Math.round(n).toLocaleString("de-CH")}`;
  }
  function fmtChf(n) {
    return `CHF ${n.toLocaleString("de-CH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  function yenToChf(yen) {
    return yen / ACCOUNT.rate;
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function clock() {
    const d = new Date();
    return d.toLocaleTimeString("de-CH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  }

  function balance() {
    const chfLeft = ACCOUNT.startBalanceChf - yenToChf(spentYen);
    const yenLeft = chfLeft * ACCOUNT.rate;
    return { chfLeft, yenLeft };
  }

  function renderAccount() {
    const bal = balance();
    const el = document.getElementById("expAccount");
    if (!el) return;
    el.innerHTML = `
      <div class="exp-card-face">
        <div class="exp-card-top">
          <span class="exp-bank">${escapeHtml(ACCOUNT.bank)}</span>
          <span class="exp-chip">円</span>
        </div>
        <p class="exp-card-name">${escapeHtml(ACCOUNT.name)}</p>
        <p class="exp-card-holder">${escapeHtml(ACCOUNT.holder)}</p>
        <p class="exp-card-num">${escapeHtml(ACCOUNT.card)}</p>
        <p class="exp-iban">${escapeHtml(ACCOUNT.iban)}</p>
      </div>
      <div class="exp-balances">
        <div>
          <label>Saldo (SIM)</label>
          <strong id="expBalChf">${fmtChf(bal.chfLeft)}</strong>
          <span id="expBalYen">${fmtYen(bal.yenLeft)}</span>
        </div>
        <div>
          <label>Kurs</label>
          <strong>1 CHF ≈ ${ACCOUNT.rate} ¥</strong>
          <span>Ausgabe gesamt <b id="expSpent">${fmtYen(spentYen)}</b></span>
        </div>
        <div>
          <label>Zahlung</label>
          <strong>Contactless · QR</strong>
          <span>Status <em class="exp-live">自動 · live</em></span>
        </div>
      </div>
    `;
  }

  function renderFeed() {
    const list = document.getElementById("expFeed");
    if (!list) return;
    list.innerHTML = feed
      .map(
        (a) => `
      <article class="exp-item cat-${escapeHtml(a.cat)}${a.fresh ? " is-fresh" : ""}">
        <div class="exp-jp">${escapeHtml(a.jp)}</div>
        <div class="exp-main">
          <strong>${escapeHtml(a.title)}</strong>
          <span class="exp-place">${escapeHtml(a.place)}</span>
          <span class="exp-meta">${escapeHtml(a.time)} · ${escapeHtml(a.agent)} · ${escapeHtml(a.pay)}</span>
        </div>
        <div class="exp-amount">
          <b>${fmtYen(a.yen)}</b>
          <span>${fmtChf(yenToChf(a.yen))}</span>
        </div>
      </article>`
      )
      .join("");
  }

  function pushActivity() {
    const src = ACTIVITIES[idx % ACTIVITIES.length];
    idx += 1;
    const jitter = Math.round((Math.random() - 0.5) * src.yen * 0.08);
    const yen = Math.max(50, src.yen + jitter);
    spentYen += yen;
    const pays = ["カード", "PayPay", "IC Suica", "現金", "Apple Pay"];
    feed.forEach((f) => {
      f.fresh = false;
    });
    feed.unshift({
      ...src,
      yen,
      time: clock() + " JST",
      pay: pays[Math.floor(Math.random() * pays.length)],
      fresh: true,
    });
    if (feed.length > 12) feed.pop();
    renderAccount();
    renderFeed();
  }

  function mount() {
    const host = document.getElementById("expensePanel");
    if (!host || host.dataset.ready) return;
    host.dataset.ready = "1";
    host.innerHTML = `
      <div class="exp-head">
        <div>
          <p class="exp-kicker">支出 · Ausgaben</p>
          <h2>Konto &amp; Aktivitäten <em>自動プレゼン</em></h2>
          <p class="exp-sub">SIM · Bezahlinfo + laufende Tokio-Ausgaben (Sushi, Reis, Yen…)</p>
        </div>
        <div class="exp-controls">
          <button type="button" class="exp-btn" id="expPause">■ Pause</button>
          <button type="button" class="exp-btn primary" id="expNext">＋ Nächste Aktivität</button>
        </div>
      </div>
      <div class="exp-grid">
        <div id="expAccount" class="exp-account"></div>
        <div class="exp-feed-wrap">
          <div class="exp-feed-head">
            <span>活動ログ · Activity</span>
            <span class="exp-auto" id="expAuto">auto · alle ~4 s</span>
          </div>
          <div class="exp-feed" id="expFeed"></div>
        </div>
      </div>
    `;

    renderAccount();
    // Start mit 3 Einträgen
    pushActivity();
    pushActivity();
    pushActivity();

    let paused = false;
    const pauseBtn = host.querySelector("#expPause");
    const tick = () => {
      if (!paused) pushActivity();
    };
    timer = setInterval(tick, 4200);

    pauseBtn.addEventListener("click", () => {
      paused = !paused;
      pauseBtn.textContent = paused ? "▶ Weiter" : "■ Pause";
      pauseBtn.classList.toggle("on", paused);
      document.getElementById("expAuto").textContent = paused
        ? "pausiert"
        : "auto · alle ~4 s";
    });
    host.querySelector("#expNext").addEventListener("click", () => pushActivity());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
