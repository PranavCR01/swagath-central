# Theatre Ops — CLAUDE.md

## Project Overview
A mobile-first data entry app for a single-screen theatre owner in Bangalore.
He owns two theatres: **Sandhya** and **Manasa**.
After each show day, he logs food sales, parking, and expenses into this app
to replace his current paper slip system. Data accumulates over time to enable
catering predictions and operational insights (Slice 5, future).

**Owner login:** chaitanya58@gmail.com (Supabase Auth, email + password)

---

## Tech Stack
- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database + Auth:** Supabase (shared with forex-sensei project, free tier)
- **Routing:** React Router v6
- **Hosting:** Vercel (frontend only, no separate backend)
- **Dev:** Claude Code in VS Code terminal

---

## Supabase
- All tables prefixed with `theatre_` to avoid conflicts with forex-sensei tables
- RLS enabled on all tables — user can only access their own theatre data
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Tables
| Table | Purpose |
|---|---|
| theatre_theatres | Sandhya + Manasa, linked to owner_id |
| theatre_days | One row per theatre per date |
| theatre_shows | Up to 7 shows per day, flexible start times |
| theatre_main_counter | 13 items × {ob, rec, cb, sale} per show |
| theatre_popcorn | 3 cone sizes + BMS combo per show |
| theatre_cool_drinks | 4 drinks + 7 live counter items per show |
| theatre_parking | Scooter/Auto/Car count + reported amount per show |
| theatre_expenses | Daily expenses per theatre |
| theatre_staff_wages | Per-staff wage rows per day |

---

## Item Prices (hardcoded in prices.ts — never store in DB)
**Main Counter:** Veg Puff ₹40, Egg Puff ₹40, H.Cake ₹40, Jam Bun ₹30, Ckn Puff ₹60, BS ₹30, Samosa ₹40, Tin ₹60, Frooty ₹40, Chips ₹30, Frymes ₹30, Water ₹30, Milkshake ₹50, Lays ₹60

**Popcorn:** Cone Small ₹60, Cone Medium ₹130, Cone Large ₹200, BMS Combo = lump amount only

**Cool Drinks:** Water ₹30, Tins 1 ₹70, Tins 2 ₹60, Frooty/Tropicana ₹40, Milkshake ₹50, French Fries ₹70, Veg Bites ₹70, Onion Samosa ₹80, Ckn Popcorn ₹80, Ckn Samosa ₹120, Ckn Nuggets ₹100, Ice Cream 1 ₹40, Ice Cream 2 ₹60, Ice Cream 3 ₹60, Tea/Coffee ₹30

**Parking:** Scooter ₹20, Auto ₹30, Car ₹50

---

## Key Business Logic
1. **SALE:** `ob + rec - cb` (user enters OB/REC/CB, SALE auto-calculates)
2. **AMOUNT:** `sale × price` — never stored, always computed at display time
3. **OB carry-forward:** current show OB = previous show's `ob + rec - cb - sale` (closing stock)
4. **Parking expected:** `(scooter×20) + (auto×40) + (car×80)`
5. **Parking gap:** `expected - reported` → red if > 0, green if 0
6. **Show total:** MC total + Popcorn total + CD total + Parking reported
7. **B.Cash:** Total Sales − Total Expenses
8. **Expenses vs Staff Wages:** `theatre_expenses.wages` = total wages line. `theatre_staff_wages` = per-person breakdown. Same figure shown two ways — do NOT double-count in B.Cash calculation.

---

## Show Structure
- Up to 7 shows/day (5 normal, 6-7 on big/fan releases)
- Numbered 1–7, flexible start times (±20 min), no fixed slot names
- Fan shows marked `is_fan_show = true`
- Each theatre plays a different movie simultaneously

---

## SlipRow UI Constraint (mobile critical)
SlipRow has 6 columns on a 375px screen. To fit without horizontal scroll:
- OB, REC, CB inputs: max 60px wide
- SALE and ₹AMT: read-only text, not inputs
- Item label: truncate with ellipsis if needed
- Never make all columns equal width

---

## Folder Structure
```
src/
  components/
    ui/              ← shadcn auto-generated
    SlipRow.tsx      ← OB/REC/CB/SALE/AMOUNT row
    ShowCard.tsx     ← show summary card
    TheatreCard.tsx  ← theatre card on home
  pages/
    LoginPage.tsx / HomePage.tsx / DayPage.tsx
    ShowPage.tsx / DayClosePage.tsx / HistoryPage.tsx
  lib/
    supabase.ts / prices.ts / calculations.ts
  hooks/
    useTheatres.ts / useDay.ts / useShows.ts
  App.tsx / main.tsx
```

---

## Build Slices

| Slice | Description | Status |
|---|---|---|
| 1 | Foundation + Auth (scaffold, login, protected routes, prices.ts, calculations.ts) | ✅ Complete |
| 2 | Home + Day + Show Entry (theatre cards, day view, add show form) | ✅ Complete |
| 3 | The Three Slips (Main Counter, Popcorn + Parking, Cool Drinks) | ✅ Complete |
| 4 | Day Close + History (expenses, B.Cash, staff wages, history view) | ✅ Complete |
| 5 | Insights — revenue trends, show performance, top items, catering suggestions, parking gap trend | ✅ Complete |
| 6 | AI Daily Summary — Groq-powered narrative, item intelligence, parking alert, catering plan | ✅ Complete |
| 7 | Security Audit — secrets, session timeout, RLS review, API hardening | ✅ Complete |

---

## Design Principles
- Mobile-first, numeric keyboard on all number inputs (`inputMode="numeric"`)
- OB carry-forward is silent — pre-fill without prompting the user
- Save per slip (not per show) so interruptions don't lose data
- Auto-calculate SALE and AMOUNT visibly as user types
- Never store calculated values in DB

---

## Dev Rules
- `/plan` before writing any code each session
- `/compact` before starting a new slice
- State one risk/edge case after each major step
- `theatre_` prefix only — never touch non-prefixed tables
- `npm run build` must pass before any commit
- Keep this file under 150 lines — compact ruthlessly

### Testing AI Summary
`/api/generate-summary` 404s under plain `vite dev` (it's a Vercel function). Test via
`npx vercel dev` with `GROQ_API_KEY` in `.env.local`, or on the deployed Vercel URL.

## Known Risks
- **No point-in-time recovery** (Supabase free tier) — export DB monthly via Supabase → Settings → Database → Backups
- **@vercel/node devDependency has known high-sev vulns** in transitive deps (build-utils/undici) — dev-only, not in frontend bundle; full fix needs a major downgrade, deferred
- **Single-device assumption** — no multi-device conflict resolution; last write wins

## Session Log
<!-- One line per session: date + what was done -->
- 2026-06-04 — Slice 3 — three slips, OB carry-forward, parking gap
- 2026-06-05 — Slice 4 (day close, PDF, expenses, history) + fixes (useDay retry, DayClose completion, UPI auto-populate, label typo)
- 2026-06-10 — Slice 5 — Insights dashboard, custom SVG charts, catering suggestions, seed/cleanup data scripts
- 2026-06-10 — Slice 6 — AI daily summary via Groq, Vercel serverless function
- 2026-06-11 — Slice 7 — security audit: source maps off, idle timeout, error message sanitization, API rate limiting + prompt-injection guards + CORS, gitignore hardening
