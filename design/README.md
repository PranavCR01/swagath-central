# Handoff: Add Show — Ticket Types & Show Date

## Overview
This bundle documents the **Add Show** bottom sheet for **Theatre Ops** (Swagath Enterprises, a
two-screen cinema operation in Bengaluru). It focuses on the two most recent additions:

1. **Ticket-type breakdown** — three ticket classes (**Box / Gold / Silver**) that auto-compute
   **Total tickets** and **Occupancy %** against the theatre's seat capacity.
2. **Show date** — the ability to back-date an entry (e.g. logging yesterday's shows the next
   morning), with Today / Yesterday quick chips and a date picker.

The rest of the app (Login, Home, Day View, Show Entry, Day Close, Insights) is included as
context but is not the focus of this handoff.

## About the Design Files
The files in this bundle are **design references written in HTML/React-via-Babel** — runnable
prototypes that show the intended look and behavior. **They are not production code to copy
directly.** The task is to **recreate these designs in your target codebase** using its existing
framework, component library, and conventions (React, Vue, SwiftUI, Flutter, etc.). If no UI
environment exists yet, pick the framework that best fits the project and implement there.

The prototype uses inline-style React components transpiled in-browser by Babel. In a real
codebase you would replace inline styles with your styling system (CSS modules, Tailwind,
styled-components, native styles) and the ad-hoc state with your normal state layer.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interaction states are all final and
should be reproduced precisely. Exact values are in **Design Tokens** below.

---

## Screen: Add Show (bottom sheet)

### Purpose
Owner adds a new show to a theatre's day. Captures the showtime, movie, language, whether it's a
fan show, the per-class ticket counts, and (new) the date the show actually ran.

### Container / layout
- **Bottom sheet** that slides up from the bottom of the screen on mobile (375–430px).
- Sheet width = full device width. **Max height = 88%** of the frame; the body scrolls.
- Sheet background: vertical gradient `#1d1b28 → #16151f`; **top corners** rounded `26px`;
  1px top border `rgba(140,100,180,0.22)`; shadow `0 -24px 60px -12px rgba(0,0,0,.7)`.
- Sits over a **scrim**: `rgba(4,3,8,0.62)` + `backdrop-filter: blur(2px)`. Tapping the scrim closes.
- **Entrance animation:** panel `transform: translateY(100%) → translateY(0)`, scrim
  `opacity: 0 → 1`, both `.3s cubic-bezier(.22,1,.36,1)`.
  - ⚠️ **Implementation note:** the prototype triggers the open state with a `setTimeout(…, 20)`
    after mount (NOT `requestAnimationFrame` — rAF does not fire reliably in some embedded
    preview environments and left the sheet parked off-screen). In a normal browser/app either
    approach is fine, but a mount→next-tick state flip (or a CSS enter transition) is the robust
    pattern. Always animate from hidden→visible AFTER first paint.

### Sheet structure (top to bottom)
1. **Drag handle** — decorative bar, `38×4px`, `rgba(255,255,255,0.18)`, centered, `radius 999`.
2. **Header row** — title "Add Show" (19px/700), subtitle `<Theatre> · <pretty date>` (12.5px,
   muted). **X close** button on the right: `38×38`, radius 11, surface `#16151f`, 1px card border.
3. **Show #** — read-only, auto-incremented. Rendered as a `64×64` rounded-16 tile in
   **purple-chip** style: small uppercase "SHOW" label (purple text) above a large monospace
   number (28px/600). Helper copy to the right: "Auto-numbered as the next show of the day…"
4. **Show date** — see dedicated section below. *(NEW)*
5. **Start time** — `*required*`. Field row with a clock icon + native `<input type="time">`,
   monospace, `colorScheme: dark`. Displays as `--:--` until set; saved value is formatted to
   12-hour (e.g. `6:45 PM`).
6. **Movie name** — `*required*`. Field row with ticket icon + text input, placeholder
   "e.g. KGF Chapter 2".
7. **Language** — `*required*`. Pill toggle row, wraps: **Kannada / Hindi / Tamil / Telugu /
   English / Other**. Selected pill = amber bg + dark ink + glow; unselected = input-bg + muted text.
8. **Fan show** — toggle switch, **default off**. Row has a fan icon, label "Fan show", subcopy
   "First-day-first-show or special event", and a `52×30` switch (amber when on).
9. **Tickets & Occupancy** — section label + Box/Gold/Silver + computed stats. See below. *(NEW math)*
10. **Save Show** — sticky footer button, amber, full width, **54px** height, with a check icon.
    **Disabled** (40% opacity) until time + movie + language are all set.

---

### Section: Show Date  *(NEW)*

**Label:** "Show date" (13px, muted).

