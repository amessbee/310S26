// Inversion Counting Visualizer (Divide & Conquer) — clean build
(function () {
  // DOM
  const barsEl = document.getElementById("bars");
  const invEl = document.getElementById("inv-count");
  const stepEl = document.getElementById("step-count");
  const sizeRange = document.getElementById("size");
  const sizeNum = document.getElementById("sizeNum");
  const randomBtn = document.getElementById("random");
  const resetBtn = document.getElementById("reset");
  const stepBtn = document.getElementById("step");
  const stepOverBtn = document.getElementById("stepOver");
  const autoBtn = document.getElementById("auto");
  const speedRange = document.getElementById("speed");
  const pcEl = document.getElementById("pc");
  const localsEl = document.getElementById("locals");

  // State
  let baseArray = [];
  let array = [];
  let actions = [];
  let actionIndex = 0;
  let inversionCount = 0;
  let autoTimer = null;
  let lastHighlights = { compare: [], write: -1, seg: null };
  let activeLine = null;
  let currentMerge = null; // { l, r, m, k }
  const locals = { l: null, r: null, m: null, i: null, j: null, k: null, inv: 0, "Δinv": null };

  // UI helpers
  function highlightLine(n) {
    if (!pcEl) return;
    if (activeLine === n) return;
    pcEl.querySelectorAll(".line").forEach((el) => el.classList.remove("active"));
    const target = pcEl.querySelector('.line[data-line="' + n + '"]');
    if (target) target.classList.add("active");
    activeLine = n;
  }

  function renderLocals(partial) {
    if (partial && typeof partial === "object") Object.assign(locals, partial);
    if (!localsEl) return;
    const keys = ["l", "r", "m", "i", "j", "k", "inv", "Δinv"];
    const items = [];
    for (const k of keys) {
      if (locals[k] !== undefined && locals[k] !== null) {
        items.push('<span class="kv"><strong>' + k + '</strong>: ' + locals[k] + '</span>');
      }
    }
    localsEl.innerHTML = items.join(" ");
  }

  // Data helpers
  function randArray(n) {
    const arr = [];
    const used = new Set();
    while (arr.length < n) {
      const v = Math.floor(Math.random() * 99) + 1;
      if (!used.has(v)) { used.add(v); arr.push(v); }
    }
    return arr;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Render
  function renderBars() {
    if (!barsEl) return;
    const maxV = Math.max(...array, 1);
    barsEl.innerHTML = "";
    array.forEach((v, idx) => {
      const h = Math.max(8, (v / maxV) * 300);
      const d = document.createElement("div");
      d.className = "bar";
      d.style.height = h + "px";
      if (lastHighlights.compare.includes(idx)) d.classList.add("compare");
      if (lastHighlights.write === idx) d.classList.add("write");
      const lab = document.createElement("div");
      lab.className = "label";
      lab.textContent = String(v);
      d.appendChild(lab);
      barsEl.appendChild(d);
    });
    const seg = document.createElement("div");
    seg.className = "segment";
    if (lastHighlights.seg) {
      const { l, r } = lastHighlights.seg;
      const total = array.length;
      const leftPct = (l / total) * 100;
      const widthPct = ((r - l) / total) * 100;
      const box = document.createElement("div");
      box.className = "range";
      box.style.left = leftPct + "%";
      box.style.width = 'calc(' + widthPct + '% - 6px)';
      seg.appendChild(box);
    }
    barsEl.appendChild(seg);
  }

  function resetHighlights() {
    lastHighlights.compare = [];
    lastHighlights.write = -1;
    lastHighlights.seg = null;
  }

  function setSize(n, regen = true) {
    const nn = clamp(Number(n) || 10, 2, 30);
    sizeRange.value = String(nn);
    sizeNum.value = String(nn);
    if (regen) { baseArray = randArray(nn); resetAll(baseArray); }
  }

  function resetAll(src) {
    stopAuto();
    array = src.slice();
    inversionCount = 0;
    actionIndex = 0;
    actions = buildActions(src.slice());
    invEl.textContent = String(inversionCount);
    stepEl.textContent = String(actionIndex);
    resetHighlights();
    currentMerge = null;
    Object.assign(locals, { l: null, r: null, m: null, i: null, j: null, k: null, inv: 0, "Δinv": null });
    renderLocals();
    highlightLine(2);
    renderBars();
  }

  // Playback
  function startAuto() {
    if (autoTimer) return;
    const delay = clamp(Number(speedRange.value) || 500, 100, 1500);
    autoBtn.textContent = "⏸ Pause";
    autoTimer = setInterval(() => { if (!stepOnce()) stopAuto(); }, delay);
  }
  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    autoBtn.textContent = "▶ Auto";
  }

  // Step engine
  function stepOnce() {
    if (actionIndex >= actions.length) return false;
    const act = actions[actionIndex++];
    stepEl.textContent = String(actionIndex);
    resetHighlights();

    if (act.type === "seg") {
      lastHighlights.seg = { l: act.l, r: act.r };
      locals.l = act.l; locals.r = act.r; locals.m = Math.floor((act.l + act.r) / 2);
      locals.i = locals.j = locals.k = null; locals["Δinv"] = null; locals.inv = inversionCount;
      renderLocals();
      highlightLine(5);
    } else if (act.type === "base") {
      lastHighlights.seg = { l: act.l, r: act.r };
      locals.l = act.l; locals.r = act.r; locals.m = Math.floor((act.l + act.r) / 2);
      locals.i = locals.j = locals.k = null; locals["Δinv"] = null; locals.inv = inversionCount;
      renderLocals();
      highlightLine(4);
    } else if (act.type === "call") {
      lastHighlights.seg = { l: act.l, r: act.r };
      locals.l = act.l; locals.r = act.r; locals.m = Math.floor((act.l + act.r) / 2);
      locals.i = locals.j = locals.k = null; locals["Δinv"] = null; locals.inv = inversionCount;
      renderLocals();
      if (act.which === "L") highlightLine(6); else highlightLine(7);
    } else if (act.type === "afterCall") {
      lastHighlights.seg = { l: act.l, r: act.r };
      locals.l = act.l; locals.r = act.r; locals.m = Math.floor((act.l + act.r) / 2);
      locals.i = locals.j = locals.k = null; locals["Δinv"] = null; locals.inv = inversionCount;
      renderLocals();
      if (act.which === "L") highlightLine(7); else highlightLine(8);
    } else if (act.type === "initmerge") {
      lastHighlights.seg = { l: act.l, r: act.r };
      currentMerge = { l: act.l, r: act.r, m: Math.floor((act.l + act.r) / 2), k: act.l };
      locals.l = act.l; locals.r = act.r; locals.m = currentMerge.m; locals.i = act.l; locals.j = currentMerge.m; locals.k = act.l; locals["Δinv"] = null; locals.inv = inversionCount;
      renderLocals();
      highlightLine(8);
    } else if (act.type === "compare") {
      lastHighlights.compare = [act.i, act.j];
      lastHighlights.seg = { l: act.l, r: act.r };
      if (currentMerge && currentMerge.l === act.l && currentMerge.r === act.r) locals.k = currentMerge.k;
      locals.i = act.i; locals.j = act.j; locals["Δinv"] = null; locals.inv = inversionCount;
      renderLocals();
      highlightLine(9);
    } else if (act.type === "write") {
      array[act.k] = act.value;
      lastHighlights.write = act.k;
      lastHighlights.seg = { l: act.l, r: act.r };
      if (act.invDelta) { inversionCount += act.invDelta; invEl.textContent = String(inversionCount); }
      if (currentMerge && currentMerge.l === act.l && currentMerge.r === act.r) currentMerge.k = act.k + 1;
      locals.k = act.k; locals["Δinv"] = act.invDelta || null; locals.inv = inversionCount;
      if (act.tail === "L") highlightLine(12);
      else if (act.tail === "R") highlightLine(13);
      else if (act.invDelta && act.invDelta > 0) highlightLine(11);
      else highlightLine(10);
      renderLocals();
    } else if (act.type === "done") {
      lastHighlights.seg = { l: act.l, r: act.r };
      if (currentMerge && currentMerge.l === act.l && currentMerge.r === act.r) currentMerge = null;
      locals.i = locals.j = locals.k = null; locals["Δinv"] = null; locals.inv = inversionCount; renderLocals();
      highlightLine(14);
    }

    renderBars();
    return actionIndex < actions.length;
  }

  function stepOver() {
    if (actionIndex >= actions.length) return false;
    const next = actions[actionIndex];
    if (next && next.type === "call") {
      let target = -1;
      for (let i = actionIndex; i < actions.length; i++) {
        const a = actions[i];
        if (a.type === "afterCall" && a.l === next.l && a.r === next.r && a.which === next.which) {
          target = i; break;
        }
      }
      if (target !== -1) { stopAuto(); actionIndex = target; return stepOnce(); }
    }
    return stepOnce();
  }

  // Build action trace for mergesort inversion counting
  function buildActions(a) {
    const acts = [];
    function mergeSort(l, r) {
      if (r - l <= 1) { acts.push({ type: "base", l, r }); return a.slice(l, r); }
      const m = Math.floor((l + r) / 2);
      acts.push({ type: "seg", l, r });
      acts.push({ type: "call", l, r, which: "L" });
      const L = mergeSort(l, m);
      acts.push({ type: "afterCall", l, r, which: "L" });
      acts.push({ type: "call", l, r, which: "R" });
      const R = mergeSort(m, r);
      acts.push({ type: "afterCall", l, r, which: "R" });
      let i = 0, j = 0, k = l;
      acts.push({ type: "initmerge", l, r });
      while (i < L.length && j < R.length) {
        acts.push({ type: "compare", l, r, i: l + i, j: m + j, vi: L[i], vj: R[j] });
        if (L[i] <= R[j]) { acts.push({ type: "write", l, r, k, value: L[i], invDelta: 0, tail: null }); a[k++] = L[i++]; }
        else { const invDelta = L.length - i; acts.push({ type: "write", l, r, k, value: R[j], invDelta, tail: null }); a[k++] = R[j++]; }
      }
      while (i < L.length) { acts.push({ type: "write", l, r, k, value: L[i], invDelta: 0, tail: "L" }); a[k++] = L[i++]; }
      while (j < R.length) { acts.push({ type: "write", l, r, k, value: R[j], invDelta: 0, tail: "R" }); a[k++] = R[j++]; }
      acts.push({ type: "done", l, r });
      return a.slice(l, r);
    }
    mergeSort(0, a.length);
    return acts;
  }

  // Wire UI
  sizeRange.addEventListener("input", () => setSize(sizeRange.value));
  sizeNum.addEventListener("change", () => setSize(sizeNum.value));
  randomBtn.addEventListener("click", () => { baseArray = randArray(Number(sizeRange.value) || 10); resetAll(baseArray); });
  resetBtn.addEventListener("click", () => resetAll(baseArray));
  stepBtn.addEventListener("click", () => { if (!stepOnce()) stopAuto(); });
  if (stepOverBtn) stepOverBtn.addEventListener("click", () => { if (!stepOver()) stopAuto(); });
  autoBtn.addEventListener("click", () => { if (autoTimer) stopAuto(); else startAuto(); });
  speedRange.addEventListener("change", () => { if (autoTimer) { stopAuto(); startAuto(); } });

  // Init
  setSize(10, true);
})();
