/**
 * Seed demo data for the Insights dashboard (Slice 5).
 *
 * Inserts 14 days of realistic show data for both Sandhya and Manasa.
 * Every inserted show has movie_name prefixed with "[DEMO] " so it can be
 * bulk-deleted later with scripts/delete-demo-data.ts.
 *
 * BEFORE RUNNING: .env.local must have THEATRE_PASSWORD=<chaitanya's password>
 *
 * Run:
 *   npx tsx scripts/seed-demo-data.ts
 *
 * (ts-node does not work with this project's ESM setup — use tsx)
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { PRICES } from '../src/lib/prices'

config({ path: '.env.local' })

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const PASSWORD     = process.env.THEATRE_PASSWORD ?? ''
const EMAIL        = 'chaitanya58@gmail.com'

if (!SUPABASE_URL || !ANON_KEY || !PASSWORD) {
  console.error('ERROR: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / THEATRE_PASSWORD missing from .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, ANON_KEY)

// ── Item catalogues: DB column prefix -> [PRICES key, base sold qty @ 100% occ] ──
const MC_ITEMS: [string, keyof typeof PRICES, number][] = [
  ['veg_puff', 'veg_puff', 60], ['egg_puff', 'egg_puff', 35], ['h_cake', 'h_cake', 25],
  ['jam_bun', 'jam_bun', 20], ['ckn_puff', 'ckn_puff', 30], ['bs', 'bs', 15],
  ['samosa', 'samosa', 25], ['tin', 'tin', 15], ['frooty', 'frooty', 35],
  ['chips', 'chips', 40], ['frymes', 'frymes', 30], ['water', 'water', 70],
  ['milkshake', 'milkshake', 20], ['lays', 'lays', 35],
]
const PC_ITEMS: [string, keyof typeof PRICES, number][] = [
  ['cone_60', 'cone_60', 50], ['cone_130', 'cone_130', 35], ['cone_200', 'cone_200', 18],
]
const CD_ITEMS: [string, keyof typeof PRICES, number][] = [
  ['water', 'cd_water', 50], ['tin', 'cd_tin', 15], ['tins2', 'cd_tin2', 10],
  ['frooty_trop', 'frooty_trop', 25], ['milkshake', 'cd_milkshake', 15],
  ['french_fries', 'french_fries', 18], ['veg_bites', 'veg_bites', 12],
  ['onion_samosa', 'onion_samosa', 10], ['ckn_popcorn', 'ckn_popcorn', 12],
  ['ckn_samosa', 'ckn_samosa', 8], ['ckn_nuggets', 'ckn_nuggets', 8],
  ['ice_cream1', 'ice_cream1', 10], ['ice_cream2', 'ice_cream2', 8],
  ['ice_cream3', 'ice_cream3', 8], ['tea_coffee', 'tea_coffee', 12],
]

const MOVIES = ['[DEMO] KGF Chapter 2', '[DEMO] Pushpa 2', '[DEMO] Kantara', '[DEMO] RRR']
const SHOW_TIMES = ['10:15', '13:30', '16:45', '19:30', '22:15']

function rngInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ob/rec/cb that net to `sold` units, with believable carry-forward variance
function seedRow(sold: number, idx: number) {
  const ob = 15 + (idx % 5) * 3
  const rec = 25
  const cb = Math.max(0, ob + rec - sold)
  return { ob, rec, cb, sale: sold }
}

function flatItems(items: [string, keyof typeof PRICES, number][], occ: number) {
  const flat: Record<string, number> = {}
  let revenue = 0
  items.forEach(([prefix, priceKey, base], idx) => {
    const sold = Math.max(0, Math.round(base * occ * (0.85 + Math.random() * 0.3)))
    const row = seedRow(sold, idx)
    flat[`${prefix}_ob`] = row.ob
    flat[`${prefix}_rec`] = row.rec
    flat[`${prefix}_cb`] = row.cb
    flat[`${prefix}_sale`] = row.sale
    revenue += row.sale * PRICES[priceKey]
  })
  return { flat, revenue }
}

function splitUpiCash(total: number): { upi: number; cash: number } {
  const upi = Math.round(total * (0.5 + Math.random() * 0.1))
  return { upi, cash: total - upi }
}

async function run() {
  console.log(`Signing in as ${EMAIL}...`)
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1) }
  console.log('Signed in OK\n')

  const { data: theatres, error: tErr } = await supabase
    .from('theatre_theatres')
    .select('id,name,capacity')
    .in('name', ['Sandhya', 'Manasa'])
  if (tErr || !theatres || theatres.length !== 2) {
    console.error('Cannot load theatres:', tErr?.message)
    process.exit(1)
  }

  const counts = { days: 0, shows: 0, mc: 0, pc: 0, cd: 0, parking: 0, expenses: 0, staffWages: 0 }

  // today = 2026-06-09. Candidate window: today-1 .. today-21, never touching today.
  const today = new Date(2026, 5, 9)
  const candidateDates: { dateStr: string; dow: number }[] = []
  for (let i = 1; i <= 21; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    candidateDates.push({ dateStr: fmtDate(d), dow: d.getDay() })
  }

  for (const theatre of theatres) {
    const theatreId = theatre.id as string
    const capacity = (theatre.capacity as number) || (theatre.name === 'Sandhya' ? 714 : 524)
    const language = theatre.name === 'Sandhya' ? 'Kannada' : 'Telugu'

    // Find which candidate dates already have a theatre_days row — never touch those (real data).
    const { data: existingDays } = await supabase
      .from('theatre_days').select('date')
      .eq('theatre_id', theatreId)
      .in('date', candidateDates.map(c => c.dateStr))
    const existingDates = new Set((existingDays ?? []).map(r => r.date as string))

    const freshDates = candidateDates.filter(c => !existingDates.has(c.dateStr)).slice(0, 14)
    if (existingDates.size > 0) {
      console.log(`  ${theatre.name}: skipping ${existingDates.size} date(s) with existing real data: ${[...existingDates].join(', ')}`)
    }

    for (const { dateStr, dow } of freshDates) {
      const isWeekend = dow === 0 || dow === 5 || dow === 6

      const { data: newDay, error: dayErr } = await supabase
        .from('theatre_days').insert({ theatre_id: theatreId, date: dateStr }).select('id').single()
      if (dayErr || !newDay) { console.error(`  Day insert failed (${theatre.name} ${dateStr}):`, dayErr?.message); continue }
      const dayId = newDay.id as string
      counts.days++

      const numShows = isWeekend ? rngInt(4, 5) : rngInt(3, 4)
      const movieName = MOVIES[rngInt(0, MOVIES.length - 1)]
      let lastOccupancyPct = 0

      for (let n = 1; n <= numShows; n++) {
        const box = isWeekend ? rngInt(65, 80) : rngInt(50, 65)
        const gold = isWeekend ? rngInt(175, 200) : rngInt(150, 175)
        const silver = isWeekend ? rngInt(250, 300) : rngInt(200, 250)
        const ticketCount = Math.min(box + gold + silver, capacity)
        const occupancyPct = Math.min(100, Math.round((ticketCount / capacity) * 100))
        const occ = occupancyPct / 100
        lastOccupancyPct = occupancyPct

        const { data: show, error: showErr } = await supabase
          .from('theatre_shows')
          .insert({
            day_id: dayId,
            show_number: n,
            show_date: dateStr,
            start_time: SHOW_TIMES[n - 1],
            movie_name: movieName,
            language,
            is_fan_show: false,
            box_tickets: box,
            gold_tickets: gold,
            silver_tickets: silver,
            ticket_count: ticketCount,
            occupancy_pct: occupancyPct,
          })
          .select('id')
          .single()
        if (showErr || !show) { console.error(`  Show insert failed (${theatre.name} ${dateStr} #${n}):`, showErr?.message); continue }
        counts.shows++
        const showId = show.id as string

        // ── Main counter ──
        const mc = flatItems(MC_ITEMS, occ)
        const mcSplit = splitUpiCash(Math.round(mc.revenue))
        const { error: mcErr } = await supabase.from('theatre_main_counter')
          .insert({ show_id: showId, ...mc.flat, upi_amount: mcSplit.upi, cash_amount: mcSplit.cash })
        if (!mcErr) counts.mc++; else console.error('  MC insert failed:', mcErr.message)

        // ── Popcorn (+ BMS combo lump) ──
        const pc = flatItems(PC_ITEMS, occ)
        const bmsAmount = Math.round(3000 * occ * (0.85 + Math.random() * 0.3))
        const pcSplit = splitUpiCash(Math.round(pc.revenue) + bmsAmount)
        const { error: pcErr } = await supabase.from('theatre_popcorn')
          .insert({ show_id: showId, ...pc.flat, bms_combo_amount: bmsAmount, upi_amount: pcSplit.upi, cash_amount: pcSplit.cash })
        if (!pcErr) counts.pc++; else console.error('  Popcorn insert failed:', pcErr.message)

        // ── Cool drinks ──
        const cd = flatItems(CD_ITEMS, occ)
        const cdSplit = splitUpiCash(Math.round(cd.revenue))
        const { error: cdErr } = await supabase.from('theatre_cool_drinks')
          .insert({ show_id: showId, ...cd.flat, upi_amount: cdSplit.upi, cash_amount: cdSplit.cash })
        if (!cdErr) counts.cd++; else console.error('  Cool drinks insert failed:', cdErr.message)

        // ── Parking ──
        const scooter = Math.round(80 * occ * (0.85 + Math.random() * 0.3))
        const auto = Math.round(18 * occ * (0.85 + Math.random() * 0.3))
        const car = Math.round(40 * occ * (0.85 + Math.random() * 0.3))
        const expected = scooter * PRICES.scooter + auto * PRICES.auto + car * PRICES.car
        // ~10% of days: report a small gap (short by 5-15%)
        const hasGap = (Number(dateStr.slice(-2)) + n) % 10 === 0
        const reported = hasGap ? Math.round(expected * (0.85 + Math.random() * 0.1)) : expected
        const { error: pkErr } = await supabase.from('theatre_parking')
          .insert({ show_id: showId, scooter_count: scooter, auto_count: auto, car_count: car, reported_amount: reported })
        if (!pkErr) counts.parking++; else console.error('  Parking insert failed:', pkErr.message)
      }

      // ── Expenses (one row per theatre per day; day is freshly created above, so plain insert) ──
      const { error: expErr } = await supabase.from('theatre_expenses').insert({
        day_id: dayId,
        wages: rngInt(14000, 15000),
        staff_coffee: rngInt(200, 400),
        water_cans: rngInt(150, 300),
        lab_food: rngInt(300, 600),
        wastage: rngInt(100, 300),
        others_description: '',
        others_amount: rngInt(0, 200),
        popcorn_upi: 0, main_counter_upi: 0, cool_drink_upi: 0, live_counter_upi: 0, bms_upi: 0,
      })
      if (!expErr) counts.expenses++; else console.error('  Expenses insert failed:', expErr.message)

      // ── Staff wages ──
      const staff = [
        { staff_name: 'Ravi (Projection)', amount: rngInt(800, 900) },
        { staff_name: 'Lakshmi (Counter)', amount: rngInt(600, 700) },
        { staff_name: 'Suresh (Parking)', amount: rngInt(500, 600) },
      ]
      const { error: swErr } = await supabase.from('theatre_staff_wages')
        .insert(staff.map(s => ({ day_id: dayId, ...s })))
      if (!swErr) counts.staffWages += staff.length; else console.error('  Staff wages insert failed:', swErr.message)

      console.log(`  ${theatre.name} ${dateStr}: ${numShows} shows, last occ ~${lastOccupancyPct}%`)
    }
  }

  console.log('\n── Summary ──────────────────────────────────────────────')
  console.log(`  Days:         ${counts.days}`)
  console.log(`  Shows:        ${counts.shows}`)
  console.log(`  Main Counter: ${counts.mc}`)
  console.log(`  Popcorn:      ${counts.pc}`)
  console.log(`  Cool Drinks:  ${counts.cd}`)
  console.log(`  Parking:      ${counts.parking}`)
  console.log(`  Expenses:     ${counts.expenses}`)
  console.log(`  Staff Wages:  ${counts.staffWages}`)
  console.log('\nDone. All shows tagged with "[DEMO] " prefix — run scripts/delete-demo-data.ts to clean up.')
}

run().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