**Quick chips (row above the picker):**
- Two pills: **Today** and **Yesterday**.
- Active pill = `background: var(--accent)` (amber) + dark ink + `0 4px 14px -4px <accent-glow>`;
  font-weight 650.
- Inactive pill = `background: var(--input-bg)` + muted text + 1.5px input border; font-weight 500.
- Height 38px, padding `0 16px`, radius 999, transition `all .18s`.

**Date picker:**
- Field row (same style as Start time): calendar icon + native `<input type="date">`, monospace,
  `colorScheme: dark`.
- **`max` = today's ISO date** → future dates are not selectable.

**Back-dated indicator:**
- When the selected date ≠ today, show a line below the picker: clock icon + purple-text copy
  `"Back-dated entry · <pretty date>"`.

**Date model & formatting (important for correctness):**
- The app's "today" anchor in the prototype is a fixed date `2026-06-03` (because the seed data is
  for that day). **In production, replace this with the real current date.**
- ISO format `YYYY-MM-DD` is the stored/compared value. `Today`/`Yesterday` are derived by
  comparing the selected ISO to today's and (today − 1)'s ISO.
- `prettyDate(iso)` →
  - if iso === today: `"Today · Tue, 3 Jun 2026"`
  - if iso === yesterday: `"Yesterday · Tue, 2 Jun 2026"`
  - otherwise: `"Wed, 28 May 2026"` (no tag)
  - Format = `"<DOW>, <D> <Mon> <YYYY>"`; DOW/Mon are 3-letter abbreviations.
- The header subtitle uses `prettyDate(date)`; the sheet defaults `date = todayISO`.

**Where the date surfaces afterward:** on the **Day View** show row, if a saved show's
`date !== todayISO`, render a small purple-chip badge in the meta line showing the tag
(`Today`/`Yesterday`) or, for older dates, the literal text "Back-dated". (See
`app/screens-a.jsx` → `ShowRow`.)

---

### Section: Tickets & Occupancy  *(NEW math)*

**Section label:** "TICKETS & OCCUPANCY" — 11px, weight 600, `letter-spacing .14em`,
`text-transform: uppercase`, muted.

**Box / Gold / Silver inputs:**
- A single **row of three equal-width** compact numeric inputs (`flex: 1` each, `gap 10px`).
- Each input has its **label above** (centered, 12px/600, muted): "Box", "Gold", "Silver".
- Input: full width of its column, **height 52px**, centered text, **monospace 18px/600**,
  `inputMode="numeric"`, placeholder `0`, radius = `--r-input`, input-bg fill, 1.5px input border.
- **Focus state:** border → amber, `box-shadow: 0 0 0 4px var(--accent-ring)`, bg → input-bg-focus;
  the field also `select()`s its contents on focus. Strip non-digits on input.

**Computed read-only stats (row below the three inputs):**
- Two equal cards (`flex: 1`, `gap 10px`), each: muted label (12.5px) + big **amber monospace**
  value (26px/600) with `text-shadow: 0 0 18px <accent-glow>`.
- **Total tickets** = `Box + Gold + Silver` (integers; blank treated as 0). Formatted with Indian
  grouping (`Intl.NumberFormat('en-IN')`).
- **Occupancy** = `(Total / capacity) × 100`, **rounded to 1 decimal**, suffixed `%`
  (e.g. `78.0%`). If capacity is 0/missing, show `0.0%`.

**Capacity reference (display only):**
- The smallest, most-muted line on the form (11px, ~0.65 opacity): user icon + `"<Theatre> · <capacity> seats"`.
- Capacities: **Sandhya · 714 seats**, **Manasa · 524 seats**. Pulled from the theatre record
  (`theatre.capacity`), NOT hard-coded in the sheet.

**Saved fields:** the form commits `{ box, gold, silver }` (ints) plus `occ` (Total/capacity %,
**rounded to integer** for the saved show, used by the Day View occupancy display).

---

## Interactions & Behavior
- **Open:** "Add Show" button on Day View → sheet mounts → animates up.
- **Close:** X button or scrim tap → animate down (`.26s`) → unmount.
- **Live compute:** typing in Box/Gold/Silver instantly recomputes Total and Occupancy
  (pure derived values, no debounce).
- **Validation:** Save disabled until `time && movie.trim() && lang` are all truthy.
- **Save:** builds the new show object, appends it to that theatre's `shows` array with
  `status: 'pending'` and empty counters/parking/payments, then closes the sheet.
- **Numbering:** Show # = `shows.length + 1` at open time. (Note: numbering is by list position,
  not by date — acceptable for the prototype; decide your own rule if back-dated shows must
  interleave.)

## State Management
Local form state in the sheet:
- `date` (ISO string, default todayISO), `time` (`HH:mm`), `movie` (string), `lang` (string),
  `fan` (bool), `box`/`gold`/`silver` (numeric strings), `show` (bool — drives the slide
  animation), plus per-field focus booleans.
