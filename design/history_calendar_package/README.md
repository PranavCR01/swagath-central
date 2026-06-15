# History — Calendar-first (Swagath Central)

A calendar-first redesign of the History page. Instead of scrolling a list, the owner
(Chaitanya) jumps straight to any date. Built mobile-first, dark theme. Populated with
**June 2026** (today = the 15th), both halls (Sandhya / Manasa), open & closed days.

## What's inside
- **`History Calendar Redesign (standalone).html`** — single self-contained file; double-click
  to open offline. Fully interactive.
- **`source/History Calendar Redesign.html`** — host page (loads the JSX below).
- **`source/history/history-data.jsx`** — sample data + lookup/currency helpers.
- **`source/history/history-calendar.jsx`** — the calendar page component.
- **`screenshots/`** — today selected; another day + Manasa filter.

## Layout (top → bottom)
1. **Header** — back arrow + "History" title, then **All / Sandhya / Manasa** filter tabs with
   live counts.
2. **Mini calendar** — compact month view, prev/next arrows (next is disabled past the current
   month). Each date cell carries a status dot: **amber = open**, **green = closed**, **empty =
   no data**. **Today** has an accent ring; the **selected** date has a filled amber background.
   Future dates are dimmed and non-tappable. A small legend sits under the grid.
3. **Selected day panel** — one row per theatre (colored dot, show count, sales, B.Cash,
   open/closed status, right arrow into the full report). Empty dates show *"No shows logged for
   this date."* A header line summarises the day (e.g. "Today · Monday, 15 Jun · 3 shows · ₹37,600").
4. **Recent** — the last 7 logged days, newest first, in the same row format; tapping a recent
   day's header re-selects it on the calendar and scrolls up.

## Behaviour notes
- The calendar's "today" is derived from the most recent date in the data, so the seed and the
  highlight never drift apart. (In production, wire this to the real current date.)
- Selecting a theatre filters every section — calendar dots, the day panel, and Recent — to that
  hall only.
- Defaults to today selected on load.

## Design spec (as built)
bg `#0a0a0f` · surface `#13131a` · border `rgba(255,255,255,.07)` · accent amber `#f59e0b` ·
closed green `#22c55e` · Sandhya dot `#f59e0b` · Manasa dot `#a78bfa` · muted `#6b7280`.
system-ui for labels, **JetBrains Mono** for all numbers.

> Source files are design references (React via in-browser Babel). To productionise, recreate in
> your real stack and swap the sample data for live records.
