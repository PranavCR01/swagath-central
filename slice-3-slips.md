# Slice 3 — The Three Slips
## Task Brief for Claude Code

> Read CLAUDE.md first. Slices 1 and 2 must be complete.
> Design reference files are in `design/`. Read them before writing any UI.

---

## Design reference — read these first

Before writing a single component, read:
- `design/theme.jsx` — full color system, CSS variables, item catalogues, math functions
- `design/components.jsx` — NumCell, Tabs, Divider, Card, Badge, Btn primitives
- `design/04-show.png` — SlipRow layout and Main Counter tab target
- `design/05-parking.png` — Popcorn + Parking tab target
- `design/06-close.png` — reference for totals display style

### Key design tokens (from theme.jsx)
```css
--bg: #0a0a0f
--surface: #16151f
--surface-2: #1e1c2a
--accent: #f59e0b
--accent-ink: #1a1206
--accent-glow: rgba(245,158,11,0.35)
--accent-ring: rgba(245,158,11,0.18)
--red: #ef4444
--green: #22c55e
--muted: rgba(255,255,255,0.38)
--text: #f1f0f5
--card-border: rgba(255,255,255,0.07)
--input-bg: rgba(255,255,255,0.05)
--input-bg-focus: rgba(255,255,255,0.08)
--input-border: rgba(255,255,255,0.10)
--purple-chip: rgba(139,92,246,0.15)
--purple-text: rgba(167,139,250,0.9)
--purple-border: rgba(139,92,246,0.25)
--mono: 'JetBrains Mono', 'Fira Code', monospace
```

---

## Mission
Build the three data entry slips for each show: Main Counter, Popcorn, Cool Drinks.
This is the core of the app. By end of this slice Chaitanya can enter a full
show's data and save it to Supabase.

---

## Supabase tables
- `theatre_main_counter` — upsert per show
- `theatre_popcorn` — upsert per show
- `theatre_cool_drinks` — upsert per show
- `theatre_parking` — upsert per show (inside Popcorn tab)
- `theatre_shows` — read metadata

---

## Business logic (use calculations.ts — never reimplement)
- `calcSale(ob, rec, cb)` → sale units
- `calcAmount(sale, price)` → ₹ amount
- `calcClosingStock(ob, rec, cb, sale)` → OB carry-forward
- `calcParkingExpected(scooter, auto, car)` → expected ₹
- `calcParkingGap(expected, reported)` → gap ₹

All prices from `prices.ts`. Never hardcode a price inline.

Currency display: Indian grouping with ₹ sign.
Use `new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })` — matches design.

---

## Step 1 — SlipRow.tsx

The most-used component in the app. Reference `design/04-show.png` for exact layout.

```typescript
interface SlipRowProps {
  label: string       // item name e.g. "Samosa"
  subLabel: string    // price e.g. "₹80"
  price: number
  ob: string          // string to allow empty input
  rec: string
  cb: string
  onObChange: (v: string) => void
  onRecChange: (v: string) => void
  onCbChange: (v: string) => void
}
// Derived inside component:
// sale = calcSale(Number(ob)||0, Number(rec)||0, Number(cb)||0)
// amount = calcAmount(sale, price)
```

**Layout — 6 columns, matches design/04-show.png exactly:**
```
[Item name  ] [OB ] [REC] [CB ] [SALE] [₹AMT ]
[Samosa ₹80 ] [310] [ — ] [297] [ 13 ] [1,040 ]
```

Styling rules (from design/components.jsx NumCell):
- Item name: bold white, price below in `--muted`, `flex-1`, truncate with ellipsis
- OB/REC/CB: `width: 54px`, `height: 44px`, `inputMode="numeric"`, dark bordered input
  with amber focus ring — use same style as NumCell in components.jsx
- SALE: `font-family: var(--mono)`, bold white, `width: 40px`, right-aligned, no border
- ₹AMT: `font-family: var(--mono)`, amber (`--accent`) if > 0, `--muted` if 0,
  right-aligned, no border, min-width 64px
- Full row: `min-height: 52px`, `padding: 6px 0`, border-bottom `var(--card-border)`
- If SALE is 0 → entire row opacity 0.45
- On mobile 375px: all 6 columns must fit without horizontal scroll

---

## Step 2 — ShowPage.tsx

Route: `/theatre/:theatreId/day/:date/show/:showId`

**Header** (matches design header pattern):
- Back arrow → DayPage
- "Show {n} · {movieName}" in white bold
- Theatre name + time in muted below
- Status badge (Complete/In Progress/Not Started) top right

**Tab bar** (sticky below header, matches design/04-show.png):
- Main Counter | Popcorn | Cool Drinks
- Active tab: white text + amber underline with glow
- Inactive: muted text
- Use same Tabs pattern from design/components.jsx

