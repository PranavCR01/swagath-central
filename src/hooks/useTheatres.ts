import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Theatre } from '@/lib/types'

export function useTheatres() {
  const [theatres, setTheatres] = useState<Theatre[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('theatre_theatres')
      .select('*')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setTheatres(data ?? [])
        setLoading(false)
      })
  }, [])

  return { theatres, loading, error }
}
