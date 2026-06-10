# Slice 6 — AI Daily Summary
## Task Brief for Claude Code

> Read CLAUDE.md first. Slices 1–5 must be complete.
> Design reference: `design/insights-ai-summary/app/screen-ai-summary.jsx`
> Design reference: `design/insights-ai-summary/app/ai-summary-data.jsx`
> Screenshots: `ai-01-before.png` through `ai-06-adjust.png`

---

## Mission
Build the AI Daily Summary screen — triggered after Day Close.
Uses Groq (free tier, Llama 3.3 70B) via a Vercel serverless function.
Generates a natural language operations summary from the day's real data.

---

## Architecture

```
DayClosePage
    → "Generate AI Summary" button
    → navigates to /summary/:theatreId/:date

AISummaryPage (client)
    → fetches day data from Supabase
    → calls /api/generate-summary (Vercel serverless)
    → displays result

/api/generate-summary (Vercel serverless function)
    → receives structured day data as JSON
    → calls Groq API with Llama 3.3 70B
    → returns narrative + structured insights
```

The Groq API key lives ONLY in the Vercel serverless function — never in the frontend.

---

## Step 1 — Environment setup

Add to `.env.local`:
```
GROQ_API_KEY=your_groq_api_key_here
```

Add to Vercel dashboard environment variables (same key).

Get free API key at: console.groq.com

---

## Step 2 — Vercel serverless function

Create `api/generate-summary.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { theatreName, date, dayData } = req.body

  // Build structured prompt from dayData
  const prompt = buildPrompt(theatreName, date, dayData)

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.4,
    }),
  })

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ''
  return res.status(200).json({ summary: text })
}
```

**The prompt structure (`buildPrompt`):**

```
You are an operations advisor for a single-screen cinema in Bangalore, India.
Write a concise daily operations summary for the owner in 3-4 short paragraphs.
Be direct, specific, and use the actual numbers. Write like a smart colleague, not a chatbot.
Currency is Indian Rupees (₹). Use Indian number formatting.

Theatre: {theatreName}
Date: {date} ({dayOfWeek})

SHOW SUMMARY:
{shows: number, time, movie, occupancy%, total revenue each}

FOOD SALES:
Total: ₹{foodTotal}
Top items: {top 3 items by revenue}
Popcorn revenue: ₹{popcornTotal}

PARKING:
Expected: ₹{expected}, Collected: ₹{reported}, Gap: ₹{gap}

DAY TOTAL:
Revenue: ₹{total}, Expenses: ₹{expenses}, Balance: ₹{bCash}

vs yesterday: {+/-X%} (if available from last 2 entries in DB)

Write the summary now. 3-4 paragraphs, no headers, no bullet points.
End with one specific actionable observation for tomorrow.
```

---

## Step 3 — AISummaryPage.tsx

Route: `/summary/:theatreId/:date`

Match `design/insights-ai-summary/app/screen-ai-summary.jsx` exactly.
Reference all 6 screenshots for the different states.

**State 1 — Before generation (`ai-01-before.png`)**
- Header: back arrow + "Daily Summary" + theatre name + date
- Large amber "Generate AI Summary" button with sparkle icon
- Subtitle: "Powered by Groq · Usually takes 3–5 seconds"
- Below button: a preview of the Performance Snapshot (total revenue, best show)
  already computed from Supabase data (no AI needed for this part)

**State 2 — Loading (`ai-02-loading.png`)**
- Pulsing skeleton cards (amber shimmer animation)
- Muted text: "Reading today's numbers..."
- 3 skeleton blocks of varying height

**State 3 — After generation (`ai-03-after-top.png`, `ai-04-items-catering.png`, `ai-05-parking.png`)**

Section 1 — Performance Snapshot (same as before state, now fully visible):
- Total revenue in large amber monospace
- vs yesterday: green ▲ or red ▼ with %
- Best show card + Avg occupancy card side by side

Section 2 — AI Narrative:
- Dark card with amber left border (3px)
- AI badge (sparkle + "AI" text, amber)
- "Daily read" subtitle in muted
- The generated text, 3-4 paragraphs
- Subtle fade-in animation per paragraph

Section 3 — Item Intelligence (two cards side by side):
- Top performer: green check icon, item name, units, revenue, trend ↑
- Underperformer: amber warn icon, item name, suggestion text
- Derived from actual slip data — highest and lowest revenue items

Section 4 — Catering for Tomorrow:
- "For Tomorrow" card
- Tomorrow's date + day name
- Top 5 suggested items with qty + trend arrow
- "Based on {n} similar shows" footnote
- Amber "Looks good" + ghost "Adjust" buttons
- Adjust mode: inline steppers (match `ai-06-adjust.png`)

Section 5 — Parking Alert (conditional — only if gap > 0):
- Red-tinted card (`ai-05-parking.png`)
- Gap amount in large red monospace
- "Staff short by ₹{gap} today"
- Consecutive days flag if gap > 0 for 3+ days

Bottom: ghost "Regenerate" button

**iPad layout:** Item Intelligence + Catering side by side

---

## Step 4 — DayClosePage integration

Add "Generate AI Summary" button to DayClosePage, below "Download Day Report":

```tsx
<button onClick={() => navigate(`/summary/${theatreId}/${date}`)}>
  Generate AI Summary
</button>
```

Style: purple chip background, sparkle icon, "Powered by Groq" subtitle in muted.
Only show after day has been saved (isSaved state is true).

---

## Step 5 — Data computation (client-side, no AI)

Before calling Groq, compute these from Supabase data:

```typescript
interface DaySummaryData {
  theatreName: string
  date: string
  shows: { n: number, time: string, movie: string, occ: number, revenue: number }[]
  foodTotal: number
  popcornTotal: number
  mainCounterTotal: number
  coolDrinksTotal: number
  parkingExpected: number
  parkingReported: number
  parkingGap: number
  topItems: { name: string, revenue: number }[]  // top 3
  expenses: number
  bCash: number
  vsYesterday: number | null  // % change, null if no yesterday data
}
```

Fetch yesterday's day row from `theatre_days` and compute vsYesterday.
Pass `DaySummaryData` to the serverless function — never raw Supabase rows.

---

## Acceptance criteria

- [ ] Groq API key in Vercel env vars, never in frontend code
- [ ] Serverless function returns narrative in < 10 seconds
- [ ] Before state shows performance snapshot + generate button
- [ ] Loading state shows pulsing skeletons
- [ ] After state shows all 5 sections
- [ ] AI narrative is data-accurate (numbers match the day's actual figures)
- [ ] Item intelligence derives from real slip data
- [ ] Catering suggestions use same logic as Slice 5
- [ ] Parking alert only shows when gap > 0
- [ ] Adjust mode works with steppers
- [ ] "Generate AI Summary" button appears on DayClosePage after save
- [ ] Regenerate button works (re-calls API)
- [ ] Works on 375px mobile
- [ ] iPad shows 2-column for sections 3+4
- [ ] `npm run build` passes

---

## When done

Update CLAUDE.md: mark Slice 6 as ✅ Complete.
Add session log: date + "Slice 6 — AI daily summary via Groq, Vercel serverless"
Commit: `feat(slice-6): AI daily summary, Groq integration, serverless function`

**Phase 2 complete. Swagath Central is now a full AI-powered theatre ops platform.**
