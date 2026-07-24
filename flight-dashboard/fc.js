/* ESPlane / Flightcontroller · Live-Werte aus /api/telemetry oder /api/fc */
(() => {
  const $ = (id) => document.getElementById(id);

  function fmt(v, d = 1) {
    if (v == null || Number.isNaN(Number(v))) return "—";
    return Number(v).toFixed(d);
  }

  function applyFc(fc) {
    const host = $("fcPanel");
    if (!host) return;
    const mode = fc?.mode || "offline";
    const vals = fc?.values || {};
    host.dataset.mode = mode;
    const msg = $("fcMsg");
    if (msg) msg.textContent = fc?.message || "FC offline";
    const dot = $("fcDot");
    if (dot) {
      dot.className =
        "dot " + (mode === "live" ? "ok" : mode === "usb" ? "wait" : "off");
    }
    const set = (id, key, digits) => {
      const el = $(id);
      if (el) el.textContent = fmt(vals[key], digits);
    };
    set("fcRoll", "stabilizer.roll", 1);
    set("fcPitch", "stabilizer.pitch", 1);
    set("fcYaw", "stabilizer.yaw", 1);
    set("fcThrust", "stabilizer.thrust", 0);
    set("fcVbat", "pm.vbat", 2);
    set("fcGx", "gyro.x", 1);
    set("fcGy", "gyro.y", 1);
    set("fcGz", "gyro.z", 1);
    const armed = vals["sys.armed"];
    const armEl = $("fcArmed");
    if (armEl) {
      armEl.textContent =
        armed == null ? "—" : Number(armed) > 0 ? "ARMED" : "DISARMED";
      armEl.dataset.on = Number(armed) > 0 ? "1" : "0";
    }
  }

  async function pollFc() {
    try {
      const res = await fetch("/api/telemetry", { cache: "no-store" });
      const data = await res.json();
      if (data.fc) applyFc(data.fc);
      else {
        const r2 = await fetch("/api/fc", { cache: "no-store" });
        applyFc(await r2.json());
      }
    } catch {
      applyFc({ mode: "offline", message: "Server offline", values: {} });
    }
  }

  if (!$("fcPanel")) return;
  setInterval(pollFc, 200);
  pollFc();
})();
