/**
 * Seed a complete day's worth of data (all four slips) for a single show.
 *
 * BEFORE RUNNING:
 *   - Ensure THEATRE_PASSWORD is set in .env.local
 *
 * Run:
 *   npx tsx scripts/seed-full-day.ts
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

const SHOW_ID = '99f3f215-28bc-4811-b547-454176099f0c'

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

  // ── Main Counter ──────────────────────────────────────────────
  console.log('── Main Counter')
  {
    const { error } = await supabase
      .from('theatre_main_counter')
      .upsert(
        {
          show_id: SHOW_ID,
          veg_puff_ob: 10, veg_puff_rec: 5, veg_puff_cb: 3, veg_puff_wst: 1, veg_puff_sale: 11,
          egg_puff_ob: 20, egg_puff_rec: 10, egg_puff_cb: 8, egg_puff_wst: 2, egg_puff_sale: 20,
          samosa_ob: 15, samosa_rec: 5, samosa_cb: 6, samosa_wst: 1, samosa_sale: 13,
          h_cake_ob: 8, h_cake_rec: 4, h_cake_cb: 3, h_cake_wst: 0, h_cake_sale: 9,
          jam_bun_ob: 12, jam_bun_rec: 6, jam_bun_cb: 4, jam_bun_wst: 1, jam_bun_sale: 13,
          chips_ob: 20, chips_rec: 10, chips_cb: 8, chips_wst: 2, chips_sale: 20,
          frymes_ob: 15, frymes_rec: 5, frymes_cb: 6, frymes_wst: 1, frymes_sale: 13,
          water_ob: 30, water_rec: 10, water_cb: 12, water_wst: 1, water_sale: 27,
          milkshake_ob: 10, milkshake_rec: 5, milkshake_cb: 3, milkshake_wst: 1, milkshake_sale: 11,
          frooty_ob: 20, frooty_rec: 8, frooty_cb: 10, frooty_wst: 1, frooty_sale: 17,
          tin_ob: 50, tin_rec: 20, tin_cb: 22, tin_wst: 2, tin_sale: 46,
          upi_amount: 1200, cash_amount: 800,
        },
        { onConflict: 'show_id' },
      )
    record('Main Counter', error)
  }

  // ── Popcorn ───────────────────────────────────────────────────
  console.log('── Popcorn')
  {
    const { error } = await supabase
      .from('theatre_popcorn')
      .upsert(
        {
          show_id: SHOW_ID,
          cone_60_ob: 30, cone_60_rec: 15, cone_60_cb: 10, cone_60_wst: 2, cone_60_sale: 33,
          cone_130_ob: 20, cone_130_rec: 10, cone_130_cb: 8, cone_130_wst: 1, cone_130_sale: 21,
          cone_200_ob: 10, cone_200_rec: 5, cone_200_cb: 4, cone_200_wst: 0, cone_200_sale: 11,
          bms_combo_amount: 750,
          upi_amount: 900, cash_amount: 600,
        },
        { onConflict: 'show_id' },
      )
    record('Popcorn', error)
  }

  // ── Cool Drinks ───────────────────────────────────────────────
  console.log('── Cool Drinks')
  {
    const { error } = await supabase
      .from('theatre_cool_drinks')
      .upsert(
        {
          show_id: SHOW_ID,
          water_ob: 40, water_rec: 20, water_cb: 15, water_wst: 2, water_sale: 43,
          tin_ob: 60, tin_rec: 30, tin_cb: 25, tin_wst: 3, tin_sale: 62,
          frooty_trop_ob: 25, frooty_trop_rec: 10, frooty_trop_cb: 12, frooty_trop_wst: 1, frooty_trop_sale: 22,
          french_fries_ob: 20, french_fries_rec: 8, french_fries_cb: 9, french_fries_wst: 1, french_fries_sale: 18,
          ckn_popcorn_ob: 15, ckn_popcorn_rec: 5, ckn_popcorn_cb: 7, ckn_popcorn_wst: 1, ckn_popcorn_sale: 12,
          ice_cream1_ob: 20, ice_cream1_rec: 10, ice_cream1_cb: 8, ice_cream1_wst: 2, ice_cream1_sale: 20,
          upi_amount: 2000, cash_amount: 1500,
          live_upi_amount: 800, live_cash_amount: 400,
        },
        { onConflict: 'show_id' },
      )
    record('Cool Drinks', error)
  }

  // ── Parking ───────────────────────────────────────────────────
  console.log('── Parking')
  {
    const { error } = await supabase
      .from('theatre_parking')
      .upsert(
        {
          show_id: SHOW_ID,
          scooter_count: 25, auto_count: 8, car_count: 4,
          upi_amount: 500, cash_amount: 300,
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
