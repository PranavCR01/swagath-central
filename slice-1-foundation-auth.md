# Slice 1 — Foundation + Auth
## Task Brief for Claude Code

> Paste this entire file into your Claude Code session.
> Read CLAUDE.md first — it has the full data model, prices, and business logic.

---

## Mission
Scaffold the project, wire up Supabase, and get a working login screen.
No complex UI yet. Just a solid foundation everything else builds on.

---

## Step 1 — Scaffold

```bash
npm create vite@latest theatre-ops -- --template react-ts
cd theatre-ops

# Core dependencies
npm install \
  @supabase/supabase-js \
  react-router-dom \
  lucide-react \
  clsx \
  tailwind-merge

# Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui
npx shadcn@latest init
# Choose: TypeScript, Default style, Slate base color, CSS variables yes

# shadcn components for Slice 1
npx shadcn@latest add button input label card form
```

---

## Step 2 — Folder structure

Create this exact structure (empty files are fine for now):

```
src/
  components/
    ui/              ← shadcn auto-generates this
    SlipRow.tsx      ← leave empty, Slice 3 will fill it
    ShowCard.tsx     ← leave empty, Slice 2 will fill it
    TheatreCard.tsx  ← leave empty, Slice 2 will fill it
  pages/
    LoginPage.tsx    ← build this in Slice 1
    HomePage.tsx     ← leave empty
    DayPage.tsx      ← leave empty
    ShowPage.tsx     ← leave empty
    DayClosePage.tsx ← leave empty
    HistoryPage.tsx  ← leave empty
  lib/
    supabase.ts      ← build this in Slice 1
    prices.ts        ← build this in Slice 1
    calculations.ts  ← build this in Slice 1
  hooks/
    useTheatres.ts   ← leave empty
    useDay.ts        ← leave empty
    useShows.ts      ← leave empty
  App.tsx
  main.tsx
```

---

## Step 3 — Environment

Create `.env.local`:
```
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Create `.env.example` (committed to git):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Step 4 — src/lib/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## Step 5 — src/lib/prices.ts

Hardcode ALL item prices here. These never come from the DB.

```typescript
export const PRICES = {
  // Main Counter
  veg_puff: 40,
  egg_puff: 40,
  samosa: 80,
  ckn_puff: 40,
  h_cake: 40,
  jam_bun: 40,
  chips: 45,
  frymes: 40,
  kettle_chips: 40,
  water: 30,
  milkshake: 30,
  frooty: 40,
  tin: 70,

  // Popcorn
  cone_60: 60,
  cone_130: 130,
  cone_200: 200,
  // bms_combo has no unit price — entered as lump amount

  // Cool Drinks
  cd_water: 30,
  cd_tin: 70,
  frooty_trop: 40,
  cd_milkshake: 50,
  french_fries: 70,
  veg_bites: 70,
  onion_samosa: 80,
  ckn_popcorn: 80,
  ckn_samosa: 120,
  ckn_nuggets: 100,
  sandwich: 120,

  // Parking
  scooter: 20,
  auto: 40,
  car: 80,
} as const
```

---

## Step 6 — src/lib/calculations.ts

```typescript
// sale = ob + rec - cb (closing stock is whatever's left, we track sale directly)
export function calcSale(ob: number, rec: number, cb: number): number {
  return Math.max(0, ob + rec - cb)
}

// amount = sale × unit price
export function calcAmount(sale: number, price: number): number {
  return sale * price
}

// OB for next show = previous show's (ob + rec - cb - sale)
// i.e. what's physically left after the show
export function calcClosingStock(ob: number, rec: number, cb: number, sale: number): number {
  return Math.max(0, ob + rec - cb - sale)
}

// Parking expected revenue
export function calcParkingExpected(
  scooterCount: number,
  autoCount: number,
  carCount: number
): number {
  return scooterCount * 20 + autoCount * 40 + carCount * 80
}

// Parking gap (positive = staff owe money, negative = overpaid somehow)
export function calcParkingGap(expected: number, reported: number): number {
  return expected - reported
}

// Show total = main counter + popcorn + cool drinks + parking reported
export function calcShowTotal(
  mainCounterTotal: number,
  popcornTotal: number,
  coolDrinksTotal: number,
  parkingReported: number
): number {
  return mainCounterTotal + popcornTotal + coolDrinksTotal + parkingReported
}

// Day B.Cash = total sales - total expenses
export function calcBCash(totalSales: number, totalExpenses: number): number {
  return totalSales - totalExpenses
}
```

---

## Step 7 — React Router setup (App.tsx)

```typescript
// Routes to set up:
// / → redirect to /login if not authed, else /home
// /login → LoginPage
// /home → HomePage (protected)
// /theatre/:theatreId/day/:date → DayPage (protected)
// /theatre/:theatreId/day/:date/show/:showId → ShowPage (protected)
// /theatre/:theatreId/day/:date/close → DayClosePage (protected)
// /history → HistoryPage (protected)
```

Build a `ProtectedRoute` wrapper that checks Supabase session.
If no session → redirect to `/login`.

---

## Step 8 — LoginPage.tsx

Design: mobile-first, centered card on dark background.

- App title: "Theatre Ops" with a small film icon
- Subtitle: "Sandhya & Manasa"
- Email input
- Password input
- Login button (shows loading spinner while authenticating)
- Error message if login fails (wrong credentials etc.)
- No signup link — account is pre-created, owner just logs in

On success → navigate to `/home`.

---

## Acceptance criteria

- [ ] `npm run dev` runs without errors
- [ ] Login page renders at localhost:5173
- [ ] Logging in with chaitanya58@gmail.com works
- [ ] Wrong password shows an error message
- [ ] After login, redirected to /home (blank page is fine)
- [ ] Refreshing the page stays logged in (session persists)
- [ ] Navigating to /home without login redirects to /login
- [ ] `prices.ts` exports all items with correct prices
- [ ] `calculations.ts` exports all 6 functions
- [ ] No TypeScript errors

---

## When done

Update CLAUDE.md: mark Slice 1 as ✅ Complete.
Commit: `feat(slice-1): foundation, auth, prices, calculations`
Come back to claude.ai to start Slice 2.
