// CS310/5102 Course Website JS
(function () {
  const navToggle = document.getElementById("nav-toggle");
  const header = document.querySelector(".header");
  if (navToggle && header) {
    navToggle.addEventListener("click", () =>
      header.querySelector(".nav").classList.toggle("open"),
    );
  }

  // Theme toggle
  const themeBtn = document.getElementById("theme-toggle");
  const applyTheme = (t) => {
    const theme = t === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    if (themeBtn)
      themeBtn.textContent = theme === "light" ? "🌙 Dark" : "☀️ Light";
  };
  const storedTheme = localStorage.getItem("theme");
  applyTheme(storedTheme || "light");
  if (themeBtn)
    themeBtn.addEventListener("click", () => {
      const next =
        (localStorage.getItem("theme") || "dark") === "dark" ? "light" : "dark";
      applyTheme(next);
    });

  async function loadJSON(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Failed to load " + path);
      return await res.json();
    } catch (e) {
      console.warn("JSON load error:", e);
      return null;
    }
  }

  async function renderAnnouncements() {
    const el = document.getElementById("announcements-list");
    if (!el) return;
    const data = await loadJSON("data/announcements.json");
    if (!data || !data.items || !data.items.length) {
      el.innerHTML = '<p class="small">No announcements yet.</p>';
      return;
    }
    const autoLink = (text) => {
      if (!text) return "";
      const url = /(https?:\/\/[^\s]+)/g;
      return text.replace(url, (m) => `<a href="${m}">${m}</a>`);
    };
    const items = (data.items || [])
      .slice()
      .sort((a, b) => {
        const da = new Date(a.date);
        const db = new Date(b.date);
        if (!isNaN(db) && !isNaN(da)) return db - da; // newest first
        // Fallback: reverse lexicographic if date parse fails
        return String(b.date).localeCompare(String(a.date));
      })
      .map(
        (a) =>
          `<li><span class="kicker">${a.date}</span> — <strong>${a.title}</strong>: <span class="small">${autoLink(a.body)}</span></li>`,
      )
      .join("");
    el.innerHTML = `<ul class="list">${items}</ul>`;
  }

  async function renderStaff() {
    const el = document.getElementById("staff-list");
    if (!el) return;
    const data = await loadJSON("data/staff.json");
    if (!data) return;
    const mk = (role, items) => `
      <div class="card">
        <h3>${role}</h3>
        <ul class="list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>
      </div>`;
    el.innerHTML = `
      <div class="grid-2">
        ${mk("Instructor", [data.instructor.name + (data.instructor.affiliation ? " — " + data.instructor.affiliation : "")])}
        ${mk("Co-Instructor", [data.coInstructor])}
        ${mk("Teaching Assistants (Group A)", data.tas.slice(0, Math.ceil(data.tas.length / 2)))}
        ${mk("Teaching Assistants (Group B)", data.tas.slice(Math.ceil(data.tas.length / 2)))}
      </div>
    `;
  }

  async function renderSchedule() {
    const el = document.getElementById("schedule-table");
    if (!el) return;
    const data = await loadJSON("data/schedule.json");
    if (!data) return;
    el.innerHTML = `
      <table class="table">
        <thead><tr><th>Weeks 1–7</th><th>Weeks 8–14</th></tr></thead>
        <tbody>
          ${data.rows.map((r) => `<tr><td>${r.left}</td><td>${r.right}</td></tr>`).join("")}
        </tbody>
      </table>
    `;
  }

  async function renderLectures() {
    const materialsEl = document.getElementById("lecture-materials");
    const plansEl = document.getElementById("lecture-plans");
    if (!materialsEl && !plansEl) return;
    const data = await loadJSON("data/lectures.json");
    if (!data) return;
    if (materialsEl) {
      const notes = (data.notes || []).map((n) => ({
        date: n.date,
        title: n.title,
        notesLinks: n.link ? [n.link] : [],
      }));
      const slides = (data.slides || []).map((s) => ({
        date: s.date,
        title: s.title,
        slidesLinks: s.link ? [s.link] : [],
      }));
      const byDate = new Map();
      for (const n of notes) {
        byDate.set(n.date, {
          date: n.date,
          title: n.title,
          notesLinks: n.notesLinks,
          slidesLinks: [],
        });
      }
      for (const s of slides) {
        const existing = byDate.get(s.date);
        if (existing) {
          existing.slidesLinks = existing.slidesLinks.concat(s.slidesLinks);
          if (!existing.title) existing.title = s.title;
        } else {
          byDate.set(s.date, {
            date: s.date,
            title: s.title,
            notesLinks: [],
            slidesLinks: s.slidesLinks,
          });
        }
      }
      const combined = Array.from(byDate.values()).sort((a, b) =>
        a.date > b.date ? 1 : -1,
      );
      materialsEl.innerHTML = combined
        .map((item) => {
          const notesPart = item.notesLinks.length
            ? item.notesLinks
                .map(
                  (l, idx) =>
                    `<a href="${l}">Notes${item.notesLinks.length > 1 ? " " + (idx + 1) : ""}</a>`,
                )
                .join(", ")
            : '<span class="small">Notes pending</span>';
          const slidesPart = item.slidesLinks.length
            ? item.slidesLinks
                .map(
                  (l, idx) =>
                    `<a href="${l}">Slides${item.slidesLinks.length > 1 ? " " + (idx + 1) : ""}</a>`,
                )
                .join(", ")
            : '<span class="small">Slides pending</span>';
          return `
        <div class="card">
          <div class="kicker">${item.date}</div>
          <h3>${item.title}</h3>
          <p class="small">${notesPart} • ${slidesPart}</p>
        </div>`;
        })
        .join("");
    }
    if (plansEl && data.plans) {
      plansEl.innerHTML = data.plans
        .map(
          (p) => `
        <div class="card">
          <div class="kicker">${p.week}</div>
          <h3>${p.title}</h3>
          <p class="small">${p.summary || ""}</p>
        </div>
      `,
        )
        .join("");
    }
  }

  renderAnnouncements();
  renderStaff();
  renderSchedule();
  renderLectures();

  // Simple hash-based router for single-page tabs
  const sections = [
    "announcements",
    "lectures",
    "schedule",
    "syllabus",
    "staff",
    "contact",
    "misc",
    "home",
  ];
  function showSection(id) {
    const target = id && sections.includes(id) ? id : "home";
    // Update active nav state only; do not hide sections to allow free scrolling
    const navLinks = document.querySelectorAll(".nav ul li a");
    navLinks.forEach((a) => {
      const href = a.getAttribute("href") || "";
      const hash = href.startsWith("#") ? href.slice(1) : "";
      if (hash === target) a.classList.add("active");
      else a.classList.remove("active");
    });
    const targetEl = document.getElementById(target);
    if (targetEl) {
      const header = document.querySelector(".header");
      const headerHeight = header ? header.offsetHeight : 80;
      const y =
        targetEl.getBoundingClientRect().top +
        window.pageYOffset -
        headerHeight;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  // Intercept nav link clicks for consistent smooth scrolling
  document.querySelectorAll(".nav ul li a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#")) {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const id = href.slice(1);
        // Update URL without triggering default jump
        if (history.pushState) history.pushState(null, "", "#" + id);
        else location.hash = id;
        showSection(id);
      });
    }
  });
  window.addEventListener("hashchange", () =>
    showSection(location.hash.slice(1)),
  );
  showSection(location.hash.slice(1));
})();