Derived (not stored): `total`, `occ`, `valid`.
On save, the parent (`app/app.jsx → addShow`) appends to `data.theatres[id].shows` via an
immutable deep-set helper (`setIn`). The Day View re-renders from that array.

### Show data model (fields added/used by these features)
```
{
  id, n,                 // identity + show number
  date,                  // "YYYY-MM-DD" (NEW)
  dateLabel,             // prettyDate(date) cached for display (NEW)
  time,                  // "6:45 PM"
  movie, lang, fan,      // strings + bool
  tickets: { box, gold, silver },   // ints (NEW)
  occ,                   // integer occupancy % (NEW: derived from tickets/capacity)
  status: 'pending' | 'inprogress' | 'complete',
  counters, parking, payments        // existing slip data (empty for a new show)
}
```
Theatre record carries `capacity` (Sandhya 714, Manasa 524).

## Design Tokens
Defined as CSS variables in `Theatre Ops.html` (`:root`). Accent is themable (default amber).

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0a0f` | App background |
| `--surface` | `#16151f` | Cards, close button |
| `--surface-2` | `#1d1b28` | Sheet gradient top |
| `--purple-chip` | `rgba(89,61,120,0.28)` | Show#/lang/date chips, purple tiles |
| `--purple-text` | `#b79ad0` | Purple chip text, back-dated note |
| `--purple-border` | `rgba(140,100,180,0.22)` | Sheet top border |
| `--card-border` | `rgba(150,120,190,0.13)` | Dividers, card borders |
| `--text` | `#f3f1f8` | Primary text |
| `--muted` | `#8b8597` | Labels, secondary text |
| `--accent` | `#f59e0b` | Primary action / active state / key numbers |
| `--accent-ink` | `#1a1206` | Text/icon on amber |
| `--accent-glow` | `accent @ 40%` | Glows on amber numbers/buttons |
| `--accent-ring` | `accent @ 26%` | Input focus ring (4px) |
| `--red` | `#ef4444` | Warnings / required asterisk is accent, not red |
| `--green` | `#22c55e` | Success states |
| `--input-bg` | `rgba(255,255,255,0.035)` | Input fill, inactive pills |
| `--input-bg-focus` | `rgba(255,255,255,0.06)` | Focused input fill |
| `--input-border` | `rgba(150,120,190,0.18)` | Input border |
| `--r-card` / `--r-btn` / `--r-input` | `22 / 14 / 13 px` (rounded preset) | Radii |

**Typography:** `Inter` (400/500/600/700) for text; `JetBrains Mono` (400–700) for all numbers
(show #, time, ticket counts, totals, occupancy, currency). Both via Google Fonts.

**Currency:** Indian grouping via `Intl.NumberFormat('en-IN')`, prefixed `₹` (e.g. `₹1,12,500`).

## Assets
- **Swagath logo** — `assets/swagath-mark.png` (red/yellow leaping figure). Used on Login/Home
  headers; not part of these two features but included for completeness.
- **Icons** are inline SVG in `app/components.jsx` (`Icon` component). Relevant ones:
  `calendar`, `clock`, `fan`, `ticket`, `user`, `check`, `x`, `plus`, `chevron`. Stroke-based,
  24×24 viewBox, `stroke-width ~1.8`. Reproduce with your icon set (Lucide/Phosphor are close).

## Files
Most relevant first. All paths are inside the bundle's `app/` (and the root HTML).

| File | Why it matters |
|---|---|
| **`app/add-show-sheet.jsx`** | ★ The whole Add Show sheet: date field, Today/Yesterday chips, `prettyDate`, ticket inputs, Total/Occupancy math, validation, save, slide animation. |
| **`app/screens-a.jsx`** | `ShowRow` (back-dated date chip on the Day View), `DayScreen` (the "Add Show" trigger button), `HomeScreen`, `AppHeader`. |
| **`app/app.jsx`** | `addShow` handler (builds the show object incl. `date`/`tickets`/`occ`), sheet open/close state, navigation, `setIn` immutable updater, the data/show model. |
| **`app/theme.jsx`** | Theatre records incl. `capacity` (714/524), currency formatter, item catalogues, status meta, seed data. |
| **`app/components.jsx`** | Shared primitives: `Icon` (calendar/clock/fan/…), `Btn`, `Ghost`, `Card`, `Field`, `NumCell`, `Badge`, `Tabs`, `Divider`, the device frame + status bar. |
| **`Theatre Ops.html`** | Entry point: design tokens (`:root` vars), fonts, global CSS, script load order. |

> The other screen files (`screens-b.jsx`, `screen-insights.jsx`, `charts.jsx`, `insights-data.jsx`)
> are included only as surrounding context and aren't needed for these two features.
