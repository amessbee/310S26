// Closest Pair of Points Visualizer — clean build
(function () {
  // DOM
  const planeEl = document.getElementById("plane");
  const bestEl = document.getElementById("best-out");
  const stepEl = document.getElementById("step-count");
  const nRange = document.getElementById("nPts");
  const nNum = document.getElementById("nPtsNum");
  const randomBtn = document.getElementById("randomCP");
  const resetBtn = document.getElementById("resetCP");
  const stepBtn = document.getElementById("stepCP");
  const stepOverBtn = document.getElementById("stepOverCP");
  const autoBtn = document.getElementById("autoCP");
  const speedRange = document.getElementById("speed");
  const pcEl = document.getElementById("pcCP");
  const gridEl = document.getElementById("grid");
  const pcPanelEl = document.getElementById("pcPanel");
  const pcToggle = document.getElementById("pcToggle");
  const localsEl = document.getElementById("locals");

  // State
  let points = []; // [{x,y,id}]
  let pxIdx = []; // indices sorted by x
  let actions = [];
  let actionIndex = 0;
  let autoTimer = null;
  let bestDistance = Infinity;
  let bestPair = null;
  let activeLine = null;
  let codeVisible = false;
  const highlights = { splitX: null, strip: null, pair: null, seg: null };
  const locals = { l: null, r: null, m: null, midx: null, dL: null, dR: null, d: null };

  // Utils
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(i, j) { const p = points[i], q = points[j]; const dx = p.x - q.x, dy = p.y - q.y; return Math.hypot(dx, dy); }
  function randPoints(n) {
    const out = []; const used = new Set();
    while (out.length < n) {
      const x = Math.random(); const y = Math.random();
      const key = ((x*1000)|0)+","+((y*1000)|0);
      if (!used.has(key)) { used.add(key); out.push({ x, y, id: out.length }); }
    }
    return out;
  }

  // Render
  function renderPlane() {
    if (!planeEl) return;
    const w = planeEl.clientWidth || 800; const h = planeEl.clientHeight || 360;
    planeEl.innerHTML = "";
    // split and strip overlays
    if (highlights.splitX !== null) {
      const xpx = Math.round(highlights.splitX * w);
      const sl = document.createElement("div"); sl.className = "split-line"; sl.style.left = xpx + "px"; planeEl.appendChild(sl);
    }
    if (highlights.strip) {
      const left = Math.round(highlights.strip.left * w);
      const right = Math.round(highlights.strip.right * w);
      const st = document.createElement("div"); st.className = "strip"; st.style.left = left + "px"; st.style.width = Math.max(0, right-left) + "px"; planeEl.appendChild(st);
    }
    // points
    for (let i = 0; i < points.length; i++) {
      const p = points[i]; const el = document.createElement("div");
      el.className = "pt";
      if (highlights.pair && (highlights.pair[0] === i || highlights.pair[1] === i)) el.classList.add("compare");
      if (bestPair && (bestPair[0] === i || bestPair[1] === i)) el.classList.add("best");
      el.style.left = Math.round(p.x * w) + "px"; el.style.top = Math.round(p.y * h) + "px";
      planeEl.appendChild(el);
    }
  }
  function highlightLine(n) {
    if (!pcEl) return; if (activeLine === n) return; pcEl.querySelectorAll(".line").forEach((el) => el.classList.remove("active"));
    const target = pcEl.querySelector('.line[data-line="' + n + '"]'); if (target) target.classList.add("active"); activeLine = n;
  }
  function renderLocals(partial) { if (partial && typeof partial === "object") Object.assign(locals, partial); if (!localsEl) return; const keys = ["l","r","m","midx","dL","dR","d"]; const items=[]; for (const k of keys){ if (locals[k]!==undefined && locals[k]!==null){ items.push('<span class="kv"><strong>'+k+'</strong>: '+locals[k]+'</span>'); } } localsEl.innerHTML = items.join(" "); }

  // Actions builder
  function buildActionsClosest(px) {
    const acts = [];
    function solve(l, r) {
      acts.push({ type: "seg", l, r });
      const n = r - l;
      if (n <= 3) {
        // brute force on this segment
        let bd = Infinity;
        for (let i = l; i < r; i++) {
          for (let j = i + 1; j < r; j++) {
            const di = dist(px[i], px[j]);
            acts.push({ type: "basePair", i: px[i], j: px[j], d: di, l, r });
            if (di < bd) bd = di;
          }
        }
        acts.push({ type: "done", l, r, best: bd });
        return bd;
      }
      const m = (l + r) >> 1;
      const midx = points[px[m]].x;
      acts.push({ type: "split", l, r, m, midx });
      const dL = solve(l, m);
      acts.push({ type: "afterCall", which: "L", l, r });
      const dR = solve(m, r);
      acts.push({ type: "afterCall", which: "R", l, r });
      let d = Math.min(dL, dR);
      acts.push({ type: "initstrip", l, r, m, midx, d });
      // Build strip indices
      const strip = [];
      for (let i = l; i < r; i++) { if (Math.abs(points[px[i]].x - midx) < d) strip.push(px[i]); }
      // sort strip by y
      strip.sort((a,b) => points[a].y - points[b].y);
      // compare up to 7 neighbors
      for (let i = 0; i < strip.length; i++) {
        for (let j = i + 1; j < strip.length && j <= i + 7; j++) {
          const di = dist(strip[i], strip[j]); const improves = di < d;
          acts.push({ type: "compareStrip", p: strip[i], q: strip[j], d: di, improves, l, r, midx });
          if (improves) d = di;
        }
      }
      acts.push({ type: "done", l, r, best: d });
      return d;
    }
    solve(0, px.length);
    return acts;
  }

  // Playback
  function startAuto() { if (autoTimer) return; const delay = clamp(Number(speedRange.value)||500, 100, 1500); autoBtn.textContent = "⏸ Pause"; autoTimer = setInterval(() => { if (!stepOnce()) stopAuto(); }, delay); }
  function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } autoBtn.textContent = "▶ Auto"; }

  function stepOnce() {
    if (actionIndex >= actions.length) return false;
    const act = actions[actionIndex++]; stepEl.textContent = String(actionIndex);
    if (act.type === "seg") {
      highlights.seg = { l: act.l, r: act.r }; highlights.splitX = null; highlights.strip = null; highlights.pair = null;
      renderLocals({ l: act.l, r: act.r }); highlightLine(2);
    } else if (act.type === "basePair") {
      highlights.pair = [act.i, act.j];
      if (bestPair === null || act.d < bestDistance) { bestDistance = act.d; bestPair = [act.i, act.j]; }
      else { bestDistance = Math.min(bestDistance, act.d); }
      bestEl.textContent = bestDistance.toFixed(4);
      renderLocals({ d: bestDistance }); highlightLine(2);
    } else if (act.type === "split") {
      highlights.splitX = act.midx; renderLocals({ m: act.m, midx: act.midx }); highlightLine(3);
    } else if (act.type === "afterCall") {
      // no-op
    } else if (act.type === "initstrip") {
      const w = planeEl.clientWidth || 800; const left = act.midx - act.d; const right = act.midx + act.d;
      highlights.strip = { left: Math.max(0, left), right: Math.min(1, right) }; renderLocals({ d: act.d }); highlightLine(8);
    } else if (act.type === "compareStrip") {
      highlights.pair = [act.p, act.q]; if (act.improves) { bestDistance = act.d; bestPair = [act.p, act.q]; bestEl.textContent = bestDistance.toFixed(4); }
      renderLocals({ d: bestDistance }); highlightLine(act.improves ? 11 : 10);
    } else if (act.type === "done") {
      bestDistance = Math.min(bestDistance, act.best);
      bestEl.textContent = bestDistance.toFixed(4);
      renderLocals({ d: bestDistance }); highlightLine(12);
    }
    renderPlane();
    return actionIndex < actions.length;
  }

  function stepOver() {
    if (actionIndex >= actions.length) return false;
    // Jump to initstrip for current segment
    let segL = null, segR = null;
    const next = actions[actionIndex];
    if (next && typeof next.l === "number" && typeof next.r === "number") { segL = next.l; segR = next.r; }
    else if (highlights.seg) { segL = highlights.seg.l; segR = highlights.seg.r; }
    if (segL === null || segR === null) return stepOnce();
    let targetIndex = -1;
    for (let i = actionIndex; i < actions.length; i++) {
      const a = actions[i];
      if (a.type === "initstrip" && a.l === segL && a.r === segR) { targetIndex = i; break; }
      if (a.type === "done" && a.l === segL && a.r === segR) { targetIndex = -1; break; }
    }
    if (targetIndex === -1) return stepOnce();
    stopAuto(); while (actionIndex < targetIndex) { if (!stepOnce()) break; } return stepOnce();
  }

  // Wire UI
  nRange.addEventListener("input", () => { nNum.value = nRange.value; regenRandom(); });
  nNum.addEventListener("change", () => { nRange.value = nNum.value; regenRandom(); });
  function regenRandom() {
    const n = clamp(Number(nRange.value)||20, 2, 60); points = randPoints(n);
    // build x-sorted idx
    pxIdx = points.map((_, idx) => idx).sort((a,b) => points[a].x - points[b].x);
    actions = buildActionsClosest(pxIdx.slice()); actionIndex = 0; bestDistance = Infinity; bestPair = null; stepEl.textContent = "0"; activeLine = null;
    highlightLine(1); renderPlane(); renderLocals({ l: null, r: null, d: null, m: null, midx: null }); bestEl.textContent = "∞";
  }
  randomBtn.addEventListener("click", regenRandom);
  resetBtn.addEventListener("click", regenRandom);
  stepBtn.addEventListener("click", () => { if (!stepOnce()) stopAuto(); });
  stepOverBtn.addEventListener("click", () => { if (!stepOver()) stopAuto(); });
  autoBtn.addEventListener("click", () => { if (autoTimer) stopAuto(); else startAuto(); });
  speedRange.addEventListener("change", () => { if (autoTimer) { stopAuto(); startAuto(); } });

  if (pcToggle && gridEl && pcPanelEl) {
    pcToggle.addEventListener("click", () => {
      codeVisible = !codeVisible;
      if (codeVisible) { pcPanelEl.style.display = "block"; gridEl.classList.remove("full"); pcToggle.textContent = "📜 Hide Code"; }
      else { pcPanelEl.style.display = "none"; gridEl.classList.add("full"); pcToggle.textContent = "📜 Show Code"; }
    });
  }

  // Init
  if (pcPanelEl && gridEl) { pcPanelEl.style.display = "none"; gridEl.classList.add("full"); }
  codeVisible = false;
  regenRandom();
})();
