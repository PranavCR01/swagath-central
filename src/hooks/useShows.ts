import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Show } from '@/lib/types'

export function useShows(dayId: string | null) {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!dayId) {
      setLoading(false)
      return
    }

    async function fetchShows() {
      setLoading(true)

      const { data: rawShows } = await supabase
        .from('theatre_shows')
        .select('*')
        .eq('day_id', dayId)
        .order('show_number', { ascending: true })

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

  return { shows, loading, refetch: () => setTick((t) => t + 1) }
}
