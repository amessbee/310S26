// Karatsuba Multiplication Visualizer — clean build
(function () {
  // DOM
  const rowXEl = document.getElementById("rowX");
  const rowYEl = document.getElementById("rowY");
  const barsEl = document.getElementById("bars");
  const resEl = document.getElementById("res-out");
  const stepEl = document.getElementById("step-count");
  const digitsRange = document.getElementById("digits");
  const digitsNum = document.getElementById("digitsNum");
  const xInput = document.getElementById("xInput");
  const yInput = document.getElementById("yInput");
  const randomBtn = document.getElementById("randomK");
  const resetBtn = document.getElementById("resetK");
  const stepBtn = document.getElementById("stepK");
  const stepOverBtn = document.getElementById("stepOverK");
  const autoBtn = document.getElementById("autoK");
  const speedRange = document.getElementById("speed");
  const pcEl = document.getElementById("pcK");
  const gridEl = document.getElementById("grid");
  const pcPanelEl = document.getElementById("pcPanel");
  const pcToggle = document.getElementById("pcToggle");
  const localsEl = document.getElementById("locals");

  // State
  let xDigits = [];
  let yDigits = [];
  let actions = [];
  let actionIndex = 0;
  let autoTimer = null;
  let activeLine = null;
  let codeVisible = false;
  const highlights = { splitM: null, segN: null, phase: null };
  const locals = {
    n: null,
    m: null,
    xL: null,
    xR: null,
    yL: null,
    yR: null,
    z0: null,
    z1: null,
    z2: null,
  };

  // Utils
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function toDigits(n, padN) {
    const s = String(n);
    const arr = s.split("").map((d) => Number(d));
    if (padN && arr.length < padN) {
      const prefix = Array(padN - arr.length).fill(0);
      return prefix.concat(arr);
    }
    return arr;
  }
  function fromDigits(arr) {
    return Number(arr.join(""));
  }
  function addDigits(a, b) {
    const n = Math.max(a.length, b.length);
    const A = a.slice();
    const B = b.slice();
    while (A.length < n) A.unshift(0);
    while (B.length < n) B.unshift(0);
    const out = [];
    let carry = 0;
    for (let i = n - 1; i >= 0; i--) {
      const s = A[i] + B[i] + carry;
      out.unshift(s % 10);
      carry = Math.floor(s / 10);
    }
    if (carry) out.unshift(carry);
    return out;
  }
  function splitDigits(arr, m) {
    const n = arr.length;
    const low = arr.slice(n - m);
    const high = arr.slice(0, n - m);
    return { high, low };
  }

  // Render
  function renderBars() {
    if (!rowXEl || !rowYEl) return;
    function renderRow(rowEl, digits, splitM) {
      rowEl.innerHTML = "";
      const maxV = Math.max(...digits, 1);
      digits.forEach((d, idx) => {
        const h = Math.max(8, (d / maxV) * 140);
        const el = document.createElement("div");
        el.className = "bar";
        el.style.height = h + "px";
        const lab = document.createElement("div");
        lab.className = "label";
        lab.textContent = String(d);
        el.appendChild(lab);
        rowEl.appendChild(el);
      });
      // split overlay
      if (typeof splitM === "number") {
        const seg = document.createElement("div");
        seg.className = "segment";
        const n = digits.length;
        const leftPct = ((n - splitM) / n) * 100;
        const widthPct = (splitM / n) * 100;
        const box = document.createElement("div");
        box.className = "range";
        box.style.left = leftPct + "%";
        box.style.width = "calc(" + widthPct + "% - 6px)";
        seg.appendChild(box);
        rowEl.appendChild(seg);
      }
    }
    renderRow(rowXEl, xDigits, highlights.splitM);
    renderRow(rowYEl, yDigits, highlights.splitM);
  }
  function highlightLine(n) {
    if (!pcEl) return;
    if (activeLine === n) return;
    pcEl
      .querySelectorAll(".line")
      .forEach((el) => el.classList.remove("active"));
    const target = pcEl.querySelector('.line[data-line="' + n + '"]');
    if (target) target.classList.add("active");
    activeLine = n;
  }
  function renderLocals(partial) {
    if (partial && typeof partial === "object") Object.assign(locals, partial);
    if (!localsEl) return;
    const keys = ["n", "m", "xL", "xR", "yL", "yR", "z0", "z1", "z2"];
    const items = [];
    for (const k of keys) {
      if (locals[k] !== undefined && locals[k] !== null) {
        items.push(
          '<span class="kv"><strong>' +
            k +
            "</strong>: " +
            locals[k] +
            "</span>",
        );
      }
    }
    localsEl.innerHTML = items.join(" ");
  }

  // Actions builder
  function buildActionsKaratsuba(xArr, yArr) {
    const acts = [];
    function kMult(xD, yD) {
      const n = Math.max(xD.length, yD.length);
      // normalize to same length
      while (xD.length < n) xD.unshift(0);
      while (yD.length < n) yD.unshift(0);
      acts.push({ type: "seg", n });
      if (n === 1) {
        const prod = xD[0] * yD[0];
        acts.push({ type: "base", x: xD[0], y: yD[0], prod });
        return [prod];
      }
      const m = Math.floor(n / 2);
      acts.push({ type: "split", m });
      const { high: xL, low: xR } = splitDigits(xD, m);
      const { high: yL, low: yR } = splitDigits(yD, m);
      acts.push({ type: "call", which: "z0", m });
      const z0 = kMult(xR.slice(), yR.slice());
      acts.push({ type: "afterCall", which: "z0" });
      acts.push({ type: "call", which: "z2", m });
      const z2 = kMult(xL.slice(), yL.slice());
      acts.push({ type: "afterCall", which: "z2" });
      const xSum = addDigits(xL, xR);
      const ySum = addDigits(yL, yR);
      acts.push({ type: "call", which: "z1" });
      const z1raw = kMult(xSum.slice(), ySum.slice());
      acts.push({ type: "afterCall", which: "z1" });
      acts.push({
        type: "combine",
        m,
        z0: fromDigits(z0),
        z2: fromDigits(z2),
        z1raw: fromDigits(z1raw),
      });
      // z1 = z1raw - z0 - z2
      const z1 = fromDigits(z1raw) - fromDigits(z0) - fromDigits(z2);
      const res =
        fromDigits(z2) * Math.pow(10, 2 * m) +
        z1 * Math.pow(10, m) +
        fromDigits(z0);
      acts.push({ type: "result", value: res });
      return toDigits(res);
    }
    kMult(xArr.slice(), yArr.slice());
    return acts;
  }

  // Playback
  function startAuto() {
    if (autoTimer) return;
    const delay = clamp(Number(speedRange.value) || 500, 100, 1500);
    autoBtn.textContent = "⏸ Pause";
    autoTimer = setInterval(() => {
      if (!stepOnce()) stopAuto();
    }, delay);
  }
  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    autoBtn.textContent = "▶ Auto";
  }

  function stepOnce() {
    if (actionIndex >= actions.length) return false;
    const act = actions[actionIndex++];
    stepEl.textContent = String(actionIndex);
    if (act.type === "seg") {
      highlights.segN = act.n;
      highlights.splitM = null;
      resEl.textContent = "";
      renderLocals({ n: act.n, m: null, z0: null, z1: null, z2: null });
      highlightLine(2);
    } else if (act.type === "base") {
      renderLocals({ n: 1, m: 0 });
      highlightLine(3);
      resEl.textContent = String(act.prod);
    } else if (act.type === "split") {
      highlights.splitM = act.m;
      renderLocals({ m: act.m });
      highlightLine(4);
    } else if (act.type === "call") {
      const lineMap = { z0: 7, z2: 8, z1: 9 };
      highlightLine(lineMap[act.which] || 7);
    } else if (act.type === "afterCall") {
      // noop visual, locals updated during combine
    } else if (act.type === "combine") {
      renderLocals({ z0: act.z0, z2: act.z2 });
      highlightLine(10);
    } else if (act.type === "result") {
      resEl.textContent = String(act.value);
      renderLocals({ z1: null });
      highlightLine(10);
    }
    renderBars();
    return actionIndex < actions.length;
  }

  function stepOver() {
    if (actionIndex >= actions.length) return false;
    // Jump to combine for current segment
    let targetIndex = -1;
    for (let i = actionIndex; i < actions.length; i++) {
      const a = actions[i];
      if (a.type === "combine") {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex === -1) return stepOnce();
    stopAuto();
    while (actionIndex < targetIndex) {
      if (!stepOnce()) break;
    }
    return stepOnce();
  }

  // Wire UI
  digitsRange.addEventListener("input", () => {
    digitsNum.value = digitsRange.value;
    regenRandom();
  });
  digitsNum.addEventListener("change", () => {
    digitsRange.value = digitsNum.value;
    regenRandom();
  });
  function regenRandom() {
    const d = clamp(Number(digitsRange.value) || 6, 1, 12);
    const xMax = Math.pow(10, d) - 1;
    const yMax = xMax;
    const x = Math.floor(Math.random() * xMax);
    const y = Math.floor(Math.random() * yMax);
    xInput.value = String(x);
    yInput.value = String(y);
    resetAll();
  }
  randomBtn.addEventListener("click", regenRandom);
  resetBtn.addEventListener("click", resetAll);
  stepBtn.addEventListener("click", () => {
    if (!stepOnce()) stopAuto();
  });
  stepOverBtn.addEventListener("click", () => {
    if (!stepOver()) stopAuto();
  });
  autoBtn.addEventListener("click", () => {
    if (autoTimer) stopAuto();
    else startAuto();
  });
  speedRange.addEventListener("change", () => {
    if (autoTimer) {
      stopAuto();
      startAuto();
    }
  });

  if (pcToggle && gridEl && pcPanelEl) {
    pcToggle.addEventListener("click", () => {
      codeVisible = !codeVisible;
      if (codeVisible) {
        pcPanelEl.style.display = "block";
        gridEl.classList.remove("full");
        pcToggle.textContent = "📜 Hide Code";
      } else {
        pcPanelEl.style.display = "none";
        gridEl.classList.add("full");
        pcToggle.textContent = "📜 Show Code";
      }
    });
  }

  function resetAll() {
    const d = clamp(Number(digitsRange.value) || 6, 1, 12);
    const x = clamp(Number(xInput.value) || 0, 0, Math.pow(10, d) - 1);
    const y = clamp(Number(yInput.value) || 0, 0, Math.pow(10, d) - 1);
    xDigits = toDigits(x, d);
    yDigits = toDigits(y, d);
    actions = buildActionsKaratsuba(xDigits.slice(), yDigits.slice());
    actionIndex = 0;
    resEl.textContent = "";
    stepEl.textContent = "0";
    highlights.splitM = null;
    activeLine = null;
    highlightLine(1);
    renderBars();
    renderLocals({
      n: Math.max(xDigits.length, yDigits.length),
      m: null,
      z0: null,
      z1: null,
      z2: null,
    });
  }

  // Init
  if (pcPanelEl && gridEl) {
    pcPanelEl.style.display = "none";
    gridEl.classList.add("full");
  }
  codeVisible = false;
  regenRandom();
})();