**Each tab body:**
- Scrollable list of SlipRow components
- Column headers row at top: ITEM | OB | REC | CB | SALE | ₹ AMT (muted, small caps)
- Running total card pinned above UPI/Cash section
- UPI input + Cash input (numeric, amber focus ring)
- Slip total = UPI + Cash (auto, read-only, amber monospace)
- "Save [Tab Name]" button — amber, full width, sticky at bottom

Active tab persists if user switches tabs before saving.
Show brief "✓ Saved" toast after successful save.

---

## Step 3 — Main Counter tab (13 items)

Items in exact order from `prices.ts`:
Veg Puff ₹40, Egg Puff ₹40, Samosa ₹80, Ckn Puff ₹40, H. Cake ₹40,
Jam Bun ₹40, Chips ₹45, Frymes ₹40, Kettle Chips ₹40, Water ₹30,
Milkshake ₹30, Frooty ₹40, Tin ₹70

Running total updates live as user types. Displayed as:
```
Main Counter Total    ₹22,630
```
In a purple-tinted card (`--purple-chip` background) above UPI/Cash.

---

## Step 4 — OB carry-forward (silent, automatic)

On ShowPage mount, for each slip type:
1. Find previous show: same day + theatre, `show_number - 1`
2. Fetch its saved slip row from Supabase
3. For each item: `newOB = calcClosingStock(prev.ob, prev.rec, prev.cb, prev.sale)`
4. Pre-fill OB fields with these values
5. Show 1 (no previous) → OB defaults to `''` (empty, user enters opening stock)

Silent — user just sees OB pre-filled. Fields remain editable.
Show a subtle "OB carried from Show {n-1}" note in muted text if carry-forward happened.

---

## Step 5 — Popcorn tab (reference design/05-parking.png)

**Popcorn items:**
- Cone S ₹60, Cone M ₹130, Cone L ₹200 — full SlipRow with OB/REC/CB
- BMS Combo — lump amount only (single ₹ input, no OB/REC/CB)
  Label: "BMS Combo" with "lump" badge in purple chip

Popcorn subtotal card above parking divider.

**Parking section** (visually separated — Divider with parking icon):
Three rows: Scooter ₹20 each | Auto ₹40 each | Car ₹80 each
Each row: vehicle name + rate label | count input (54px) | expected ₹ (auto, muted mono)

Below the three rows:
```
Expected collection          ₹4,000   (grey)
Reported amount         [        ]   (editable input)
```

Gap indicator (shows only after reported is entered):
- Gap = 0 → green pill "✓ No gap"
- Gap > 0 → red warning card "⚠ Gap: ₹{gap} — staff short" (matches design)
- Gap < 0 → amber pill "Overpaid: ₹{abs(gap)}"

Save button saves popcorn + parking together in one operation.

---

## Step 6 — Cool Drinks tab

**Drinks** (top, no section label needed):
Water ₹30, Tin ₹70, Frooty & Tropicana ₹40, Milkshake ₹50

**Live Counter** (Divider with cup icon between sections):
French Fries ₹70, Veg Bites ₹70, Onion Samosa ₹80, Ckn Popcorn ₹80,
Ckn Samosa ₹120, Ckn Nuggets ₹100, Sandwich ₹120

UPI + Cash + Total at bottom. Same pattern as Main Counter.

---

## Step 7 — Show completion status

A show is Complete when all 3 rows exist in Supabase:
`theatre_main_counter` AND `theatre_popcorn` AND `theatre_cool_drinks`

After each save, re-check completion and update ShowCard status on DayPage.
No extra DB column needed — derive from row existence.

---

## Acceptance criteria

- [ ] Tapping a show from DayPage opens ShowPage
- [ ] Header shows show number, movie, theatre, time, status badge
- [ ] Three tabs render with correct items in correct order
- [ ] SlipRow layout fits 375px without horizontal scroll
- [ ] OB/REC/CB inputs trigger numeric keyboard on mobile
- [ ] SALE and ₹AMT update in real time as user types
- [ ] Rows with SALE=0 are visually dimmed
- [ ] OB pre-fills from previous show's closing stock silently
- [ ] Main Counter running total updates live
- [ ] BMS Combo renders as lump ₹ input (no OB/REC/CB)
- [ ] Parking expected calculates correctly per vehicle type
- [ ] Parking gap shows correct colour and message
- [ ] Each slip saves independently to correct Supabase table
- [ ] "✓ Saved" toast appears after save
- [ ] Show status updates to Complete after all 3 slips saved
- [ ] Design matches design/04-show.png and design/05-parking.png closely
- [ ] `npm run build` passes with no TypeScript errors

---

## When done

Update CLAUDE.md: mark Slice 3 as ✅ Complete.
Add session log entry: date + "Slice 3 — three slips, OB carry-forward, parking gap"
Commit: `feat(slice-3): main counter, popcorn, cool drinks slips`
Come back to claude.ai to start Slice 4.
