import type { VercelRequest, VercelResponse } from '@vercel/node'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const rupee = (n: number) => '₹' + inrFmt.format(Math.round(n))

const ALLOWED_ORIGIN = 'https://swagath-central.vercel.app'

// Simple in-memory rate limit — resets if the function instance is recycled,
// but bounds abuse within a warm instance (max 10 requests/hour per IP)
const rateLimitMap = new Map<string, { count: number, resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// Strip prompt-injection attempts and cap length on any free-text field
// that originates from user-entered data (movie names, theatre names, etc.)
function sanitizeText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return ''
  let s = input
  s = s.split(/\n\s*---/)[0]
  s = s.replace(/ignore (all |any )?previous instructions/gi, '')
  s = s.replace(/[\r\n]+/g, ' ').trim()
  return s.slice(0, maxLen)
}

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
  grossProfit: number
  profitMargin: number
  wastageItems: { name: string; qty: number; cost: number }[]
  totalWastageCost: number
}

function isValidDayData(d: unknown): d is DaySummaryData {
  if (!d || typeof d !== 'object') return false
  const obj = d as Record<string, unknown>
  if (!Array.isArray(obj.shows)) return false
  if (!Array.isArray(obj.topItems)) return false
  if (!Array.isArray(obj.wastageItems)) return false
  const numericFields = ['foodTotal', 'popcornTotal', 'parkingExpected', 'parkingReported', 'parkingGap', 'expenses', 'bCash', 'grossProfit', 'profitMargin', 'totalWastageCost']
  for (const f of numericFields) {
    if (typeof obj[f] !== 'number') return false
  }
  if (obj.vsYesterday !== null && typeof obj.vsYesterday !== 'number') return false
  if (!obj.wastageItems.every(w =>
    w && typeof w === 'object'
    && typeof (w as Record<string, unknown>).name === 'string'
    && typeof (w as Record<string, unknown>).qty === 'number'
    && typeof (w as Record<string, unknown>).cost === 'number',
  )) return false
  return obj.shows.every(s =>
    s && typeof s === 'object'
    && typeof (s as Record<string, unknown>).n === 'number'
    && typeof (s as Record<string, unknown>).occ === 'number'
    && typeof (s as Record<string, unknown>).revenue === 'number',
  )
}

function buildPrompt(theatreName: string, date: string, d: DaySummaryData): string {
  const safeTheatreName = sanitizeText(theatreName, 100)
  const dayOfWeek = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' })
  const total = d.shows.reduce((s, sh) => s + sh.revenue, 0)

  const showLines = d.shows
    .map(s => `Show ${s.n} · ${sanitizeText(s.time, 20)} · ${sanitizeText(s.movie, 100)} · ${s.occ}% occupancy · ${rupee(s.revenue)}`)
    .join('\n')

  const topItemLines = d.topItems.map(it => `${sanitizeText(it.name, 50)} (${rupee(it.revenue)})`).join(', ')

  const vsYesterdayLine = d.vsYesterday != null
    ? `vs yesterday: ${d.vsYesterday >= 0 ? '+' : ''}${d.vsYesterday}%`
    : 'vs yesterday: not available'

  return `You are an operations advisor for a single-screen cinema in Bangalore, India.
Write a concise daily operations summary for the owner in 3-4 short paragraphs.
Be direct, specific, and use the actual numbers. Write like a smart colleague, not a chatbot.
Currency is Indian Rupees (₹). Use Indian number formatting.

Theatre: ${safeTheatreName}
Date: ${date} (${dayOfWeek})

SHOW SUMMARY:
${showLines}

FOOD SALES:
Total: ${rupee(d.foodTotal)}
Top items: ${topItemLines || 'none'}
Popcorn revenue: ${rupee(d.popcornTotal)}

PARKING:
Expected: ${rupee(d.parkingExpected)}, Collected: ${rupee(d.parkingReported)}, Gap: ${rupee(d.parkingGap)}

WASTAGE:
${d.totalWastageCost > 0
  ? `Total cost loss: ${rupee(d.totalWastageCost)}. Top items: ${d.wastageItems.slice(0, 3).map(w => `${sanitizeText(w.name, 50)} (${w.qty} units, ${rupee(w.cost)})`).join(', ')}`
  : 'No wastage recorded today.'}

DAY TOTAL:
Revenue: ${rupee(total)}
Gross Profit: ${rupee(d.grossProfit)} (${d.profitMargin}% margin)
Expenses: ${rupee(d.expenses)}
Net Profit: ${rupee(d.grossProfit - d.expenses)}
Balance Cash: ${rupee(d.bCash)}

${vsYesterdayLine}

Write the summary now. 3-4 paragraphs, no headers, no bullet points.
End with one specific actionable observation for tomorrow.`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim()
    ?? req.socket.remoteAddress
    ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('GROQ_API_KEY not configured')
    return res.status(500).json({ error: 'Summary generation is not available right now.' })
  }

  const { theatreName, date, dayData } = req.body as { theatreName?: unknown; date?: unknown; dayData?: unknown }
  if (typeof theatreName !== 'string' || typeof date !== 'string' || !isValidDayData(dayData)) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

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
      console.error('Groq API error:', errText)
      return res.status(502).json({ error: 'Summary generation failed. Please try again.' })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    return res.status(200).json({ summary: text })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Summary generation failed. Please try again.' })
  }
}
