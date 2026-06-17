/**
 * Seed same-day OB carry-forward test (out-of-order show insertion).
 *
 * Creates one day for Sandhya theatre — 2026-06-25 — with three shows:
 *
 *   Show inserted 1st: start_time 19:00 (7pm)  → has MC data (correctly ordered)
 *   Show inserted 2nd: start_time 22:00 (10pm) → has MC data (correctly carried from 7pm CB)
 *   Show inserted 3rd: start_time 16:00 (4pm)  → NO slip data, show_number intentionally wrong
 *
 * The 4pm show is inserted last with whatever show_number the insert sequence gives it.
 * When the Day page loads the app re-sequences show_numbers by start_time ASC — we test
 * whether the 4pm show correctly becomes show_number=1 and whether opening it triggers
 * carry-forward (cross-day, since it's chronologically the first show of the day).
 *
 * BEFORE RUNNING:
 *   - Ensure THEATRE_PASSWORD is set in .env.local
 *   - Run teardown first if you need to reset: npx tsx scripts/teardown-same-day-test.ts
 *
 * Run:
 *   npx tsx scripts/seed-same-day-test.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const PASSWORD     = process.env.THEATRE_PASSWORD ?? ''
const EMAIL        = 'chaitanya58@gmail.com'

const THEATRE_ID = '628dba7b-322c-4afe-a8ea-d3cf8e40cbc1'
const DATE       = '2026-06-25'

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing from .env.local')
  process.exit(1)
}
if (!PASSWORD) {
  console.error('ERROR: THEATRE_PASSWORD not found in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, ANON_KEY)

type TestResult = { ok: true } | { ok: false; error: string }
const results: Record<string, TestResult> = {}

function record(name: string, error: { message: string } | null | undefined) {
  if (error) {
    results[name] = { ok: false, error: error.message }
    console.log(`  ${name}: FAIL — ${error.message}`)
  } else {
    results[name] = { ok: true }
    console.log(`  ${name}: OK`)
  }
}

async function run() {
  console.log(`Signing in as ${EMAIL}...`)
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (authErr) {
    console.error('Auth failed:', authErr.message)
    process.exit(1)
  }
  console.log('Signed in OK\n')

  // ── theatre_days row (upsert — safe to re-run if day already exists) ──
  console.log(`── Day (${DATE})`)

  const { data: dayData, error: dayErr } = await supabase
    .from('theatre_days')
    .upsert({ theatre_id: THEATRE_ID, date: DATE }, { onConflict: 'theatre_id,date' })
    .select('id')
    .single()
  record('theatre_days', dayErr)
  if (!dayData) {
    console.error('Cannot continue without day_id')
    process.exit(1)
  }
  const dayId = dayData.id

  // ── Show 1 (inserted 1st): 7pm — has slip data ────────────────────
  console.log('\n── Show 1: 19:00 (inserted 1st)')

  const { data: show7pmData, error: show7pmErr } = await supabase
    .from('theatre_shows')
    .insert({ day_id: dayId, show_number: 1, start_time: '19:00', movie_name: 'Test 7PM' })
    .select('id')
    .single()
  record('theatre_shows (19:00)', show7pmErr)
  if (!show7pmData) {
    console.error('Cannot continue without 7pm show_id')
    process.exit(1)
  }
  const show7pmId = show7pmData.id

  // 7pm MC: tin ob=50 rec=0 cb=35, water ob=40 rec=0 cb=25
  // carry-forward expects 10pm: tin ob=35, water ob=25
  const { error: mc7pmErr } = await supabase
    .from('theatre_main_counter')
    .insert({
      show_id: show7pmId,
      tin_ob: 50, tin_rec: 0, tin_cb: 35, tin_wst: 0, tin_sale: 15,
      water_ob: 40, water_rec: 0, water_cb: 25, water_wst: 0, water_sale: 15,
      upi_amount: 0, cash_amount: 0,
    })
  record('theatre_main_counter (19:00)', mc7pmErr)

  // ── Show 2 (inserted 2nd): 10pm — correctly carried from 7pm CB ───
  console.log('\n── Show 2: 22:00 (inserted 2nd)')

  const { data: show10pmData, error: show10pmErr } = await supabase
    .from('theatre_shows')
    .insert({ day_id: dayId, show_number: 2, start_time: '22:00', movie_name: 'Test 10PM' })
    .select('id')
    .single()
  record('theatre_shows (22:00)', show10pmErr)
  if (!show10pmData) {
    console.error('Cannot continue without 10pm show_id')
    process.exit(1)
  }
  const show10pmId = show10pmData.id

  // 10pm MC: OBs correctly match 7pm CB (tin=35, water=25)
  const { error: mc10pmErr } = await supabase
    .from('theatre_main_counter')
    .insert({
      show_id: show10pmId,
      tin_ob: 35, tin_rec: 0, tin_cb: 20, tin_wst: 0, tin_sale: 15,
      water_ob: 25, water_rec: 0, water_cb: 15, water_wst: 0, water_sale: 10,
      upi_amount: 0, cash_amount: 0,
    })
  record('theatre_main_counter (22:00)', mc10pmErr)

  // ── Show 3 (inserted 3rd): 4pm — out-of-order, NO slip data ───────
  // Inserted last but chronologically first. show_number=3 from insertion
  // sequence — the app's renumbering logic (DayPage insert/delete handler)
  // should fix this to show_number=1 when the day page is visited.
  console.log('\n── Show 3: 16:00 (inserted 3rd — chronologically first, no slip data)')

  const { data: show4pmData, error: show4pmErr } = await supabase
    .from('theatre_shows')
    .insert({ day_id: dayId, show_number: 3, start_time: '16:00', movie_name: 'Test 4PM' })
    .select('id')
    .single()
  record('theatre_shows (16:00, show_number=3 intentionally)', show4pmErr)
  if (!show4pmData) {
    console.error('Cannot continue without 4pm show_id')
    process.exit(1)
  }
  const show4pmId = show4pmData.id
  // No slip inserts for the 4pm show — intentionally empty

  // ── Summary ───────────────────────────────────────────────────────
  console.log('\n── Summary ──────────────────────────────────────────────')
  for (const [name, r] of Object.entries(results)) {
    if (r.ok) {
      console.log(`  ✓ PASS  ${name}`)
    } else {
      console.log(`  ✗ FAIL  ${name}`)
      console.log(`         ${r.error}`)
    }
  }
  const allPass = Object.values(results).every(r => r.ok)
  console.log(`\n  Overall: ${allPass ? '✓ ALL PASS' : '✗ SOME FAILURES'}`)

  if (allPass) {
    console.log('\n── Created IDs ───────────────────────────────────────────')
    console.log(`  day_id:              ${dayId}`)
    console.log(`  show_id (19:00 7pm): ${show7pmId}  [MC: tin ob=50 cb=35, water ob=40 cb=25]`)
    console.log(`  show_id (22:00 10pm):${show10pmId}  [MC: tin ob=35 cb=20, water ob=25 cb=15]`)
    console.log(`  show_id (16:00 4pm): ${show4pmId}  [no slips, show_number=3 in DB]`)

    console.log('\n── DB state before app visit ─────────────────────────────')
    console.log('  4pm show has show_number=3 (wrong — inserted last)')
    console.log('  No MC/PC/CD rows for the 4pm show')

    console.log('\n── Test URLs ─────────────────────────────────────────────')
    console.log('  1. Open Day page first — triggers app renumbering by start_time:')
    console.log(`  http://localhost:5173/theatre/${THEATRE_ID}/day/${DATE}`)
    console.log('\n  2. Then open 4pm Show (should now have show_number=1 after renumber):')
    console.log(`  http://localhost:5173/theatre/${THEATRE_ID}/day/${DATE}/show/${show4pmId}`)

    console.log('\n── Expected behaviour ────────────────────────────────────')
    console.log('  • Day page: shows ordered 16:00 → 19:00 → 22:00, show_numbers fixed to 1/2/3')
    console.log('  • 4pm show opens → show_number=1 → cross-day carry-forward path fires')
    console.log('  • No previous day data exists → OBs stay blank (no carry, no mismatch)')
    console.log('  • 7pm show opens → show_number=2 → same-day carry from 4pm show')
    console.log('    4pm has no data → OBs stay blank (graceful skip)')
    console.log('  • 10pm show opens → show_number=3 → same-day carry from 7pm show')
    console.log('    If 4pm OBs were filled and saved, they now cascade correctly')
  }

  process.exit(allPass ? 0 : 1)
}

run().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
