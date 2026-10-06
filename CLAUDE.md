# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview

A single-page website that presents a course syllabus to students. One page
(`index.html`) holds every section: course overview, instructor and office
hours, schedule, assignments and grading, and course policies. The audience is
students on any device, so the page must be fast, readable, and accessible.

## Tech stack

- Plain HTML, CSS, and vanilla JavaScript. No framework and no build step.
- Course content lives in data files (`data/*.json`) and is rendered into the
  page, so updating the syllabus never requires editing markup.
- Deployable as static files (GitHub Pages, Netlify, or any web server).

Do not add a framework, bundler, or npm dependency without asking first.

## Project structure

```
index.html             The whole site: header, in-page nav, and all sections
css/styles.css         All site styles; color and spacing tokens defined on :root
js/main.js             Loads data files and renders each section
data/course.json       Course metadata, meeting times, instructor info, office hours
data/schedule.json     Weekly schedule entries
data/assignments.json  Assignments, weights, grading criteria, scale, and notes
data/policies.json     Late work, attendance, academic integrity, accessibility
assets/                Images, PDFs (e.g. a printable syllabus)
assets/README.md       Notes on expected assets (syllabus.pdf is linked from the page)
.claude/launch.json    Local preview server config (python http.server on 8000)
```

Keep this section up to date as files are added or renamed. Do not split the
site into multiple HTML pages without asking first.

## Page layout

- Each part of the syllabus is a `<section>` with a stable `id` and an `<h2>`:
  `overview`, `instructor`, `schedule`, `assignments`, `policies`.
- A `<nav>` near the top links to each section by anchor (`#schedule`, etc.).
  If the nav is sticky, give sections `scroll-margin-top` so headings are not
  hidden under it.
- Include a "Skip to main content" link as the first focusable element.
- Use `scroll-behavior: smooth` only inside
  `@media (prefers-reduced-motion: no-preference)`.
- In the schedule, highlight the current week (computed from today's date)
  so students can find it quickly.

## Running locally

`fetch()` of JSON files does not work from `file://`, so serve the folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Content conventions

- Dates use ISO format in data files (`2026-01-15`) and are formatted for
  display in JavaScript. Show the weekday with due dates (e.g. "Thu, Jan 15").
- Grading weights in `assignments.json` must sum to 100%. Check this whenever
  weights change.
- Every schedule entry has: `week`, `date`, `topic`, `readings`, `due`.
- Never invent course details (dates, policies, names, grading). If information
  is missing, leave a clearly marked `TODO:` placeholder and tell the user.

## Design and accessibility

- Mobile first; no horizontal scrolling at 320px wide. Let wide tables (the
  schedule) scroll inside their own container rather than the page.
- Semantic HTML: exactly one `<h1>` (the course title), an `<h2>` per section,
  ordered headings below that, `<nav>`, `<main>`, and a `<table>` with
  `<th scope>` for the schedule.
- Meet WCAG 2.1 AA: sufficient color contrast, visible focus styles, alt text
  on images, link text that makes sense out of context.
- Support light and dark mode via `prefers-color-scheme`.
- Include a print stylesheet: hide the nav and skip link, print every section
  in order, and avoid breaking table rows across pages.
- The page should still show its core content if JavaScript fails: keep
  essential info (course title, instructor contact) in the static markup and
  add a `<noscript>` message linking to the printable PDF.

## Code style

- 2-space indentation; lowercase, hyphenated file and class names.
- Keep JavaScript small and dependency-free; prefer `const`, template literals,
  and `async`/`await`.
- One render function per section in `js/main.js` (e.g. `renderSchedule()`);
  a failure loading one data file should not blank the other sections.
- Escape any data inserted into HTML (use `textContent` rather than
  `innerHTML` for user-facing strings).

## Before finishing a change

1. Serve the site locally and check the page loads without console errors.
2. Check the layout at phone (320px) and desktop widths.
3. Click every nav link and confirm it jumps to its section with the heading
   visible; confirm all asset paths (CSS, JS, data, PDF) resolve.
