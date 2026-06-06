import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import LoginPage from '@/pages/LoginPage'
import HomePage from '@/pages/HomePage'
import DayPage from '@/pages/DayPage'
import ShowPage from '@/pages/ShowPage'
import DayClosePage from '@/pages/DayClosePage'
import HistoryPage from '@/pages/HistoryPage'

function ProtectedRoute() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/theatre/:theatreId/day/:date" element={<DayPage />} />
          <Route path="/theatre/:theatreId/day/:date/show/:showId" element={<ShowPage />} />
          <Route path="/theatre/:theatreId/day/:date/close" element={<DayClosePage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
    </div>
  )
}
