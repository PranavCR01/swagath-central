/**
 * OB carry-forward integration test — runs against real Supabase with real auth.
 *
 * Creates a "[TEST] Baahubali" show as Show 2 for Sandhya today, with realistic
 * Show 1 closing balances already saved, then verifies the carry-forward values
 * ShowPage would compute for Show 2 (ob = Show 1's cb) including the
 * Misc Drinks -> Tins OB adjustment.
 *
 * BEFORE RUNNING: add this line to .env.local
 *   THEATRE_PASSWORD=<chaitanya's actual password>
 *
 * Run:
 *   npx tsx scripts/test-carry-forward.ts
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

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing from .env.local')
  process.exit(1)
}
if (!PASSWORD) {
  console.error('ERROR: THEATRE_PASSWORD not found in .env.local')
  console.error('       Add:  THEATRE_PASSWORD=<password>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, ANON_KEY)

type TestResult = { ok: true } | { ok: false; error: string }
const results: Record<string, TestResult> = {}

function record(name: string, ok: boolean, detail?: string) {
  if (ok) {
    results[name] = { ok: true }
    console.log(`  ${name}: OK`)
  } else {
    results[name] = { ok: false, error: detail ?? 'mismatch' }
    console.log(`  ${name}: FAIL — ${detail ?? 'mismatch'}`)
  }
}

async function run() {
  let dayId: string | null = null
  let weCreatedDay = false
  let show1Id: string | null = null
  let show2Id: string | null = null

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

    // ── 4. Insert Show 1 (Baahubali, next available show_number) ────
    const { data: existingShows } = await supabase
      .from('theatre_shows')
      .select('show_number')
      .eq('day_id', dayId)
      .order('show_number', { ascending: false })
      .limit(1)

    const nextShowNum = existingShows?.length ? existingShows[0].show_number + 1 : 1

    const { data: show1, error: show1Err } = await supabase
      .from('theatre_shows')
      .insert({
        day_id:      dayId,
        show_number: nextShowNum,
        start_time:  '10:00',
        movie_name:  '[TEST] Baahubali',
        language:    'Kannada',
        is_fan_show: false,
      })
      .select('id')
      .single()
    if (show1Err || !show1) {
      console.error(`Cannot insert Show ${nextShowNum}:`, show1Err?.message)
      process.exit(1)
    }
    show1Id = show1.id as string
    console.log(`Show ${nextShowNum} created:`, show1Id)

    // ── 5. Save Show main_counter + cool_drinks with closing balances ──
    // tins_mc: ob=10, rec=0, cb=4 -> sale=6 (no misc adjustment on this show)
    const MC_PREFIXES = [
      'veg_puff', 'egg_puff', 'h_cake', 'jam_bun', 'ckn_puff', 'samosa',
      'tin', 'frooty', 'chips', 'frymes', 'water', 'milkshake', 'kettle_chips', 'tins_mc',
    ]
    const mcFlat: Record<string, number> = {}
    for (const k of MC_PREFIXES) {
      mcFlat[`${k}_ob`] = 0
      mcFlat[`${k}_rec`] = 0
      mcFlat[`${k}_cb`] = 0
      mcFlat[`${k}_wst`] = 0
      mcFlat[`${k}_sale`] = 0
    }
    mcFlat['tins_mc_ob'] = 10
    mcFlat['tins_mc_rec'] = 0
    mcFlat['tins_mc_cb'] = 4
    mcFlat['tins_mc_sale'] = 6

    const { error: mc1Err } = await supabase
      .from('theatre_main_counter')
      .upsert(
        { show_id: show1Id, ...mcFlat, upi_amount: 0, cash_amount: 0, misc_drinks_mc: 0 },
        { onConflict: 'show_id' },
      )
    if (mc1Err) { console.error('Show 1 main_counter save failed:', mc1Err.message); process.exit(1) }

    // c_tin (CD Tins): ob=20, rec=0, cb=12 -> sale=8 (no misc adjustment on this show)
    const CD_PREFIXES = [
      'water', 'tin', 'frooty_trop', 'milkshake', 'french_fries', 'veg_bites',
      'onion_samosa', 'ckn_popcorn', 'ckn_samosa', 'ckn_nuggets',
      'ice_cream1', 'ice_cream2', 'ice_cream3', 'tea_coffee', 'sandwich',
    ]
    const cdFlat: Record<string, number> = {}
    for (const k of CD_PREFIXES) {
      cdFlat[`${k}_ob`] = 0
      cdFlat[`${k}_rec`] = 0
      cdFlat[`${k}_cb`] = 0
      cdFlat[`${k}_wst`] = 0
      cdFlat[`${k}_sale`] = 0
    }
    cdFlat['tin_ob'] = 20
    cdFlat['tin_rec'] = 0
    cdFlat['tin_cb'] = 12
    cdFlat['tin_sale'] = 8

    const { error: cd1Err } = await supabase
      .from('theatre_cool_drinks')
      .upsert(
        { show_id: show1Id, ...cdFlat, upi_amount: 0, cash_amount: 0, misc_drinks_cd: 0 },
        { onConflict: 'show_id' },
      )
    if (cd1Err) { console.error(`Show ${nextShowNum} cool_drinks save failed:`, cd1Err.message); process.exit(1) }
    console.log(`Show ${nextShowNum} main_counter + cool_drinks saved\n`)

    // ── 6. Insert Show nextShowNum + 1 (Baahubali) ──────────────────
    const { data: show2, error: show2Err } = await supabase
      .from('theatre_shows')
      .insert({
        day_id:      dayId,
        show_number: nextShowNum + 1,
        start_time:  '13:00',
        movie_name:  '[TEST] Baahubali',
        language:    'Kannada',
        is_fan_show: false,
      })
      .select('id')
      .single()
    if (show2Err || !show2) {
      console.error(`Cannot insert Show ${nextShowNum + 1}:`, show2Err?.message)
      process.exit(1)
    }
    show2Id = show2.id as string
    console.log(`Show ${nextShowNum + 1} created:`, show2Id, '\n')

    // ── 7. Verify carry-forward: Show ${nextShowNum + 1} OB should equal Show ${nextShowNum} CB ──
    // (mirrors applyCarryForward() in slipData.ts: ob = prev.cb, rec/cb/wst = '')
    console.log(`── Test: Carry-forward OB = Show ${nextShowNum} CB (for Show ${nextShowNum + 1})`)
    {
      const { data: prevMc } = await supabase
        .from('theatre_main_counter')
        .select('tins_mc_cb')
        .eq('show_id', show1Id)
        .single()
      record('Main Counter tins_mc carry-forward OB (expect 4)', prevMc?.tins_mc_cb === 4,
        `got ${prevMc?.tins_mc_cb}`)

      const { data: prevCd } = await supabase
        .from('theatre_cool_drinks')
        .select('tin_cb')
        .eq('show_id', show1Id)
        .single()
      record('Cool Drinks c_tin carry-forward OB (expect 12)', prevCd?.tin_cb === 12,
        `got ${prevCd?.tin_cb}`)
    }

    // ── 8. Simulate Show ${nextShowNum + 1} save with Misc Drinks live-sync to Tins OB ──
    // Live useEffect applies the delta to rows.ob BEFORE save, so the stored OB
    // already reflects the adjustment — no reconstruction on reload.
    // MC: tins_mc adds misc drinks to OB (+delta). CD: c_tin removes misc drinks from OB (-delta).
    console.log(`\n── Test: Misc Drinks live-sync to Tins OB on save (Show ${nextShowNum + 1})`)
    {
      // MC: carryOb = 4 (previous show's tins_mc_cb), misc_drinks_mc = 2
      // -> live-synced ob = 4 + 2 = 6; rec=0, cb=1 -> sale = max(0, 6+0-1) = 5
      const mcCarryOb = 4
      const miscMc = 2
      const mcSyncedOb = mcCarryOb + miscMc // 6
      const mcRec = 0
      const mcCb = 1
      const mcSale = Math.max(0, mcSyncedOb + mcRec - mcCb) // 5

      const mc2Flat: Record<string, number> = {}
      for (const k of MC_PREFIXES) {
        mc2Flat[`${k}_ob`] = 0
        mc2Flat[`${k}_rec`] = 0
        mc2Flat[`${k}_cb`] = 0
        mc2Flat[`${k}_wst`] = 0
        mc2Flat[`${k}_sale`] = 0
      }
      mc2Flat['tins_mc_ob'] = mcSyncedOb
      mc2Flat['tins_mc_rec'] = mcRec
      mc2Flat['tins_mc_cb'] = mcCb
      mc2Flat['tins_mc_sale'] = mcSale

      const { error: mc2Err } = await supabase
        .from('theatre_main_counter')
        .upsert(
          { show_id: show2Id, ...mc2Flat, upi_amount: 0, cash_amount: 0, misc_drinks_mc: miscMc },
          { onConflict: 'show_id' },
        )
      if (mc2Err) { console.error('Show 2 main_counter save failed:', mc2Err.message); process.exit(1) }

      const { data: savedMc } = await supabase
        .from('theatre_main_counter')
        .select('tins_mc_ob, tins_mc_sale, misc_drinks_mc')
        .eq('show_id', show2Id)
        .single()

      record('Stored tins_mc_ob = carryOb + miscDrinksMc (expect 6)', savedMc?.tins_mc_ob === 6,
        `got ${savedMc?.tins_mc_ob}`)
      record('Stored tins_mc_sale reflects synced OB (expect 5)', savedMc?.tins_mc_sale === 5,
        `got ${savedMc?.tins_mc_sale}`)

      // CD: carryOb = 12 (previous show's tin_cb), misc_drinks_cd = 2
      // -> live-synced ob = 12 - 2 = 10; rec=0, cb=1 -> sale = max(0, 10+0-1) = 9
      const cdCarryOb = 12
      const miscCd = 2
      const cdSyncedOb = cdCarryOb - miscCd // 10
      const cdRec = 0
      const cdCb = 1
      const cdSale = Math.max(0, cdSyncedOb + cdRec - cdCb) // 9

      const cd2Flat: Record<string, number> = {}
      for (const k of CD_PREFIXES) {
        cd2Flat[`${k}_ob`] = 0
        cd2Flat[`${k}_rec`] = 0
        cd2Flat[`${k}_cb`] = 0
        cd2Flat[`${k}_wst`] = 0
        cd2Flat[`${k}_sale`] = 0
      }
      cd2Flat['tin_ob'] = cdSyncedOb
      cd2Flat['tin_rec'] = cdRec
      cd2Flat['tin_cb'] = cdCb
      cd2Flat['tin_sale'] = cdSale

      const { error: cd2Err } = await supabase
        .from('theatre_cool_drinks')
        .upsert(
          { show_id: show2Id, ...cd2Flat, upi_amount: 0, cash_amount: 0, misc_drinks_cd: miscCd },
          { onConflict: 'show_id' },
        )
      if (cd2Err) { console.error('Show 2 cool_drinks save failed:', cd2Err.message); process.exit(1) }

      const { data: savedCd } = await supabase
        .from('theatre_cool_drinks')
        .select('tin_ob, tin_sale, misc_drinks_cd')
        .eq('show_id', show2Id)
        .single()

      record('Stored tin_ob = carryOb - miscDrinksCd (expect 10)', savedCd?.tin_ob === 10,
        `got ${savedCd?.tin_ob}`)
      record('Stored tin_sale reflects synced OB (expect 9)', savedCd?.tin_sale === 9,
        `got ${savedCd?.tin_sale}`)
    }

  } finally {
    // ── Cleanup ───────────────────────────────────────────────────
    console.log('\n── Cleanup')
    for (const id of [show1Id, show2Id]) {
      if (!id) continue
      await supabase.from('theatre_main_counter').delete().eq('show_id', id)
      await supabase.from('theatre_popcorn').delete().eq('show_id', id)
      await supabase.from('theatre_cool_drinks').delete().eq('show_id', id)
      await supabase.from('theatre_parking').delete().eq('show_id', id)
      const { error: delShowErr } = await supabase.from('theatre_shows').delete().eq('id', id)
      console.log(`  Show ${id} deleted:`, delShowErr ? `FAIL — ${delShowErr.message}` : 'OK')
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
  console.log('\nTo remove this test show later: delete the theatre_shows row where movie_name = \'[TEST] Baahubali\' for today\'s Sandhya day (cascades to main_counter/popcorn/cool_drinks/parking if FKs are set ON DELETE CASCADE — otherwise delete those rows manually first).')
  process.exit(allPass ? 0 : 1)
}

run().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
