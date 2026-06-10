import type { VercelRequest, VercelResponse } from '@vercel/node'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const rupee = (n: number) => '₹' + inrFmt.format(Math.round(n))

interface ShowSummaryLine { n: number; time: string; movie: string; occ: number; revenue: number }
interface DaySummaryData {
  theatreName: string
  date: string
  shows: ShowSummaryLine[]
  foodTotal: number
  popcornTotal: number
  parkingExpected: number
  parkingReported: number
  parkingGap: number
  topItems: { name: string; revenue: number }[]
  expenses: number
  bCash: number
  vsYesterday: number | null
}

function buildPrompt(theatreName: string, date: string, d: DaySummaryData): string {
  const dayOfWeek = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' })
  const total = d.shows.reduce((s, sh) => s + sh.revenue, 0)

  const showLines = d.shows
    .map(s => `Show ${s.n} · ${s.time} · ${s.movie} · ${s.occ}% occupancy · ${rupee(s.revenue)}`)
    .join('\n')

  const topItemLines = d.topItems.map(it => `${it.name} (${rupee(it.revenue)})`).join(', ')

  const vsYesterdayLine = d.vsYesterday != null
    ? `vs yesterday: ${d.vsYesterday >= 0 ? '+' : ''}${d.vsYesterday}%`
    : 'vs yesterday: not available'

  return `You are an operations advisor for a single-screen cinema in Bangalore, India.
Write a concise daily operations summary for the owner in 3-4 short paragraphs.
Be direct, specific, and use the actual numbers. Write like a smart colleague, not a chatbot.
Currency is Indian Rupees (₹). Use Indian number formatting.

Theatre: ${theatreName}
Date: ${date} (${dayOfWeek})

SHOW SUMMARY:
${showLines}

FOOD SALES:
Total: ${rupee(d.foodTotal)}
Top items: ${topItemLines || 'none'}
Popcorn revenue: ${rupee(d.popcornTotal)}

PARKING:
Expected: ${rupee(d.parkingExpected)}, Collected: ${rupee(d.parkingReported)}, Gap: ${rupee(d.parkingGap)}

DAY TOTAL:
Revenue: ${rupee(total)}, Expenses: ${rupee(d.expenses)}, Balance: ${rupee(d.bCash)}

${vsYesterdayLine}

Write the summary now. 3-4 paragraphs, no headers, no bullet points.
End with one specific actionable observation for tomorrow.`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' })

  const { theatreName, date, dayData } = req.body as { theatreName: string; date: string; dayData: DaySummaryData }
  if (!theatreName || !date || !dayData) return res.status(400).json({ error: 'Missing theatreName, date, or dayData' })

  const prompt = buildPrompt(theatreName, date, dayData)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.4,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(502).json({ error: `Groq API error: ${errText}` })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    return res.status(200).json({ summary: text })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
