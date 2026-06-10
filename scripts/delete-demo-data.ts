/**
 * Cleanup script for Insights demo data (Slice 5).
 *
 * Deletes everything inserted by scripts/seed-demo-data.ts:
 * all theatre_shows rows where movie_name LIKE '[DEMO]%', their child
 * slip rows, and any theatre_days/expenses/staff_wages rows that become
 * empty as a result.
 *
 * Run: npx tsx scripts/delete-demo-data.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

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

async function run() {
  console.log(`Signing in as ${EMAIL}...`)
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1) }
  console.log('Signed in OK\n')

  const { data: demoShows, error: showsErr } = await supabase
    .from('theatre_shows')
    .select('id, day_id')
    .like('movie_name', '[DEMO]%')
  if (showsErr) { console.error('Failed to fetch demo shows:', showsErr.message); process.exit(1) }

  if (!demoShows || demoShows.length === 0) {
    console.log('No [DEMO] rows found. Nothing to clean up.')
    return
  }

  const showIds = demoShows.map(s => s.id as string)
  const dayIds = [...new Set(demoShows.map(s => s.day_id as string))]
  console.log(`Found ${showIds.length} demo shows across ${dayIds.length} days.`)

  for (const table of ['theatre_main_counter', 'theatre_popcorn', 'theatre_cool_drinks', 'theatre_parking']) {
    const { error } = await supabase.from(table).delete().in('show_id', showIds)
    if (error) console.error(`  ${table} delete failed:`, error.message)
    else console.log(`  Deleted ${table} rows for demo shows`)
  }

  const { error: showDelErr } = await supabase.from('theatre_shows').delete().in('id', showIds)
  if (showDelErr) console.error('  theatre_shows delete failed:', showDelErr.message)
  else console.log(`  Deleted ${showIds.length} theatre_shows rows`)

  // Clean up day-level rows for days that now have no shows left
  let emptyDays = 0
  for (const dayId of dayIds) {
    const { count } = await supabase
      .from('theatre_shows')
      .select('id', { count: 'exact', head: true })
      .eq('day_id', dayId)
    if (count && count > 0) continue

    await supabase.from('theatre_expenses').delete().eq('day_id', dayId)
    await supabase.from('theatre_staff_wages').delete().eq('day_id', dayId)
    await supabase.from('theatre_days').delete().eq('id', dayId)
    emptyDays++
  }
  console.log(`  Removed expenses/staff_wages/days for ${emptyDays} now-empty days`)

  console.log('\nDemo data cleanup complete.')
}

run().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
