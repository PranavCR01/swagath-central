# Slice 2 — Home + Day + Show Entry
## Task Brief for Claude Code

> Paste this entire file into your Claude Code session.
> Read CLAUDE.md first. Mark Slice 1 as complete before starting this.

---

## Mission
Build the home screen with theatre cards and the day/show entry flow.
By end of this slice, Chaitanya can select a theatre, see today's shows,
and add new shows with metadata (time, movie, occupancy etc.).

---

## What Supabase tables you'll touch
- `theatre_theatres` — read only (already seeded: Sandhya, Manasa)
- `theatre_days` — create if not exists for today
- `theatre_shows` — create, read, list

---

## Step 1 — src/hooks/useTheatres.ts

Fetch theatres for the logged-in user:

```typescript
// Query: select * from theatre_theatres where owner_id = auth.uid()
// Returns: Theatre[] 
// Shape: { id, name, created_at }
```

---

## Step 2 — HomePage.tsx

Layout: mobile-first, full screen, dark header with "Theatre Ops" + logout icon.

Two large cards, one per theatre (Sandhya, Manasa). Each card shows:
- Theatre name (large)
- Today's date
- "X shows entered today" (query theatre_days + theatre_shows for today)
- Today's running total in ₹ (sum of show totals for today — compute from slip data)
- "Open Today →" button → navigates to `/theatre/:theatreId/day/:date`

If no data yet for today, show "No shows yet" and ₹0.

---

## Step 3 — src/hooks/useDay.ts

```typescript
// Given theatreId + date:
// 1. Check if theatre_days row exists for this theatre + date
// 2. If not, create it (upsert)
// 3. Return the day row
```

---

## Step 4 — src/hooks/useShows.ts

```typescript
// Given dayId:
// Fetch all shows for this day, ordered by show_number asc
// For each show, also fetch whether main_counter, popcorn, cool_drinks rows exist
// (to determine Complete vs Incomplete status)
```

---

## Step 5 — DayPage.tsx

Route: `/theatre/:theatreId/day/:date`

Header: Theatre name + date + back arrow to Home.

Body:
- List of ShowCards for the day (ordered by show_number)
- Each ShowCard shows:
  - Show number + start time + movie name
  - Language tag + Fan Show badge (if applicable)
  - Occupancy % + ticket count
  - Status badge: ✅ Complete | 🔄 Incomplete
  - Tap → navigate to `/theatre/:theatreId/day/:date/show/:showId`
- "Add Show" button at bottom (fixed, always visible)
- "Close Day" button (only visible when at least 1 show exists)

---

## Step 6 — Add Show form (modal or bottom sheet)

Fields:
- Show number: auto-incremented (next available, e.g. if 3 shows exist → defaults to 4)
- Start time: time picker (HH:MM)
- Movie name: text input
- Language: select → Kannada / Hindi / Tamil / Telugu / English / Other
- Fan show: toggle (default off)
- Ticket count: numeric input
- Occupancy %: numeric input (0-100)

On save → insert into `theatre_shows`, close modal, refresh list.
Validation: start time + movie name are required. All others optional.

---

## Step 7 — ShowCard.tsx component

Reusable card used in DayPage. Props:
```typescript
{
  showNumber: number
  startTime: string
  movieName: string
  language: string
  isFanShow: boolean
  ticketCount?: number
  occupancyPct?: number
  isComplete: boolean
  onClick: () => void
}
```

---

## Acceptance criteria

- [ ] Home screen loads and shows Sandhya + Manasa cards
- [ ] Each card shows correct show count for today
- [ ] Tapping a theatre card opens the Day view
- [ ] Day view lists existing shows for today
- [ ] "Add Show" opens the form
- [ ] Show can be saved with required fields only
- [ ] Show number auto-increments correctly
- [ ] New show appears in list immediately after save
- [ ] Complete vs Incomplete status shows correctly
- [ ] Back navigation works throughout
- [ ] Works on mobile width (375px)

---

## When done

Update CLAUDE.md: mark Slice 2 as ✅ Complete.
Commit: `feat(slice-2): home screen, day view, show entry`
Come back to claude.ai to start Slice 3.
