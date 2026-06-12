import { supabase } from './supabase'
import { safeIn } from './utils'

// Fetches mc, popcorn, cd, parking rows for an array of show IDs
// Used by DayClosePage, insightsQueries, and aiSummary — currently duplicated in all three
export async function loadSlipDataForShows(showIds: string[]) {
  if (!showIds.length) return { mc: [], pc: [], cd: [], parking: [] }
  const safe = safeIn(showIds)
  const [mcRes, pcRes, cdRes, pkRes] = await Promise.all([
    supabase.from('theatre_main_counter').select('*').in('show_id', safe),
    supabase.from('theatre_popcorn').select('*').in('show_id', safe),
    supabase.from('theatre_cool_drinks').select('*').in('show_id', safe),
    supabase.from('theatre_parking').select('*').in('show_id', safe),
  ])
  return {
    mc: mcRes.data ?? [],
    pc: pcRes.data ?? [],
    cd: cdRes.data ?? [],
    parking: pkRes.data ?? [],
  }
}
