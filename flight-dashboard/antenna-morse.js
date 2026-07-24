/* Live-Antenne pro Agent · chinesische 电码 (4 Ziffern) → Morse · dynamische Visualisierung */
(() => {
  const UNIT_MS = 72;

  /** ITU Morse für Ziffern (电码-Übertragung) */
  const DIGIT_MORSE = {
    0: "-----",
    1: ".----",
    2: "..---",
    3: "...--",
    4: "....-",
    5: ".....",
    6: "-....",
    7: "--...",
    8: "---..",
    9: "----.",
  };

  /**
   * Kuratierte 中文电码 (Chinese Commercial Code).
   * Zeichen → 4-stelliger Telegraphencode.
   */
  const CCC = {
    中: "0022",
    国: "0948",
    日: "2494",
    本: "2609",
    东: "2639",
    京: "0079",
    旅: "6137",
    行: "5844",
    队: "7070",
    友: "0681",
    乐: "0516",
    风: "7279",
    光: "0342",
    雨: "3091",
    夜: "1337",
    星: "2512",
    海: "3189",
    山: "1472",
    路: "6429",
    信: "0207",
    号: "0678",
    电: "7193",
    波: "3184",
    发: "4099",
    送: "6670",
    收: "2455",
    到: "6671",
    安: "1344",
    全: "0356",
    团: "0957",
    结: "4548",
    开: "0360",
    始: "2480",
    现: "6050",
    在: "0961",
    走: "6631",
    动: "0265",
    飞: "7553",
    机: "2623",
    火: "3509",
    车: "6750",
    地: "0960",
    图: "0956",
    北: "0554",
    南: "0589",
    西: "6007",
    上: "0006",
    下: "0494",
    新: "2450",
    宿: "2589",
    涩: "3095",
    谷: "3013",
    浅: "3090",
    草: "5445",
    桥: "5301",
    站: "6384",
    门: "7024",
    口: "0656",
    人: "0086",
    心: "2455",
    梦: "5328",
    想: "3274",
    爱: "1947",
    家: "1367",
    回: "1753",
    乡: "5281",
    瑞: "3058",
    士: "0969",
    苏: "5684",
    黎: "7240",
    世: "0013",
    界: "0672",
    连: "6650",
    接: "2622",
    活: "3184",
    力: "0046",
    强: "1630",
    静: "7211",
    听: "6004",
    看: "4010",
    记: "6236",
    录: "7191",
    码: "7456",
  };

  const AGENTS = {
    ROTA: {
      person: "Lotta",
      hue: 160,
      freq: "7.045",
      messages: [
        "东京夜风光",
        "涩谷信号强",
        "旅行开始",
        "电波发送",
        "浅草桥站",
        "团队团结",
      ],
    },
    ANDŌ: {
      person: "Andrin",
      hue: 35,
      freq: "14.230",
      messages: [
        "新宿路口",
        "地图行动",
        "火车飞行",
        "南北东西",
        "安全到达",
        "记录电码",
      ],
    },
    YUSTO: {
      person: "Justus",
      hue: 200,
      freq: "21.070",
      messages: [
        "信号接收",
        "星海夜想",
        "活力连接",
        "听风看雨",
        "编码发送",
        "世界连结",
      ],
    },
    YAN: {
      person: "Jan",
      hue: 280,
      freq: "28.120",
      messages: [
        "回家乡路",
        "瑞士苏黎",
        "飞机起飞",
        "心动梦想",
        "电波接力",
        "安静力量",
      ],
    },
  };

  function morseOfDigit(d) {
    return DIGIT_MORSE[d] || "";
  }

  function encodeChar(ch) {
    const code = CCC[ch];
    if (!code) return null;
    return {
      ch,
      code,
      morseDigits: [...code].map((d) => ({
        digit: d,
        pattern: morseOfDigit(d),
      })),
    };
  }

  function buildQueue(messages) {
    const queue = [];
    messages.forEach((msg, mi) => {
      [...msg].forEach((ch) => {
        const enc = encodeChar(ch);
        if (enc) queue.push({ ...enc, msgIndex: mi, message: msg });
      });
      queue.push({ gap: "word" });
    });
    return queue;
  }

  /** Expandiert Zeichen-Queue in zeitliche Events (dit/dah/gaps) */
  function expandTimeline(enc) {
    const events = [];
    if (enc.gap === "word") {
      events.push({ type: "gap", units: 10, label: "¶" });
      return events;
    }
    events.push({ type: "char", ch: enc.ch, code: enc.code, message: enc.message });
    enc.morseDigits.forEach((md, di) => {
      [...md.pattern].forEach((sym, si) => {
        events.push({
          type: "tone",
          symbol: sym,
          units: sym === "." ? 1 : 3,
          digit: md.digit,
          code: enc.code,
          ch: enc.ch,
        });
        if (si < md.pattern.length - 1) {
          events.push({ type: "gap", units: 1 });
        }
      });
      if (di < enc.morseDigits.length - 1) {
        events.push({ type: "gap", units: 3, digitGap: true });
      }
    });
    events.push({ type: "gap", units: 7, charGap: true });
    return events;
  }

  function createPanel(agent, meta) {
    const el = document.createElement("div");
    el.className = "agent-antenna";
    el.dataset.agent = agent;
    el.style.setProperty("--ant-hue", String(meta.hue));
    el.innerHTML = `
      <div class="ant-head">
        <span class="ant-label">天线 · TX</span>
        <span class="ant-freq">${meta.freq} MHz</span>
        <span class="ant-state" data-ant-state>STANDBY</span>
      </div>
      <div class="ant-body">
        <div class="ant-mast" aria-hidden="true">
          <i class="ant-ring r1"></i>
          <i class="ant-ring r2"></i>
          <i class="ant-ring r3"></i>
          <span class="ant-pole"></span>
          <span class="ant-tip"></span>
        </div>
        <div class="ant-payload">
          <div class="ant-char-row">
            <strong class="ant-hanzi" data-ant-hanzi>·</strong>
            <span class="ant-ccc" data-ant-ccc>————</span>
          </div>
          <div class="ant-morse" data-ant-morse></div>
          <div class="ant-msg" data-ant-msg>${meta.messages[0]}</div>
        </div>
      </div>
      <canvas class="ant-wave" data-ant-wave width="240" height="28" aria-hidden="true"></canvas>
    `;
    return el;
  }

  function mountIntoCol(col, agent) {
    if (col.querySelector(".agent-antenna")) return null;
    const meta = AGENTS[agent];
    if (!meta) return null;
    const panel = createPanel(agent, meta);
    const tile = col.querySelector(".cam-tile");
    if (tile && tile.nextSibling) {
      col.insertBefore(panel, tile.nextSibling);
    } else if (tile) {
      col.appendChild(panel);
    } else {
      col.prepend(panel);
    }
    return panel;
  }

  function startTransmitter(panel, agent) {
    const meta = AGENTS[agent];
    const queue = buildQueue(meta.messages);
    let qi = 0;
    let timeline = [];
    let ti = 0;
    let until = 0;
    let keyDown = false;
    let morseTrail = [];
    const MAX_TRAIL = 48;

    const hanziEl = panel.querySelector("[data-ant-hanzi]");
    const cccEl = panel.querySelector("[data-ant-ccc]");
    const morseEl = panel.querySelector("[data-ant-morse]");
    const msgEl = panel.querySelector("[data-ant-msg]");
    const stateEl = panel.querySelector("[data-ant-state]");
    const canvas = panel.querySelector("[data-ant-wave]");
    const ctx = canvas.getContext("2d");
    const wave = new Float32Array(120);
    let waveWrite = 0;

    function pushTrail(sym) {
      morseTrail.push(sym);
      if (morseTrail.length > MAX_TRAIL) morseTrail.shift();
      morseEl.textContent = morseTrail.join("");
    }

    function nextChunk() {
      const enc = queue[qi % queue.length];
      qi += 1;
      timeline = expandTimeline(enc);
      ti = 0;
    }

    nextChunk();

    function step(now) {
      if (now >= until) {
        if (ti >= timeline.length) nextChunk();
        const ev = timeline[ti++];
        if (!ev) {
          until = now + UNIT_MS;
        } else if (ev.type === "char") {
          hanziEl.textContent = ev.ch;
          cccEl.textContent = ev.code;
          msgEl.textContent = ev.message;
          panel.classList.add("is-char");
          keyDown = false;
          until = now + UNIT_MS;
          stateEl.textContent = "TX";
          panel.classList.add("is-tx");
        } else if (ev.type === "tone") {
          keyDown = true;
          panel.classList.add("is-keyed");
          pushTrail(ev.symbol === "." ? "·" : "−");
          until = now + ev.units * UNIT_MS;
        } else if (ev.type === "gap") {
          keyDown = false;
          panel.classList.remove("is-keyed");
          if (ev.digitGap) pushTrail(" ");
          if (ev.charGap) {
            pushTrail(" / ");
            panel.classList.remove("is-char");
          }
          if (ev.label === "¶") {
            stateEl.textContent = "GAP";
            panel.classList.remove("is-tx");
            hanziEl.textContent = "¶";
            cccEl.textContent = "····";
          }
          until = now + ev.units * UNIT_MS;
        }
      }

      const level = keyDown ? 0.75 + Math.random() * 0.25 : 0.04 + Math.random() * 0.06;
      wave[waveWrite % wave.length] = level;
      waveWrite += 1;
      drawWave(ctx, canvas, wave, waveWrite, meta.hue, keyDown);

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function drawWave(ctx, canvas, wave, write, hue, keyed) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = `hsla(${hue}, 40%, 8%, 0.9)`;
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    const n = wave.length;
    for (let i = 0; i < n; i++) {
      const idx = (write + i) % n;
      const v = wave[idx];
      const x = (i / (n - 1)) * w;
      const y = h * 0.5 - v * (h * 0.42);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = keyed
      ? `hsla(${hue}, 95%, 68%, 0.95)`
      : `hsla(${hue}, 50%, 45%, 0.55)`;
    ctx.lineWidth = keyed ? 2 : 1;
    ctx.stroke();

    if (keyed) {
      ctx.fillStyle = `hsla(${hue}, 90%, 60%, 0.12)`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function boot() {
    const mounted = new Set();

    const tryMount = () => {
      // Mit .agent-col (nach diaries) oder direkt am Cam-Tile
      const cols = [...document.querySelectorAll(".agent-col")];
      if (cols.length) {
        cols.forEach((col) => {
          const tile = col.querySelector(".cam-tile[data-agent]");
          if (!tile) return;
          const agent = tile.dataset.agent;
          if (mounted.has(agent)) return;
          const panel = mountIntoCol(col, agent);
          if (panel) {
            mounted.add(agent);
            startTransmitter(panel, agent);
          }
        });
        return mounted.size >= Object.keys(AGENTS).length;
      }

      const tiles = [...document.querySelectorAll(".cam-tile[data-agent]")];
      if (!tiles.length) return false;

      tiles.forEach((tile) => {
        const agent = tile.dataset.agent;
        if (mounted.has(agent) || !AGENTS[agent]) return;
        // Noch kein agent-col → Panel direkt unter der Tile einfügen
        let host = tile.parentElement;
        if (!host) return;
        if (!host.classList.contains("agent-col")) {
          // temporär hinter die Tile hängen
          const panel = createPanel(agent, AGENTS[agent]);
          tile.insertAdjacentElement("afterend", panel);
          startTransmitter(panel, agent);
          mounted.add(agent);
        }
      });
      return false;
    };

    if (tryMount()) return;

    const iv = setInterval(() => {
      if (tryMount()) clearInterval(iv);
    }, 80);

    // Lange nachziehen (diaries wrappt Tiles asynchron)
    const obs = new MutationObserver(() => {
      if (tryMount()) {
        clearInterval(iv);
        obs.disconnect();
      }
    });
    const grid = document.getElementById("camGrid") || document.body;
    obs.observe(grid, { childList: true, subtree: true });
    setTimeout(() => {
      clearInterval(iv);
      obs.disconnect();
      tryMount();
    }, 20000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
