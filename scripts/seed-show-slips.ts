/**
 * Seed realistic test slip data for a single show.
 *
 * BEFORE RUNNING:
 *   - Fill in SHOW_ID below with a real theatre_shows.id
 *   - Ensure THEATRE_PASSWORD is set in .env.local
 *
 * Run:
 *   npx tsx scripts/seed-show-slips.ts
 *
 * (ts-node does not work with this project's ESM setup — use tsx)
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const PASSWORD     = process.env.THEATRE_PASSWORD ?? ''
const EMAIL        = 'chaitanya58@gmail.com'

// ── Fill this in before running ────────────────────────────────────
const SHOW_ID = '99f3f215-28bc-4811-b547-454176099f0c'

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing from .env.local')
  process.exit(1)
}
if (!PASSWORD) {
  console.error('ERROR: THEATRE_PASSWORD not found in .env.local')
  process.exit(1)
}
if (!SHOW_ID) {
  console.error('ERROR: SHOW_ID is empty — fill it in before running')
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

  // ── Main Counter: veg_puff ob=10 rec=5 cb=3 wst=1 sale=11 ─────────
  console.log('── Main Counter')
  {
    const { error } = await supabase
      .from('theatre_main_counter')
      .upsert(
        {
          show_id: SHOW_ID,
          veg_puff_ob: 10, veg_puff_rec: 5, veg_puff_cb: 3, veg_puff_wst: 1, veg_puff_sale: 11,
          upi_amount: 440, cash_amount: 220,
        },
        { onConflict: 'show_id' },
      )
    record('Main Counter', error)
  }

  // ── Popcorn: cone_60 ob=20 rec=10 cb=8 wst=2 sale=20, bms=500 ─────
  console.log('── Popcorn')
  {
    const { error } = await supabase
      .from('theatre_popcorn')
      .upsert(
        {
          show_id: SHOW_ID,
          cone_60_ob: 20, cone_60_rec: 10, cone_60_cb: 8, cone_60_wst: 2, cone_60_sale: 20,
          bms_combo_amount: 500,
          upi_amount: 1200, cash_amount: 600,
        },
        { onConflict: 'show_id' },
      )
    record('Popcorn', error)
  }

  // ── Cool Drinks: water (drinks) + french_fries (live) ────────────
  console.log('── Cool Drinks')
  {
    const { error } = await supabase
      .from('theatre_cool_drinks')
      .upsert(
        {
          show_id: SHOW_ID,
          water_ob: 30, water_rec: 10, water_cb: 15, water_wst: 2, water_sale: 23,
          french_fries_ob: 15, french_fries_rec: 5, french_fries_cb: 8, french_fries_wst: 1, french_fries_sale: 11,
          upi_amount: 690, cash_amount: 345,
          live_upi_amount: 770, live_cash_amount: 385,
        },
        { onConflict: 'show_id' },
      )
    record('Cool Drinks', error)
  }

  // ── Parking: scooter=20 auto=5 car=3 ──────────────────────────────
  console.log('── Parking')
  {
    const { error } = await supabase
      .from('theatre_parking')
      .upsert(
        {
          show_id: SHOW_ID,
          scooter_count: 20, auto_count: 5, car_count: 3,
          upi_amount: 400, cash_amount: 150,
        },
        { onConflict: 'show_id' },
      )
    record('Parking', error)
  }

  // ── Summary ───────────────────────────────────────────────────
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
  process.exit(allPass ? 0 : 1)
}

run().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
