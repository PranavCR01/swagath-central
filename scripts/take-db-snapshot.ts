/**
 * Pre-cost-history database snapshot — read-only, no data modified.
 *
 * Dumps SELECT * from every theatre_ table to JSON files in
 * scripts/db-snapshot-pre-cost-history/, then computes the June 14
 * Sandhya Show Summary (MC / POP / CDS / Parking, per-show profit,
 * Gross Revenue, Gross Profit, Net Profit) as a known-good reference
 * to diff against after the effective-dated cost price feature ships.
 *
 * Run:
 *   npx tsx scripts/take-db-snapshot.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { PRICES, COSTS } from '../src/lib/prices'

config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const OUT_DIR    = join(__dirname, 'db-snapshot-pre-cost-history')

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const PASSWORD     = process.env.THEATRE_PASSWORD ?? ''
const EMAIL        = 'chaitanya58@gmail.com'

const SANDHYA_ID    = '628dba7b-322c-4afe-a8ea-d3cf8e40cbc1'
const SNAPSHOT_DATE = '2026-06-14'

if (!SUPABASE_URL || !ANON_KEY || !PASSWORD) {
  console.error('ERROR: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / THEATRE_PASSWORD missing from .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, ANON_KEY)

// ── Price / cost maps (mirrors insightsQueries.ts exactly) ──────────────────
const MC_PRICE: Record<string, number> = {
  veg_puff: PRICES.veg_puff, egg_puff: PRICES.egg_puff, h_cake: PRICES.h_cake,
  jam_bun: PRICES.jam_bun, ckn_puff: PRICES.ckn_puff,
  samosa: PRICES.samosa, tin: PRICES.tin, frooty: PRICES.frooty,
  chips: PRICES.chips, frymes: PRICES.frymes, water: PRICES.water,
  milkshake: PRICES.milkshake, kettle_chips: PRICES.kettle_chips,
}
const MC_COST: Record<string, number> = {
  veg_puff: COSTS.veg_puff, egg_puff: COSTS.egg_puff, h_cake: COSTS.h_cake,
  jam_bun: COSTS.jam_bun, ckn_puff: COSTS.ckn_puff,
  samosa: COSTS.samosa, tin: COSTS.tin, frooty: COSTS.frooty,
  chips: COSTS.chips, frymes: COSTS.frymes, water: COSTS.water,
  milkshake: COSTS.milkshake, kettle_chips: COSTS.kettle_chips,
}
const PC_PRICE: Record<string, number> = {
  cone_60: PRICES.cone_60, cone_130: PRICES.cone_130, cone_200: PRICES.cone_200,
}
const PC_COST: Record<string, number> = {
  cone_60: COSTS.cone_60, cone_130: COSTS.cone_130, cone_200: COSTS.cone_200,
}
// CD_DRINKS_PRICE — columns water/tin/frooty_trop/milkshake in theatre_cool_drinks
const CD_DRINKS_PRICE: Record<string, number> = {
  water: PRICES.cd_water, tin: PRICES.cd_tin,
  frooty_trop: PRICES.frooty_trop, milkshake: PRICES.cd_milkshake,
}
// CD_LIVE_PRICE — live-counter columns in theatre_cool_drinks
const CD_LIVE_PRICE: Record<string, number> = {
  french_fries: PRICES.french_fries, veg_bites: PRICES.veg_bites,
  onion_samosa: PRICES.onion_samosa, ckn_popcorn: PRICES.ckn_popcorn,
  ckn_samosa: PRICES.ckn_samosa, ckn_nuggets: PRICES.ckn_nuggets,
  ice_cream1: PRICES.ice_cream1, ice_cream2: PRICES.ice_cream2,
  ice_cream3: PRICES.ice_cream3, tea_coffee: PRICES.tea_coffee,
  sandwich: PRICES.sandwich,
}
// Full CD cost map (drinks + live combined), mirrors CD_COST in insightsQueries.ts
const CD_COST: Record<string, number> = {
  water: COSTS.cd_water, tin: COSTS.cd_tin, frooty_trop: COSTS.frooty_trop,
  milkshake: COSTS.cd_milkshake, french_fries: COSTS.french_fries, veg_bites: COSTS.veg_bites,
  onion_samosa: COSTS.onion_samosa, ckn_popcorn: COSTS.ckn_popcorn, ckn_samosa: COSTS.ckn_samosa,
  ckn_nuggets: COSTS.ckn_nuggets, ice_cream1: COSTS.ice_cream1, ice_cream2: COSTS.ice_cream2,
  ice_cream3: COSTS.ice_cream3, tea_coffee: COSTS.tea_coffee, sandwich: COSTS.sandwich,
}

// ── Calculation helpers (identical to insightsQueries.ts / DayClosePage) ────
type Row = Record<string, unknown> | null

function sumBySale(row: Row, priceMap: Record<string, number>): number {
  if (!row) return 0
  let total = 0
  for (const prefix in priceMap) {
    total += (Number(row[`${prefix}_sale`]) || 0) * priceMap[prefix]
  }
  return total
}

function sumByCost(row: Row, costMap: Record<string, number>): number {
  if (!row) return 0
  let total = 0
  for (const prefix in costMap) {
    const sale = Number(row[`${prefix}_sale`]) || 0
    const wst  = Number(row[`${prefix}_wst`])  || 0
    total += (sale + wst) * costMap[prefix]
  }
  return total
}

function calcParkingExpected(scooter: number, auto: number, car: number): number {
  return scooter * PRICES.scooter + auto * PRICES.auto + car * PRICES.car
}

// ── Tables to dump ───────────────────────────────────────────────────────────
const TABLES = [
  'theatre_theatres',
  'theatre_days',
  'theatre_shows',
  'theatre_main_counter',
  'theatre_popcorn',
  'theatre_cool_drinks',
  'theatre_parking',
  'theatre_expenses',
  'theatre_expense_others',
  'theatre_staff_wages',
]

async function run() {
  // Authenticate
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1) }
  console.log(`Authenticated as ${EMAIL}`)

  mkdirSync(OUT_DIR, { recursive: true })

  // ── 1. Dump all tables ───────────────────────────────────────────────────
  console.log(`\nDumping tables to ${OUT_DIR}`)
  const manifest: { table: string; rows: number; bytes: number; path: string }[] = []

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      console.error(`  ${table}: ERROR – ${error.message}`)
      continue
    }
    const json     = JSON.stringify(data ?? [], null, 2)
    const outPath  = join(OUT_DIR, `${table}.json`)
    writeFileSync(outPath, json, 'utf-8')
    const bytes = Buffer.byteLength(json, 'utf-8')
    manifest.push({ table, rows: (data ?? []).length, bytes, path: outPath })
    console.log(`  ✓ ${table}: ${(data ?? []).length} rows  (${(bytes / 1024).toFixed(1)} KB)`)
  }

  // Write manifest
  const manifestPath = join(OUT_DIR, '_manifest.json')
  writeFileSync(manifestPath, JSON.stringify({
    capturedAt: new Date().toISOString(),
    files: manifest.map(m => ({ table: m.table, rows: m.rows, sizeKB: +(m.bytes / 1024).toFixed(1) })),
  }, null, 2), 'utf-8')
  console.log(`  ✓ _manifest.json written`)

  // ── 2. June 14 Sandhya Show Summary ─────────────────────────────────────
  console.log(`\n── Sandhya Show Summary for ${SNAPSHOT_DATE} ──`)

  const { data: day } = await supabase
    .from('theatre_days').select('id')
    .eq('theatre_id', SANDHYA_ID).eq('date', SNAPSHOT_DATE).maybeSingle()

  if (!day) {
    console.log('  No theatre_days row found for Sandhya on this date — no show data to summarise.')
    return
  }

  const { data: shows } = await supabase
    .from('theatre_shows')
    .select('id,show_number,start_time,movie_name')
    .eq('day_id', day.id).order('show_number')

  if (!shows?.length) { console.log('  No shows found for this day.'); return }

  const showIds = shows.map(s => s.id as string)

  const [
    { data: mcRows }, { data: pcRows }, { data: cdRows }, { data: pkRows },
    { data: expRow }, { data: othersRows },
  ] = await Promise.all([
    supabase.from('theatre_main_counter').select('*').in('show_id', showIds),
    supabase.from('theatre_popcorn').select('*').in('show_id', showIds),
    supabase.from('theatre_cool_drinks').select('*').in('show_id', showIds),
    supabase.from('theatre_parking').select('*').in('show_id', showIds),
    supabase.from('theatre_expenses').select('*').eq('day_id', day.id).maybeSingle(),
    supabase.from('theatre_expense_others').select('amount').eq('day_id', day.id),
  ])

  const mcMap  = Object.fromEntries((mcRows  ?? []).map(r => [(r as Record<string,unknown>).show_id as string, r as Row]))
  const pcMap  = Object.fromEntries((pcRows  ?? []).map(r => [(r as Record<string,unknown>).show_id as string, r as Row]))
  const cdMap  = Object.fromEntries((cdRows  ?? []).map(r => [(r as Record<string,unknown>).show_id as string, r as Row]))
  const pkMap  = Object.fromEntries((pkRows  ?? []).map(r => [(r as Record<string,unknown>).show_id as string, r as Row]))

  let grossRevenue = 0
  let grossProfit  = 0
  const showLines: Record<string, unknown>[] = []

  for (const s of shows) {
    const sid = s.id as string
    const mc = mcMap[sid] ?? null
    const pc = pcMap[sid] ?? null
    const cd = cdMap[sid] ?? null
    const pk = pkMap[sid] ?? null

    const mcTotal       = sumBySale(mc, MC_PRICE)
    const popcornTotal  = sumBySale(pc, PC_PRICE)
    const cdDrinksTotal = sumBySale(cd, CD_DRINKS_PRICE)
    const cdLiveTotal   = sumBySale(cd, CD_LIVE_PRICE)
    const scooter = Number((pk as Record<string,unknown>)?.scooter_count) || 0
    const auto_   = Number((pk as Record<string,unknown>)?.auto_count)    || 0
    const car     = Number((pk as Record<string,unknown>)?.car_count)     || 0
    const parkingExpected = calcParkingExpected(scooter, auto_, car)

    const mcCost = sumByCost(mc, MC_COST)
    const pcCost = sumByCost(pc, PC_COST)
    const cdCost = sumByCost(cd, CD_COST)

    // showTotal = MC + POP + CDS + parkingExpected (mirrors DayClosePage computeShowTotal)
    const showTotal  = mcTotal + popcornTotal + cdDrinksTotal + cdLiveTotal + parkingExpected
    // showProfit = revenue - cost-of-goods (parking has no cost)
    const showProfit = showTotal - (mcCost + pcCost + cdCost)

    grossRevenue += showTotal
    grossProfit  += showProfit

    showLines.push({
      show: s.show_number,
      time: s.start_time,
      movie: s.movie_name,
      MC:      Math.round(mcTotal),
      POP:     Math.round(popcornTotal),
      CDS:     Math.round(cdDrinksTotal + cdLiveTotal),
      Parking: Math.round(parkingExpected),
      showTotal:  Math.round(showTotal),
      showProfit: Math.round(showProfit),
      costOfGoods: Math.round(mcCost + pcCost + cdCost),
    })
  }

  // Expenses
  const exp = expRow as Record<string, unknown> | null
  const baseExpenses = exp
    ? (Number(exp.wages) || 0) + (Number(exp.staff_coffee) || 0) +
      (Number(exp.water_cans) || 0) + (Number(exp.lab_food) || 0) +
      (Number(exp.wastage) || 0)
    : 0
  const othersTotal = (othersRows ?? []).reduce(
    (s: number, r) => s + (Number((r as Record<string, unknown>).amount) || 0), 0
  )
  const totalExpenses = baseExpenses + othersTotal
  const netProfit     = grossProfit - totalExpenses

  // Print table
  console.log('')
  console.log('  Show | Time  | Movie                     | MC      | POP     | CDS     | Parking | Total   | Profit')
  console.log('  ' + '─'.repeat(110))
  for (const l of showLines) {
    const r = (n: unknown) => String(n).padStart(7)
    console.log(
      `  ${String(l.show).padEnd(4)} | ${String(l.time).padEnd(5)} | ${String(l.movie).padEnd(25)} |` +
      `${r(l.MC)} |${r(l.POP)} |${r(l.CDS)} |${r(l.Parking)} |${r(l.showTotal)} |${r(l.showProfit)}`
    )
  }
  console.log('  ' + '─'.repeat(110))
  console.log(`\n  Gross Revenue  : ₹${Math.round(grossRevenue).toLocaleString('en-IN')}`)
  console.log(`  Gross Profit   : ₹${Math.round(grossProfit).toLocaleString('en-IN')}`)
  console.log(`  Total Expenses : ₹${Math.round(totalExpenses).toLocaleString('en-IN')}`)
  console.log(`  Net Profit     : ₹${Math.round(netProfit).toLocaleString('en-IN')}`)

  // Write summary JSON
  const summaryPath = join(OUT_DIR, 'sandhya-june14-show-summary.json')
  writeFileSync(summaryPath, JSON.stringify({
    date: SNAPSHOT_DATE,
    theatre: 'Sandhya',
    theatre_id: SANDHYA_ID,
    shows: showLines,
    totals: {
      grossRevenue:  Math.round(grossRevenue),
      grossProfit:   Math.round(grossProfit),
      totalExpenses: Math.round(totalExpenses),
      netProfit:     Math.round(netProfit),
    },
    capturedAt: new Date().toISOString(),
  }, null, 2), 'utf-8')
  console.log(`\n  Summary saved to ${summaryPath}`)
  console.log('\nSnapshot complete. Nothing was modified.')
}

run().catch(err => { console.error(err); process.exit(1) })
