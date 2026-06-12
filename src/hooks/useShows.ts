import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sentry } from '@/lib/sentry'
import type { Show } from '@/lib/types'

export function useShows(dayId: string | null) {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!dayId) {
      setLoading(false)
      return
    }

    async function fetchShows() {
      setLoading(true)
      setError(null)

      const { data: rawShows, error: rawShowsError } = await supabase
        .from('theatre_shows')
        .select('*')
        .eq('day_id', dayId)
        .order('show_number', { ascending: true })

      if (rawShowsError) {
        console.error(rawShowsError)
        Sentry.captureException(rawShowsError)
        setError('Could not load shows. Please try again.')
        setLoading(false)
        return
      }

      if (!rawShows || rawShows.length === 0) {
        setShows([])
        setLoading(false)
        return
      }

      const showIds = rawShows.map((s) => s.id)

      // Check all three slip tables — a show is complete only when all three exist
      const [mcRes, pcRes, cdRes] = await Promise.all([
        supabase.from('theatre_main_counter').select('show_id').in('show_id', showIds),
        supabase.from('theatre_popcorn').select('show_id').in('show_id', showIds),
        supabase.from('theatre_cool_drinks').select('show_id').in('show_id', showIds),
      ])

      if (mcRes.error) { console.error(mcRes.error); Sentry.captureException(mcRes.error) }
      if (pcRes.error) { console.error(pcRes.error); Sentry.captureException(pcRes.error) }
      if (cdRes.error) { console.error(cdRes.error); Sentry.captureException(cdRes.error) }

      const mcSet = new Set(mcRes.data?.map((r) => r.show_id) ?? [])
      const pcSet = new Set(pcRes.data?.map((r) => r.show_id) ?? [])
      const cdSet = new Set(cdRes.data?.map((r) => r.show_id) ?? [])

      setShows(
        rawShows.map((s) => ({
          ...s,
          is_complete: mcSet.has(s.id) && pcSet.has(s.id) && cdSet.has(s.id),
        }))
      )
      setLoading(false)
    }

    fetchShows()
  }, [dayId, tick])

  return { shows, loading, error, refetch: () => setTick((t) => t + 1) }
}
