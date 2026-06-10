# Slice 5 — Insights Dashboard
## Task Brief for Claude Code

> Read CLAUDE.md first. Slices 1–4 must be complete.
> Design reference files are in `design/insights-ai-summary/`.
> Read `design/insights-ai-summary/app/screen-insights.jsx` for exact component structure.
> Reference screenshots: `insights-overview.png`, `insights-top-items.png`, `insights-parking-trend.png`

---

## Mission
Build the Insights screen — a data analytics dashboard showing revenue trends,
show performance, top items, catering suggestions, and parking gap trend.
Also write a seed data script so the screen looks meaningful from day one.

---

## Install dependencies first

```bash
npm install recharts
```

---

## Step 1 — Seed data script (run before building UI)

Create `scripts/seed-demo-data.ts`.

Inserts 14 days of realistic fake show data for both Sandhya and Manasa.
All fake rows use `movie_name` prefixed with `[DEMO]` for easy bulk deletion later.

The script should:
1. Sign in as `chaitanya58@gmail.com` using `THEATRE_PASSWORD` from `.env.local`
2. For each of the last 14 days (today − 1 through today − 14):
   - Create a `theatre_days` row for both theatres
   - Insert 3–5 shows per theatre per day with realistic data:
     - Movie names: `[DEMO] KGF Chapter 2`, `[DEMO] Pushpa 2`, `[DEMO] Kantara`, `[DEMO] RRR`
     - Occupancy: 60–95% for weekend shows, 40–70% for weekdays
     - Ticket counts: box 50–80, gold 150–200, silver 200–300
   - Insert `theatre_main_counter` rows with realistic upi_amount + cash_amount
   - Insert `theatre_popcorn` rows with cone sales + BMS combo amounts
   - Insert `theatre_cool_drinks` rows
   - Insert `theatre_parking` rows with scooter/auto/car counts and a small gap (~10% of days)
   - Insert `theatre_expenses` rows with wages ~₹14,500, other expenses

3. Print progress per day and a summary at end.
4. Never insert today's data — leave today for Chaitanya to enter himself.

Run with: `npx tsx scripts/seed-demo-data.ts`

Add a cleanup script `scripts/delete-demo-data.ts` that deletes all rows where
`movie_name LIKE '[DEMO]%'` across all tables. Run with: `npx tsx scripts/delete-demo-data.ts`

---

## Step 2 — Supabase queries for Insights

Create `src/lib/insightsQueries.ts` with these functions:

```typescript
// Revenue per day for last N days, per theatre or both
export async function fetchDailyRevenue(theatreId: string | 'both', days: number)
// Returns: { date: string, revenue: number, theatreId?: string }[]

// Revenue per show slot (Show 1–5) averaged over the date range
export async function fetchShowPerformance(theatreId: string | 'both', days: number)
// Returns: { slot: string, avgRevenue: number, avgOccupancy: number }[]

// Top 5 items by total revenue over the date range
export async function fetchTopItems(theatreId: string | 'both', days: number)
// Returns: { name: string, revenue: number, units: number }[]
// Must query both theatre_main_counter and theatre_cool_drinks using known prices from prices.ts

// Parking gap per day for last 30 days
export async function fetchParkingGapTrend(theatreId: string, days: number)
// Returns: { date: string, gap: number }[]
// gap = expected - reported, per show, summed per day

// Catering suggestions based on similar past shows
export async function fetchCateringSuggestions(theatreId: string)
// Returns top 5 items with suggested qty and trend (up/down/flat)
// Based on: average sales of each item on the same day-of-week over last 4 weeks
```

---

## Step 3 — InsightsPage.tsx

Route: `/insights`
Accessible from Home via the chart icon (already wired).

Match `design/insights-ai-summary/app/screen-insights.jsx` exactly for layout and components.
Reference screenshots in `design/insights-ai-summary/screenshots/`.

**Header:**
- Back arrow → Home
- "Insights" title
- Date range pills: This Week / This Month / Last 30 Days (purple chip style, active = amber)

**Theatre selector:**
- Three pills: Sandhya / Manasa / Both
- Amber active state
- Changes all charts below

**Section 1 — Revenue Overview** (line chart)
- Recharts LineChart, dark grid, amber line
- Both mode: two lines (Sandhya amber + Manasa purple), with legend
- X axis: date labels (Mon, Tue etc. for week; dates for month)
- Y axis: ₹ in Indian format
- Min height 200px
- Empty state if < 3 days of data

**Section 2 — Show Performance** (horizontal bar chart)
- Recharts BarChart, horizontal
- X axis: show slots (Show 1 through max shows)
- Bars: amber, show avg revenue per slot
- Label: ₹ amount on bar end

**Section 3 — Top Items This Week** (horizontal bar chart)
- Top 5 items by revenue
- Amber bars, item name on left, ₹ on right
- Computed from slip data × prices

**Section 4 — Catering Suggestions**
- Card titled "For Tomorrow"
- Movie name + expected occupancy if available (from tomorrow's shows if entered, else "—")
- Item rows: name | suggested qty | trend arrow (↑↓→)
- "Based on {n} similar shows" footnote in muted
- Two buttons: amber "Looks good" + ghost "Adjust"
- Adjust mode: inline steppers per item (+ / − buttons)
- Match `design/insights-ai-summary/app/screen-insights.jsx` CateringSuggestions component

**Section 5 — Parking Gap Trend** (line chart)
- 30-day line, red line if trending up, green if stable
- If gap trending up → amber warning banner "Parking gaps increasing — review with staff"
- If stable → green chip "Gaps stable"

**iPad layout:**
- Sections 2 + 3 side by side (grid, 2 columns)
- Everything else full width

**Empty states:**
- Each section shows film reel icon + "Not enough data yet — keep logging shows"
- Show after < 3 data points

---

## Step 4 — Navigation

InsightsPage already has a route in App.tsx. Verify the chart icon in HomePage navigates to `/insights`. If not, fix it.

---

## Step 5 — Net Profit display

Import `COSTS` from `prices.ts` (already exported from Slice 4 price update).

In the Top Items section, show alongside revenue:
- Revenue column (amber)
- Profit column = (sale × selling_price) − (sale × cost_price) in green
- Profit margin % in muted

This uses `COSTS` from `prices.ts` to derive profit without storing it in the DB.

---

## Acceptance criteria

- [ ] Seed script inserts 14 days of data for both theatres
- [ ] Cleanup script deletes all `[DEMO]` rows cleanly
- [ ] Insights page loads from Home chart icon
- [ ] Theatre toggle switches all charts
- [ ] Date range pills change chart data
- [ ] Revenue line chart renders with real data
- [ ] Show performance bar chart renders
- [ ] Top items chart shows correct items and revenue
- [ ] Net profit visible alongside revenue in top items
- [ ] Catering suggestions show with trend arrows
- [ ] Adjust mode works with steppers
- [ ] Parking gap trend shows correct colour + banner
- [ ] Empty states show when < 3 data points
- [ ] iPad shows 2-column layout for sections 2+3
- [ ] Works on 375px mobile without horizontal scroll
- [ ] `npm run build` passes

---

## When done

Update CLAUDE.md: mark Slice 5 as ✅ Complete.
Add session log: date + "Slice 5 — Insights dashboard, seed data script"
Commit: `feat(slice-5): insights dashboard, charts, catering suggestions, seed data`
Come back to claude.ai to start Slice 6.
