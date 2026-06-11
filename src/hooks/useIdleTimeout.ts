import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const IDLE_LIMIT_MS = 30 * 60 * 1000 // 30 minutes
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'touchstart'] as const

export function useIdleTimeout() {
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/login', { state: { idleTimeout: true } })
      }, IDLE_LIMIT_MS)
    }

    reset()
    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, reset))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, reset))
    }
  }, [navigate])
}
