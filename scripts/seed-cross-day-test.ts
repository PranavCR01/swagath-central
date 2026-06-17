/**
 * Seed cross-day OB carry-forward + mismatch detection test data.
 *
 * Creates two days for Sandhya theatre:
 *   Day A  — 2026-06-20  (1 show, realistic MC data)
 *   Day B  — 2026-06-22  (1 show, deliberately stale OB values → triggers mismatch)
 *
 * June 21 is intentionally skipped to verify "most recent day with data" logic.
 *
 * BEFORE RUNNING:
 *   - Ensure THEATRE_PASSWORD is set in .env.local
 *   - Run teardown first if you need to reset: npx tsx scripts/teardown-cross-day-test.ts
 *
 * Run:
 *   npx tsx scripts/seed-cross-day-test.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const PASSWORD     = process.env.THEATRE_PASSWORD ?? ''
const EMAIL        = 'chaitanya58@gmail.com'

const THEATRE_ID   = '628dba7b-322c-4afe-a8ea-d3cf8e40cbc1'
const DATE_A       = '2026-06-20'
const DATE_B       = '2026-06-22'

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

  // ── Day A: 2026-06-20 ─────────────────────────────────────────────
  console.log(`── Day A (${DATE_A})`)

  const { data: dayAData, error: dayAErr } = await supabase
    .from('theatre_days')
    .insert({ theatre_id: THEATRE_ID, date: DATE_A })
    .select('id')
    .single()
  record('Day A — theatre_days', dayAErr)
  if (!dayAData) {
    console.error('Cannot continue without Day A id')
    process.exit(1)
  }
  const dayAId = dayAData.id

  const { data: showAData, error: showAErr } = await supabase
    .from('theatre_shows')
    .insert({ day_id: dayAId, show_number: 1, start_time: '19:00', movie_name: 'Test Movie A' })
    .select('id')
    .single()
  record('Day A — theatre_shows', showAErr)
  if (!showAData) {
    console.error('Cannot continue without Show A id')
    process.exit(1)
  }
  const showAId = showAData.id

  // Day A MC: realistic values — tin ob=50 rec=0 cb=30, water ob=40 rec=0 cb=20
  // Carry-forward will expect Day B's tin OB = 30, water OB = 20
  const { error: mcAErr } = await supabase
    .from('theatre_main_counter')
    .insert({
      show_id: showAId,
      tin_ob: 50, tin_rec: 0, tin_cb: 30, tin_wst: 0, tin_sale: 20,
      water_ob: 40, water_rec: 0, water_cb: 20, water_wst: 0, water_sale: 20,
      // All other items default 0
      upi_amount: 0, cash_amount: 0,
    })
  record('Day A — theatre_main_counter', mcAErr)

  // ── Day B: 2026-06-22 (skipping June 21 intentionally) ────────────
  console.log(`\n── Day B (${DATE_B})`)

  const { data: dayBData, error: dayBErr } = await supabase
    .from('theatre_days')
    .insert({ theatre_id: THEATRE_ID, date: DATE_B })
    .select('id')
    .single()
  record('Day B — theatre_days', dayBErr)
  if (!dayBData) {
    console.error('Cannot continue without Day B id')
    process.exit(1)
  }
  const dayBId = dayBData.id

  const { data: showBData, error: showBErr } = await supabase
    .from('theatre_shows')
    .insert({ day_id: dayBId, show_number: 1, start_time: '19:00', movie_name: 'Test Movie B' })
    .select('id')
    .single()
  record('Day B — theatre_shows', showBErr)
  if (!showBData) {
    console.error('Cannot continue without Show B id')
    process.exit(1)
  }
  const showBId = showBData.id

  // Day B MC: deliberately stale OBs — tin ob=999, water ob=999
  // Expected from Day A closing: tin=30, water=20 → mismatch on both
  const { error: mcBErr } = await supabase
    .from('theatre_main_counter')
    .insert({
      show_id: showBId,
      tin_ob: 999, tin_rec: 0, tin_cb: 10, tin_wst: 0, tin_sale: 989,
      water_ob: 999, water_rec: 0, water_cb: 5, water_wst: 0, water_sale: 994,
      upi_amount: 0, cash_amount: 0,
    })
  record('Day B — theatre_main_counter (stale OBs)', mcBErr)

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
    console.log(`  Day A  day_id:  ${dayAId}`)
    console.log(`  Day A  show_id: ${showAId}`)
    console.log(`  Day B  day_id:  ${dayBId}`)
    console.log(`  Day B  show_id: ${showBId}`)

    console.log('\n── Test URLs ─────────────────────────────────────────────')
    console.log('  Open Day B Show 1 (should show mismatch banner):')
    console.log(`  http://localhost:5173/theatre/${THEATRE_ID}/day/${DATE_B}/show/${showBId}`)
    console.log('\n  Open Day A day page (to inspect source data):')
    console.log(`  http://localhost:5173/theatre/${THEATRE_ID}/day/${DATE_A}`)
    console.log('\n  Expected behaviour:')
    console.log('    • Day B Show 1 opens → loadAll() detects show_number=1')
    console.log('    • Looks back past June 21 gap → finds Day A (2026-06-20)')
    console.log('    • Day A MC: tin cb=30, water cb=20')
    console.log('    • Day B MC already has tin ob=999, water ob=999')
    console.log('    • Mismatch banner appears on Main Counter tab')
    console.log('    • "Update to match" sets tin ob→30, water ob→20 and persists')
  }

  process.exit(allPass ? 0 : 1)
}

run().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
