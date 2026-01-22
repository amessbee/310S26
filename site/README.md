# CS310/5102 Course Website

A lightweight static website to share lecture notes, plans, announcements, syllabus, office hours, staff info, and resources.

## Structure

- `index.html` — Home and overview
- `syllabus.html` — Grading, scale, policies
- `schedule.html` — Weekly breakdown + review topics
- `lectures.html` — Plans + student-created notes
- `announcements.html` — Dynamic announcements from `data/announcements.json`
- `staff.html` — Instructor, co-instructor, TAs (from `data/staff.json`)
- `contact.html` — Slack, office hours, email guidance
- `assets/css/style.css` — Shared styling
- `assets/js/main.js` — Renders data-driven sections
- `data/` — JSON data for announcements, staff, schedule, lectures
- `resources/notes/` — Place PDFs or links for lecture notes
- `resources/slides/` — Place PDFs for slides

## Run locally (macOS)

From the `site` folder:

```bash
python3 -m http.server 5500
```

Then open: http://localhost:5500

## Updating content

- Announcements: edit `data/announcements.json`
- Staff list: edit `data/staff.json`
- Schedule: edit `data/schedule.json`
- Lecture plans/notes: edit `data/lectures.json`
  - Notes entries: set `link` to path like `resources/notes/week1-notes.pdf`
  - Slides entries: set `link` to path like `resources/slides/week1-slides.pdf`

## Images

Place any staff/TA or course images under `assets/img/` and reference them in pages as needed. Ensure you have rights to use any image you add.
