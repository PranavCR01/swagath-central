# Slice 4 — Day Close + History
## Task Brief for Claude Code

> Read CLAUDE.md first. Slices 1, 2, and 3 must be complete.
> Design reference files are in `design/`. Match the visual style from Slice 3.

---

## ⚠ Critical: Wages vs Staff Wages — do not double-count

`theatre_expenses.wages` = total wages line (single number on expense form).
`theatre_staff_wages` = per-person breakdown that adds up to the same total.

Same money shown two ways. When computing B.Cash:
- Use `theatre_expenses.wages` as the wages expense figure
- `theatre_staff_wages` rows are breakdown only — reference, not additive
- Do NOT add both — that doubles the wages deduction

---

## Mission
Build the Day Close screen (expenses, staff wages, B.Cash, PDF report) and
the History view (browse + edit past days). This completes Phase 1.

---

## Supabase tables
- `theatre_expenses` — upsert per day
- `theatre_staff_wages` — insert/delete per day
- `theatre_days` — read
- `theatre_shows` — read (for totals)
- `theatre_main_counter`, `theatre_popcorn`, `theatre_cool_drinks`, `theatre_parking` — read (for totals)

---

## Step 1 — Add to calculations.ts

```typescript
// Use upi + cash as source of truth for each slip total
export function computeSlipTotal(upiAmount: number, cashAmount: number): number {
  return upiAmount + cashAmount
}

// Show total = MC + Popcorn + CoolDrinks + Parking reported
export function computeShowTotal(mc: number, popcorn: number, cd: number, parking: number): number {
  return mc + popcorn + cd + parking
}

// Day total = sum of all show totals
export function computeDayTotal(showTotals: number[]): number {
  return showTotals.reduce((s, t) => s + t, 0)
}

// B.Cash = total sales - total expenses
// WARNING: use expenses.wages only — do NOT add staffWagesTotal separately
export function computeBCash(totalSales: number, expenses: {
  wages: number, staff_coffee: number, water_cans: number,
  lab_food: number, wastage: number, others_amount: number
}): number {
  return totalSales - (
    expenses.wages + expenses.staff_coffee + expenses.water_cans +
    expenses.lab_food + expenses.wastage + expenses.others_amount
  )
}
```

---

## Step 2 — DayClosePage.tsx

Route: `/theatre/:theatreId/day/:date/close`

Match dark theme from Slice 3. Sections separated by Dividers with icons.
Sticky bottom bar showing live B.Cash at all times.

### Section 1 — Show Summary (read only)
Card with table per show:
| # | Movie | MC | Popcorn | Cool Drinks | Parking | Total |
Auto-computed from saved slip rows. Grand total row at bottom in amber.
If a show has no slip data → show warning chip "Show {n} incomplete" with
a tap target that navigates back to that show.

### Section 2 — Parking Summary
Per show row: theatre name, scooter/auto/car counts, Expected ₹, Reported ₹, Gap ₹
Gap > 0 → red text. Gap = 0 → green. Missing reported → amber "not entered".
Total row at bottom.

### Section 3 — UPI Breakdown
5 labelled numeric inputs:
- Popcorn UPI, Main Counter UPI, Cool Drink UPI, Live Counter UPI, BMS UPI
Total UPI auto-calculated below in amber mono.

### Section 4 — Expenses
Numeric inputs with ₹ prefix:
- Wages (total), Staff Coffee, Water Cans, Lab Food, Wastage
- Others: text description input + ₹ amount input side by side

### Section 5 — Staff Wages
Dynamic list. Each row: name text input + amount numeric input + trash icon.
"+ Add Staff" button below list.
Running total shown below list in muted mono.
(This is the per-person breakdown — does NOT feed into B.Cash calculation)

### Section 6 — Day Summary (sticky bottom bar)
Always visible, updates live as user types:
```
Total Sales    ₹79,930
Total Expenses ₹14,548   (in red if > sales)
──────────────────────
Balance Cash   ₹65,382   (green if positive, red if negative, amber if 0)
```

