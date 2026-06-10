/**
 * Slip save integration test — runs against real Supabase with real auth.
 *
 * BEFORE RUNNING: add this line to .env.local
 *   THEATRE_PASSWORD=<chaitanya's actual password>
 *
 * Run:
 *   npx tsx scripts/test-slip-save.ts
 *
 * (ts-node does not work with this project's ESM setup — use tsx)
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// ── Load .env.local ───────────────────────────────────────────────
config({ path: '.env.local' })

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const PASSWORD     = process.env.THEATRE_PASSWORD ?? ''
const EMAIL        = 'chaitanya58@gmail.com'

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing from .env.local')
  process.exit(1)
}
if (!PASSWORD) {
  console.error('ERROR: THEATRE_PASSWORD not found in .env.local')
  console.error('       Add:  THEATRE_PASSWORD=<password>')
  process.exit(1)
}

// ── Supabase client ───────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, ANON_KEY)

// ── Payload builder ───────────────────────────────────────────────
// Mirrors rowsToFlat() in ShowPage.tsx — same column pattern: {prefix}_{ob|rec|cb|sale}
function flatItems(
  prefixes: string[],
  ob = 1, rec = 1, cb = 1, sale = 1,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const k of prefixes) {
    out[`${k}_ob`]   = ob
    out[`${k}_rec`]  = rec
    out[`${k}_cb`]   = cb
    out[`${k}_sale`] = sale
  }
  return out
}

// ── DB column prefixes — copied directly from ShowPage.tsx DB_KEY maps ──
// MC_DB_KEY values (14 items after 2026-06-09 update)
const MC_PREFIXES = [
  'veg_puff', 'egg_puff', 'h_cake',   'jam_bun', 'ckn_puff',
  'bs',        'samosa',   'tin',       'frooty',  'chips',
  'frymes',    'water',    'milkshake', 'lays',
]

// PC_DB_KEY values (3 items)
const PC_PREFIXES = ['cone_60', 'cone_130', 'cone_200']

// CD_DB_KEY values (15 items after 2026-06-09 update)
const CD_PREFIXES = [
  'water',        'tin',          'tins2',       'frooty_trop',  'milkshake',
  'french_fries', 'veg_bites',    'onion_samosa', 'ckn_popcorn',
  'ckn_samosa',   'ckn_nuggets',  'ice_cream1',   'ice_cream2',
  'ice_cream3',   'tea_coffee',
]

// ── Test result tracking ──────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────
async function run() {
  let showId: string | null = null
  let dayId: string | null = null
  let weCreatedDay = false

  try {
    // ── 1. Auth ───────────────────────────────────────────────────
    console.log(`Signing in as ${EMAIL}...`)
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
    if (authErr) {
      console.error('Auth failed:', authErr.message)
      process.exit(1)
    }
    console.log('Signed in OK\n')

    // ── 2. Sandhya theatre ────────────────────────────────────────
    const { data: theatre, error: tErr } = await supabase
      .from('theatre_theatres')
      .select('id')
      .eq('name', 'Sandhya')
      .single()
    if (tErr || !theatre) {
      console.error('Cannot find Sandhya theatre:', tErr?.message)
      process.exit(1)
    }
    const theatreId = theatre.id as string
    console.log('Sandhya theatre ID:', theatreId)

    // ── 3. Get or create today's day row ──────────────────────────
    const today = new Date().toISOString().slice(0, 10)
    const { data: existingDay } = await supabase
      .from('theatre_days')
      .select('id')
      .eq('theatre_id', theatreId)
      .eq('date', today)
      .maybeSingle()

    if (existingDay) {
      dayId = existingDay.id as string
      console.log('Using existing day row:', dayId)
    } else {
      const { data: newDay, error: dayErr } = await supabase
        .from('theatre_days')
        .insert({ theatre_id: theatreId, date: today })
        .select('id')
        .single()
      if (dayErr || !newDay) {
        console.error('Cannot create day row:', dayErr?.message)
        process.exit(1)
      }
      dayId = newDay.id as string
      weCreatedDay = true
      console.log('Created day row:', dayId)
    }

    // ── 4. Insert test show (show_number 99 as sentinel) ──────────
    const { data: show, error: showErr } = await supabase
      .from('theatre_shows')
      .insert({
        day_id:      dayId,
        show_number: 99,
        start_time:  '23:59',
        movie_name:  'TEST_SCRIPT_RUN',
        language:    'test',
        is_fan_show: false,
      })
      .select('id')
      .single()
    if (showErr || !show) {
      console.error('Cannot insert test show:', showErr?.message)
      process.exit(1)
    }
    showId = show.id as string
    console.log('Test show created:', showId, '\n')

    // ── Test 1: Main Counter ──────────────────────────────────────
    console.log('── Test 1: Main Counter save')
    {
      const { error } = await supabase
        .from('theatre_main_counter')
        .upsert(
          { show_id: showId, ...flatItems(MC_PREFIXES), upi_amount: 100, cash_amount: 100 },
          { onConflict: 'show_id' },
        )
      record('Main Counter', error)
    }

    // ── Test 2: Popcorn ───────────────────────────────────────────
    console.log('── Test 2: Popcorn save')
    {
      const { error } = await supabase
        .from('theatre_popcorn')
        .upsert(
          {
            show_id: showId,
            ...flatItems(PC_PREFIXES),
            bms_combo_amount: 100,
            upi_amount: 100,
            cash_amount: 100,
          },
          { onConflict: 'show_id' },
        )
      record('Popcorn', error)
    }

    // ── Test 3: Parking ───────────────────────────────────────────
    console.log('── Test 3: Parking save')
    {
      const { error } = await supabase
        .from('theatre_parking')
        .upsert(
          { show_id: showId, scooter_count: 10, auto_count: 5, car_count: 2, reported_amount: 500 },
          { onConflict: 'show_id' },
        )
      record('Parking', error)
    }

    // ── Test 4: Cool Drinks ───────────────────────────────────────
    console.log('── Test 4: Cool Drinks save')
    {
      const { error } = await supabase
        .from('theatre_cool_drinks')
        .upsert(
          { show_id: showId, ...flatItems(CD_PREFIXES), upi_amount: 100, cash_amount: 100 },
          { onConflict: 'show_id' },
        )
      record('Cool Drinks', error)
    }

  } finally {
    // ── Cleanup ───────────────────────────────────────────────────
    console.log('\n── Cleanup')
    if (showId) {
      // Delete slips explicitly (FK cascade should handle it, but be explicit)
      await supabase.from('theatre_main_counter').delete().eq('show_id', showId)
      await supabase.from('theatre_popcorn').delete().eq('show_id', showId)
      await supabase.from('theatre_cool_drinks').delete().eq('show_id', showId)
      await supabase.from('theatre_parking').delete().eq('show_id', showId)
      const { error: delShowErr } = await supabase.from('theatre_shows').delete().eq('id', showId)
      console.log('  Show deleted:', delShowErr ? `FAIL — ${delShowErr.message}` : 'OK')
    }
    if (dayId && weCreatedDay) {
      const { error: delDayErr } = await supabase.from('theatre_days').delete().eq('id', dayId)
      console.log('  Day row deleted:', delDayErr ? `FAIL — ${delDayErr.message}` : 'OK')
    }
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
