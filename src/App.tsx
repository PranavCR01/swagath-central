import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import type { Session } from '@supabase/supabase-js'
import { Sentry } from '@/lib/sentry'
import LoginPage from '@/pages/LoginPage'
import HomePage from '@/pages/HomePage'
import DayPage from '@/pages/DayPage'
import ShowPage from '@/pages/ShowPage'
import DayClosePage from '@/pages/DayClosePage'
import HistoryPage from '@/pages/HistoryPage'
import InsightsPage from '@/pages/InsightsPage'
import AISummaryPage from '@/pages/AISummaryPage'

const ErrorFallback = () => (
  <div style={{
    minHeight: '100vh', background: 'var(--bg)', display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 16, padding: 24, fontFamily: 'Inter, sans-serif',
  }}>
    <div style={{ fontSize: 32 }}>⚠️</div>
    <div style={{ color: 'var(--text)', fontSize: 18, fontWeight: 600 }}>Something went wrong</div>
    <div style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center' }}>
      The error has been reported. Please refresh the page.
    </div>
    <button
      onClick={() => window.location.reload()}
      style={{
        marginTop: 8, height: 44, padding: '0 24px',
        background: 'var(--accent)', color: 'var(--accent-ink)',
        border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer',
      }}
    >
      Refresh
    </button>
  </div>
)

function ProtectedRoute() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useIdleTimeout()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

function RootRedirect() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
  }, [])

  if (session === undefined) return null
  return <Navigate to={session ? '/home' : '/login'} replace />
}

export default function App() {
  return (
    <div className="t">
    <Sentry.ErrorBoundary fallback={ErrorFallback}>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/theatre/:theatreId/day/:date" element={<DayPage />} />
          <Route path="/theatre/:theatreId/day/:date/show/:showId" element={<ShowPage />} />
          <Route path="/theatre/:theatreId/day/:date/close" element={<DayClosePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/summary/:theatreId/:date" element={<AISummaryPage />} />
        </Route>
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
    </Sentry.ErrorBoundary>
    </div>
  )
}
