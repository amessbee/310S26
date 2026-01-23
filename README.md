# CS310/5102 Course Website

A lightweight static website to share lecture notes, plans, announcements, syllabus, office hours, staff info, and resources. The site is published via GitHub Pages here: [https://amessbee.github.io/310S26](https://amessbee.github.io/310S26)

## Structure (Single Page)

- `index.html` — Single-page site with sections: Home, Syllabus, Schedule, Lectures, Announcements, Staff, Contact (navigate via hash tabs)
- `assets/css/style.css` — Shared styling (dark/light themes, layout)
- `assets/js/main.js` — Hash router, smooth scrolling, data rendering
- `data/` — JSON data for announcements, staff, schedule, lectures
- `resources/notes/` — Place PDFs for lecture notes
- `resources/slides/` — Place PDFs for slides

## Run locally (macOS)

From the workspace root:

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

### Add homework

1. Place files under [resources/hw](resources/hw):
   - Add the `.tex` source and the compiled `.pdf` (e.g., `hw1.tex`, `hw1.pdf`).
   - Optional compile on macOS (if you have `pdflatex`):

     ```bash
     pdflatex -output-directory resources/hw resources/hw/hw1.tex
     ```

2. Add an announcement in [data/announcements.json](data/announcements.json):
   - Append a new item with `date` (YYYY-MM-DD), `title`, and `body`.
   - Use a full `http(s)` URL to the PDF so it auto-links, e.g.,

     ```json
     {
       "date": "2026-01-23",
       "title": "Homework 1 Released",
       "body": "Download: https://amessbee.github.io/310S26/resources/hw/hw1.pdf"
     }
     ```

   - Alternatively, you can include an HTML link in `body` for a site-relative path:

     ```json
     {
       "date": "2026-01-23",
       "title": "Homework 1 Released",
       "body": "<a href=\"/310S26/resources/hw/hw1.pdf\">HW1 PDF</a>"
     }
     ```

3. Publish: commit and push to `main`, then refresh the site (GitHub Pages will redeploy automatically).

4. Make announcements in LMS/Slack with the link to the homework.

## Publish on GitHub Pages (main branch)

- Push changes to the `main` branch of your GitHub repository.
- In GitHub: Settings → Pages → Build and deployment
  - Source: "Deploy from a branch"
  - Branch: `main`
  - Folder: `/` (root)
- Wait ~1–2 minutes for deployment. Your site will be available at:
  - `https://amessbee.github.io/310S26`
- Optional:
  - Add a custom domain under Settings → Pages → Custom domain.
  - Ensure HTTPS is enabled.
  - `.nojekyll` is included to prevent Jekyll processing.

## Images

Place any staff/TA or course images under `assets/img/` and reference them in pages as needed. Ensure you have rights to use any image you add.
