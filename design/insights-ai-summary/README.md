# Theatre Ops — Insights & AI Daily Summary (Deliverable)

A complete package covering the **two analytics surfaces** of the Theatre Ops mobile app
(Swagath Enterprises, Bengaluru):

1. **Insights** — revenue line chart, show-performance bars, top-items bars, catering
   suggestions, parking-gap trend.
2. **AI Daily Summary** — performance snapshot, AI narrative, item intelligence, catering for
   tomorrow, conditional parking alert; with before / loading / after states.

Both are part of one running prototype (`Theatre Ops.html`). This folder collects the relevant
source files and PNG screenshots of every state.

---

## How to run
**Easiest:** open **`Theatre Ops (standalone).html`** — a single self-contained file (all code,
fonts, and the logo inlined). Just double-click it; works offline.

**Source version:** open **`Theatre Ops.html`** — loads the `app/*.jsx` files separately (better
for reading/editing the code). React + Babel come from CDN, so this one needs internet.

No build step either way.

**Navigation to each screen**
- **Insights** — Sign In → Home → "View Insights & Suggestions" (or the chart icon, top-right).
- **AI Daily Summary** — Sign In → Home → open a theatre → "Close Day" → "Generate AI Summary".

The accent color and device frame (iPhone / iPhone Max / iPad) are switchable from the **Tweaks**
panel. iPad shows the smaller cards two-up.

---

## States captured (see `screenshots/`)
**AI Daily Summary**
- `ai-01-before.png` — Generate prompt (sparkle, "Powered by Groq").
- `ai-02-loading.png` — pulsing skeletons + "Reading … day".
- `ai-03-after-top.png` — Performance Snapshot + AI Narrative.
- `ai-04-items-catering.png` — Item Intelligence + Catering "For Tomorrow".
- `ai-05-parking.png` — conditional Parking Alert + Regenerate.
- `ai-06-adjust.png` — catering inline-edit (steppers, Save / Reset).
- `ai-07-ipad.png` — iPad two-column (item intelligence + catering side by side).

**Insights**
- `insights-01-overview.png` — Home entry + Revenue Overview & Show Performance.
- `insights-top-items.png`, `insights-parking.png`, `insights-ipad.png` (where present).

---

## Data is real, not canned
Every number is **derived from the prototype's logged show data** (`app/theme.jsx` seed), so the
two screens agree with each other and with the rest of the app:
- Sandhya day total ≈ **₹92,750**, **+12% vs yesterday**, best show **Show 3 · 6:45 PM**.
- Manasa day total ≈ **₹26,970**, **−8% vs yesterday**, best show **Show 1 · 11:00 AM**
  (narrative adapts — it does not falsely claim evening dominance).
- Parking alert only renders when a real gap exists (Sandhya: gap across 3 shows).
- Currency is Indian-grouped ₹ (`Intl.NumberFormat('en-IN')`); numbers use JetBrains Mono.

The AI narrative is composed deterministically from these figures in
`app/ai-summary-data.jsx` (`buildSummary`). In production this is where a real model call
(e.g. Groq) would slot in — same inputs, same output shape.

---

## Files

### AI Daily Summary
| File | Role |
|---|---|
| `app/screen-ai-summary.jsx` | The screen: before / loading / after states, all six sections, AI badge, skeletons, inline catering edit. |
| `app/ai-summary-data.jsx` | `buildSummary(theatre)` — derives snapshot, narrative (time-aware slot insight), item intelligence, catering, parking from real data. |

### Insights
| File | Role |
|---|---|
| `app/screen-insights.jsx` | The screen: theatre toggle, range pills, all five sections, catering card with inline edit. |
| `app/charts.jsx` | `LineChart` (cinematic dark grid + amber glow, hover scrubber) and `HBarChart` (animated horizontal bars). |
| `app/insights-data.jsx` | Deterministic analytics: daily revenue series, show performance, top items, parking-gap trend, catering suggestions. |

### Shared
| File | Role |
|---|---|
| `Theatre Ops.html` | Entry point: design tokens (`:root`), fonts, global CSS + animations, script load order. |
| `app/theme.jsx` | Tokens, currency, item catalogues, theatre + show seed data (incl. capacities), revenue helpers. |
| `app/components.jsx` | Shared primitives: `Icon`, `Btn`, `Ghost`, `Card`, `Field`, `Badge`, `Tabs`, `Divider`, device frame, status bar. |
| `app/screens-a.jsx` | `HomeScreen` (Insights entry points), `AppHeader`, `DayScreen`. |
| `app/screens-b.jsx` | `DayCloseScreen` (the "Generate AI Summary" entry point). |
| `app/app.jsx` | Root state, navigation (routes for `insights` and `aisummary`), data model. |

> These are **design-reference sources** (React via in-browser Babel). To productionize, recreate
> them in your real stack and replace `buildSummary`'s deterministic text with a model call.

---

## Design tokens (quick reference)
`--bg #0a0a0f` · `--surface #16151f` · `--accent #f59e0b` (amber) ·
`--purple-chip rgba(89,61,120,.28)` · `--purple-text #b79ad0` ·
`--green #22c55e` · `--red #ef4444`. Inter for text, JetBrains Mono for numbers.
