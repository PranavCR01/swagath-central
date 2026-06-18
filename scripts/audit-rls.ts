import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '')
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY ?? ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const PASSWORD     = process.env.THEATRE_PASSWORD ?? ''

// Use service role if available, otherwise anon (pg_policies needs elevated access)
const key = SERVICE_KEY || ANON_KEY
const supabase = createClient(SUPABASE_URL, key)

async function run() {
  if (!SERVICE_KEY) {
    // Authenticate as owner to get elevated PostgREST access
    await supabase.auth.signInWithPassword({ email: 'chaitanya58@gmail.com', password: PASSWORD })
  }

  // pg_policies via rpc if available, else try direct query
  const { data, error } = await supabase.rpc('query_rls_policies')
  if (error) {
    // Try raw SQL via Supabase's SQL endpoint (only works with service role)
    console.log('rpc not available:', error.message)
    console.log('Need service role key or direct DB access to query pg_policies')
    console.log('Attempting via Supabase information_schema workaround...')

    // Fallback: check if RLS is enabled per table via information_schema (accessible to authed users)
    const tables = [
      'theatre_theatres','theatre_days','theatre_shows',
      'theatre_main_counter','theatre_popcorn','theatre_cool_drinks',
      'theatre_parking','theatre_expenses','theatre_expense_others',
      'theatre_staff_wages',
    ]

    for (const t of tables) {
      // Try insert of empty data to provoke a policy error vs schema error
      // Actually just try selecting - if SELECT works, RLS SELECT policy exists
      const { error: selErr } = await supabase.from(t).select('id').limit(1)
      console.log(`  ${t}: SELECT → ${selErr ? 'BLOCKED: '+selErr.message : 'OK'}`)
    }
    return
  }
  for (const row of data ?? []) console.log(JSON.stringify(row))
}

run().catch(err => { console.error(err); process.exit(1) })
