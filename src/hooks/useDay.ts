import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sentry } from '@/lib/sentry'
import type { Day } from '@/lib/types'

export function useDay(theatreId: string, date: string) {
  const [day, setDay] = useState<Day | null>(null)
  const [theatreName, setTheatreName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!theatreId || !date) return

    async function getOrCreate() {
      const [{ data: theatre }, { data: existing }] = await Promise.all([
        supabase.from('theatre_theatres').select('name').eq('id', theatreId).single(),
        supabase
          .from('theatre_days')
          .select('*')
          .eq('theatre_id', theatreId)
          .eq('date', date)
          .maybeSingle(),
      ])

      if (theatre) setTheatreName(theatre.name)

      if (existing) {
        setDay(existing)
        setLoading(false)
        return
      }

      const { data: created, error: insertError } = await supabase
        .from('theatre_days')
        .insert({ theatre_id: theatreId, date })
        .select()
        .single()

      if (insertError) {
        // 23505 = unique_violation: another concurrent mount inserted the row first — re-fetch it
        if (insertError.code === '23505') {
          const { data: raced } = await supabase
            .from('theatre_days')
            .select('*')
            .eq('theatre_id', theatreId)
            .eq('date', date)
            .single()
          setDay(raced ?? null)
        } else {
          console.error(insertError)
          Sentry.captureException(insertError)
          setError('Could not load this day. Please try again.')
        }
      } else {
        setDay(created)
      }
      setLoading(false)
    }

    getOrCreate()
  }, [theatreId, date])

  return { day, theatreName, loading, error }
}