### Section 7 — Actions
- "Save Day Close" button → upserts theatre_expenses, replaces theatre_staff_wages
- "Download Day Report" button (ghost) → generates PDF of day summary

"✓ Saved" toast after save.

---

## Step 3 — PDF Day Report (jsPDF)

Install: `npm install jspdf`

Triggered by "Download Day Report" button on DayClosePage.
Generates a clean single-page PDF with:

```
SWAGATH ENTERPRISES — DAILY REPORT
Sandhya Theatre · Tue, 3 Jun 2026
─────────────────────────────────────

SHOW SUMMARY
Show 1  KGF Chapter 2  10:15 AM  87%  ₹30,980
Show 2  KGF Chapter 2   1:30 PM  64%  ₹17,270
Show 3  KGF Chapter 2   6:45 PM  92%   ₹4,710
                              Total  ₹52,960

PARKING SUMMARY
Show 1  Scooter:64  Auto:12  Car:28  Expected:₹4,000  Reported:₹3,800  Gap:₹200
...

EXPENSES
Wages ₹14,500 · Staff Coffee ₹100 · Water Cans ₹250 ...
Total Expenses ₹14,548

STAFF WAGES
Ravi (Projection) ₹900 · Lakshmi (Counter) ₹700 ...

─────────────────────────────────────
Total Sales:      ₹52,960
Total Expenses:   ₹14,548
Balance Cash:     ₹38,412
```

Dark branding header, clean monospace data rows, auto-download as
`Sandhya_2026-06-03.pdf`. No external server needed — pure client-side.

---

## Step 4 — HistoryPage.tsx

Route: `/history`
Add Clock icon link in Home screen header → /history

Layout: grouped list sorted newest first, both theatres interleaved.

Each row (card):
- Date (bold) + Theatre name pill (purple chip)
- Shows count + Total sales in amber mono
- B.Cash if day was closed (green/red)
- Status badge: "Closed ✓" (green) | "Open" (amber)

Tap a day row → read-only DayClose view for that date (all inputs disabled).
"Edit Day" button top right → navigates to DayPage for that date.

Show last 30 days. "Load more" button fetches next 30.

---

## Step 5 — Navigation cleanup

Home screen header: add Clock icon (top right alongside logout) → /history

DayPage bottom bar:
- "Close Day" button already exists — ensure it navigates to DayClosePage
- Disable it if no shows entered yet (shows.length === 0)

---

## Acceptance criteria

- [ ] Day Close loads with auto-populated show totals from Supabase
- [ ] Incomplete shows flagged with warning + navigation link
- [ ] Parking summary shows per-show gap in correct colour
- [ ] UPI breakdown total auto-calculates
- [ ] Expenses form saves correctly to theatre_expenses
- [ ] Staff wages rows add/remove correctly in theatre_staff_wages
- [ ] B.Cash calculates correctly (no double-counting wages)
- [ ] B.Cash sticky bar updates live as user types
- [ ] "✓ Saved" toast after save
- [ ] PDF downloads with correct day data and filename
- [ ] History page lists past days for both theatres sorted newest first
- [ ] Past day detail view is fully read-only
- [ ] "Edit Day" navigates back to DayPage for that date
- [ ] "Load more" pagination works
- [ ] History icon visible on Home screen
- [ ] Works on mobile width (375px)
- [ ] `npm run build` passes with no TypeScript errors

---

## When done

Update CLAUDE.md: mark Slice 4 as ✅ Complete.
Add session log: date + "Slice 4 — day close, PDF report, history view"
Commit: `feat(slice-4): day close, PDF report, expenses, history`

**Phase 1 complete. Share with Chaitanya to start entering real data.**
Come back to claude.ai to plan Slice 5 (Insights) after 4-6 weeks of data.
