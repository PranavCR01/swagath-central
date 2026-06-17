/**
 * Teardown for same-day out-of-order show insertion test data.
 *
 * Deletes the theatre_days row for 2026-06-25 for Sandhya theatre.
 * Cascade deletes all shows and slip rows automatically.
 *
 * Run:
 *   npx tsx scripts/teardown-same-day-test.ts
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

async function run() {
  console.log(`Signing in as ${EMAIL}...`)
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (authErr) {
    console.error('Auth failed:', authErr.message)
    process.exit(1)
  }
  console.log('Signed in OK\n')

  console.log(`Deleting theatre_days for ${DATE}...`)
  const { data, error } = await supabase
    .from('theatre_days')
    .delete()
    .eq('theatre_id', THEATRE_ID)
    .eq('date', DATE)
    .select('id,date')

  if (error) {
    console.error(`FAIL — ${error.message}`)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('  No rows found — already deleted or never seeded')
  } else {
    for (const row of data) {
      console.log(`  ✓ Deleted day_id=${row.id}  date=${row.date}`)
    }
    console.log('  Cascade deleted all shows and slips for that day.')
  }
  console.log('\nTeardown complete.')
}

run().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
