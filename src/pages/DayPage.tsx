import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useDay } from '@/hooks/useDay'
import { useShows } from '@/hooks/useShows'
import ShowCard from '@/components/ShowCard'
import type { Show } from '@/lib/types'
import { Calendar, Clock, User } from 'lucide-react'
import { getTodayIST, getYesterdayIST } from '@/lib/utils'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

const LANGUAGES = ['Kannada', 'Hindi', 'Tamil', 'Telugu', 'English', 'Other']

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function to12Hour(time24: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
  const [h, m] = time24.split(':').map(Number)
  return { hour12: h % 12 || 12, minute: m, ampm: h < 12 ? 'AM' : 'PM' }
}

function to24Hour(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  const h24 = ampm === 'AM' ? (hour12 === 12 ? 0 : hour12) : (hour12 === 12 ? 12 : hour12 + 12)
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatShowDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const today = getTodayIST()
  const yesterday = getYesterdayIST()
  const tag = iso === today ? 'Today' : iso === yesterday ? 'Yesterday' : null
  const base = `${DOW[dt.getDay()]}, ${d} ${MON[m - 1]} ${y}`
  return tag ? `${tag} · ${base}` : base
}

export default function DayPage() {
  const { theatreId, date } = useParams<{ theatreId: string; date: string }>()
  const navigate = useNavigate()

  const { day, theatreName, loading: dayLoading, error: dayError } = useDay(theatreId!, date!)
  const { shows, loading: showsLoading, error: showsError, refetch } = useShows(day?.id ?? null)

  // Theatre capacity
  const [capacity, setCapacity] = useState<number | null>(null)

  useEffect(() => {
    if (!theatreId) return
    supabase
      .from('theatre_theatres')
      .select('capacity')
      .eq('id', theatreId)
      .single()
      .then(({ data }) => { if (data?.capacity != null) setCapacity(data.capacity) })
  }, [theatreId])

  // Sheet open/edit state
  const [showForm, setShowForm] = useState(false)
  const [editingShow, setEditingShow] = useState<Show | null>(null)

  // Form fields
  const [showDate, setShowDate] = useState(getTodayIST())
  const [dateFocus, setDateFocus] = useState(false)
  const [ampmFocus, setAmpmFocus] = useState(false)
  const [startTime, setStartTime] = useState('10:00')
  const [movieName, setMovieName] = useState('')
  const [language, setLanguage] = useState('Kannada')
  const [isFanShow, setIsFanShow] = useState(false)
  const [boxTickets, setBoxTickets] = useState('')
  const [goldTickets, setGoldTickets] = useState('')
  const [silverTickets, setSilverTickets] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  // Derived ticket values (not state)
  const totalTickets = (Number(boxTickets) || 0) + (Number(goldTickets) || 0) + (Number(silverTickets) || 0)
  const occupancyPct = capacity ? (totalTickets / capacity) * 100 : 0
  const occupancyDisplay = occupancyPct.toFixed(1) + '%'

  const [runningTotal, setRunningTotal] = useState<number | null>(null)

  useEffect(() => {
    if (!shows.length) { setRunningTotal(null); return }
    const showIds = shows.map(s => s.id)
    async function fetchTotals() {
      const [mcRes, pcRes, cdRes, pkRes] = await Promise.all([
        supabase.from('theatre_main_counter').select('upi_amount,cash_amount').in('show_id', showIds),
        supabase.from('theatre_popcorn').select('upi_amount,cash_amount').in('show_id', showIds),
        supabase.from('theatre_cool_drinks').select('upi_amount,cash_amount').in('show_id', showIds),
        supabase.from('theatre_parking').select('upi_amount,cash_amount').in('show_id', showIds),
      ])
      let total = 0
      for (const r of mcRes.data ?? []) total += (r.upi_amount || 0) + (r.cash_amount || 0)
      for (const r of pcRes.data ?? []) total += (r.upi_amount || 0) + (r.cash_amount || 0)
      for (const r of cdRes.data ?? []) total += (r.upi_amount || 0) + (r.cash_amount || 0)
      for (const r of pkRes.data ?? []) total += (r.upi_amount || 0) + (r.cash_amount || 0)
      setRunningTotal(total)
    }
    fetchTotals()
  }, [shows])

  const displayDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : ''

  function openForm() {
    setEditingShow(null)
    setShowDate(getTodayIST())
    setStartTime('10:00'); setMovieName(''); setLanguage('Kannada')
    setIsFanShow(false)
    setBoxTickets(''); setGoldTickets(''); setSilverTickets('')
    setFormError(''); setShowForm(true)
  }

  function openEditForm(show: Show) {
    setEditingShow(show)
    setShowDate(show.show_date ?? getTodayIST())
    setStartTime(show.start_time)
    setMovieName(show.movie_name)
    setLanguage(show.language)
    setIsFanShow(show.is_fan_show)
    setBoxTickets(show.box_tickets != null ? String(show.box_tickets) : '')
    setGoldTickets(show.gold_tickets != null ? String(show.gold_tickets) : '')
    setSilverTickets(show.silver_tickets != null ? String(show.silver_tickets) : '')
    setFormError(''); setShowForm(true)
  }

  function closeSheet() {
    setShowForm(false)
    setEditingShow(null)
  }

  async function handleDeleteShow(showId: string) {
    const confirmed = window.confirm('Delete this show? This will also remove all slip data entered for it.')
    if (!confirmed) return
    const { error } = await supabase.from('theatre_shows').delete().eq('id', showId)
    if (error) { console.error(error); showToast('Failed to delete show — try again'); return }

    // Re-fetch remaining shows ordered by start_time and re-number them sequentially
    const { data: remaining } = await supabase
      .from('theatre_shows')
      .select('id,start_time')
      .eq('day_id', day!.id)
      .order('start_time', { ascending: true })

    if (remaining?.length) {
      // Pass 1: move all to temp values to clear unique constraint slots
      const tempResults = await Promise.all(
        remaining.map((s, idx) =>
          supabase.from('theatre_shows').update({ show_number: 1000 + idx }).eq('id', s.id)
        )
      )
      const tempFailed = tempResults.filter(r => r.error)
      if (tempFailed.length) {
        console.error('Show renumbering (delete temp pass) failed for', tempFailed.length, 'shows:', tempFailed.map(f => f.error))
        showToast('Show order may be incorrect — please refresh')
      }

      // Pass 2: write final correct show_number values
      const finalResults = await Promise.all(
        remaining.map((s, idx) =>
          supabase.from('theatre_shows').update({ show_number: idx + 1 }).eq('id', s.id)
        )
      )
      const finalFailed = finalResults.filter(r => r.error)
      if (finalFailed.length) {
        console.error('Show renumbering (delete final pass) failed for', finalFailed.length, 'shows:', finalFailed.map(f => f.error))
        showToast('Show order may be incorrect — please refresh')
      }
    }

    refetch()
  }

  async function handleSubmitShow(e: React.FormEvent) {
    e.preventDefault()
    if (!startTime || !movieName.trim()) { setFormError('Start time and movie name are required'); return }
    setSaving(true); setFormError('')

    const ticketPayload = {
      show_date: showDate,
      start_time: startTime,
      movie_name: movieName.trim(),
      language,
      is_fan_show: isFanShow,
      box_tickets: Number(boxTickets) || 0,
      gold_tickets: Number(goldTickets) || 0,
      silver_tickets: Number(silverTickets) || 0,
      ticket_count: totalTickets || null,
      occupancy_pct: capacity ? Math.round((totalTickets / capacity) * 100) : null,
    }

    if (editingShow) {
      const { error } = await supabase
        .from('theatre_shows')
        .update(ticketPayload)
        .eq('id', editingShow.id)
      setSaving(false)
      if (error) { console.error(error); setFormError('Could not save show. Please try again.'); return }
    } else {
      let targetDayId = day!.id

      if (showDate !== date) {
        const { data: existingDay } = await supabase
          .from('theatre_days')
          .select('id')
          .eq('theatre_id', theatreId!)
          .eq('date', showDate)
          .maybeSingle()

        if (existingDay) {
          targetDayId = existingDay.id
        } else {
          const { data: newDay, error: dayInsertError } = await supabase
            .from('theatre_days')
            .insert({ theatre_id: theatreId!, date: showDate })
            .select('id')
            .single()

          if (dayInsertError || !newDay) {
            setSaving(false)
            setFormError('Failed to create day record for selected date')
            return
          }
          targetDayId = newDay.id
        }
      }

      // Show count for the target day (may differ from the current URL day)
      const { count } = await supabase
        .from('theatre_shows')
        .select('id', { count: 'exact', head: true })
        .eq('day_id', targetDayId)

      const { error } = await supabase.from('theatre_shows').insert({
        day_id: targetDayId,
        show_number: (count ?? 0) + 1,
        ...ticketPayload,
      })
      setSaving(false)
      if (error) { console.error(error); setFormError('Could not save show. Please try again.'); return }

      // Re-number all shows for this day in start_time order
      const { data: allShows } = await supabase
        .from('theatre_shows')
        .select('id,start_time')
        .eq('day_id', targetDayId)
        .order('start_time', { ascending: true })

      if (allShows?.length) {
        // Pass 1: move all to temp values to clear unique constraint slots
        const tempResults = await Promise.all(
          allShows.map((s, idx) =>
            supabase.from('theatre_shows').update({ show_number: 1000 + idx }).eq('id', s.id)
          )
        )
        const tempFailed = tempResults.filter(r => r.error)
        if (tempFailed.length) {
          console.error('Show renumbering (insert temp pass) failed for', tempFailed.length, 'shows:', tempFailed.map(f => f.error))
          showToast('Show order may be incorrect — please refresh')
        }

        // Pass 2: write final correct show_number values
        const finalResults = await Promise.all(
          allShows.map((s, idx) =>
            supabase.from('theatre_shows').update({ show_number: idx + 1 }).eq('id', s.id)
          )
        )
        const finalFailed = finalResults.filter(r => r.error)
        if (finalFailed.length) {
          console.error('Show renumbering (insert final pass) failed for', finalFailed.length, 'shows:', finalFailed.map(f => f.error))
          showToast('Show order may be incorrect — please refresh')
        }
      }
    }

    closeSheet()
    refetch()
  }

  if (dayLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  if (!day) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: 24,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
          Could not create today's session
        </div>
        {dayError && (
          <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 280, textAlign: 'center' }}>
            {dayError}
          </div>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8, height: 46, padding: '0 28px',
            background: 'var(--accent)', color: 'var(--accent-ink)',
            border: 'none', borderRadius: 14,
            fontWeight: 650, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 6px 22px -8px var(--accent-glow)',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  const todayIST = getTodayIST()
  const yesterdayIST = getYesterdayIST()

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex', flexDirection: 'column',
      paddingBottom: 80,
    }}>
      {/* Header */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', borderBottom: '1px solid var(--card-border)', background: 'var(--bg)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'var(--surface)', border: '1px solid var(--card-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
              {theatreName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{displayDate}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 600 }}>
            Running
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 600, color: 'var(--accent)' }}>
            {runningTotal !== null ? '₹' + inrFmt.format(runningTotal) : '₹—'}
          </div>
        </div>
      </div>

      {/* Shows list */}
      <div style={{ flex: 1, padding: '18px 18px 8px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {showsError && (
          <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--muted)', fontSize: 12 }}>
            {showsError}
          </div>
        )}
        {showsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading shows…</div>
          </div>
        ) : shows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
            No shows yet. Tap "Add Show" to begin.
          </div>
        ) : (
          shows.map((s) => (
            <div key={s.id} style={{ position: 'relative' }}>
              <ShowCard
                showNumber={s.show_number}
                startTime={s.start_time}
                movieName={s.movie_name}
                language={s.language}
                isFanShow={s.is_fan_show}
                ticketCount={s.ticket_count ?? undefined}
                occupancyPct={s.occupancy_pct ?? undefined}
                isComplete={s.is_complete}
                onClick={() => navigate(`/theatre/${theatreId}/day/${date}/show/${s.id}`)}
                showDate={s.show_date ?? undefined}
                todayIST={todayIST}
                yesterdayIST={yesterdayIST}
                onEdit={e => { e.stopPropagation(); openEditForm(s) }}
                onDelete={e => { e.stopPropagation(); handleDeleteShow(s.id) }}
              />
            </div>
          ))
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', gap: 12, padding: '14px 18px',
        borderTop: '1px solid var(--card-border)', background: 'var(--bg)',
      }}>
        <button
          onClick={openForm}
          style={{
            flex: 1, height: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--accent)', color: 'var(--accent-ink)',
            border: 'none', borderRadius: 14,
            fontWeight: 650, fontSize: 16, cursor: 'pointer',
            boxShadow: '0 6px 22px -8px var(--accent-glow)',
            fontFamily: 'inherit',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Show
        </button>
        {shows.length > 0 && (
          <button
            onClick={() => navigate(`/theatre/${theatreId}/day/${date}/close`)}
            style={{
              flexShrink: 0, height: 50, padding: '0 18px',
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent', color: 'var(--muted)',
              border: '1.5px solid rgba(255,255,255,0.15)',
              borderRadius: 14, fontWeight: 600, fontSize: 15,
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12l5 5 11-11" />
            </svg>
            Close Day
          </button>
        )}
      </div>

      {/* Add / Edit Show sheet */}
      {showForm && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
            onClick={closeSheet}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: 'var(--surface-2)',
            border: '1px solid var(--card-border)',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '20px 20px 36px',
            maxHeight: '88vh', overflowY: 'auto',
          }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--card-border)', margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                {editingShow ? 'Edit Show' : 'Add Show'}
              </h2>
              <button
                onClick={closeSheet}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--surface)', border: '1px solid var(--card-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitShow} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Show # */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ width: 56, flexShrink: 0 }}>
                  <ModalLabel>Show #</ModalLabel>
                  <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginTop: 6 }}>
                    {editingShow ? editingShow.show_number : shows.length + 1}
                  </div>
                </div>
              </div>

              {/* Show date */}
              <div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>Show date</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {[
                    { id: todayIST, label: 'Today' },
                    { id: yesterdayIST, label: 'Yesterday' },
                  ].map(c => {
                    const on = showDate === c.id
                    return (
                      <button
                        key={c.id} type="button" onClick={() => setShowDate(c.id)}
                        style={{
                          height: 38, padding: '0 16px', borderRadius: 999,
                          cursor: 'pointer', fontFamily: 'inherit',
                          fontSize: 13.5, fontWeight: on ? 650 : 500,
                          background: on ? 'var(--accent)' : 'var(--input-bg)',
                          color: on ? 'var(--accent-ink)' : 'var(--muted)',
                          border: `1.5px solid ${on ? 'transparent' : 'var(--input-border)'}`,
                          boxShadow: on ? '0 4px 14px -4px var(--accent-glow)' : 'none',
                          transition: 'all .18s',
                        }}
                      >
                        {c.label}
                      </button>
                    )
                  })}
                </div>
                {/* Date picker */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 14px',
                  background: 'var(--input-bg)', borderRadius: 'var(--r-input)',
                  border: `1.5px solid ${dateFocus ? 'var(--accent)' : 'var(--input-border)'}`,
                  boxShadow: dateFocus ? '0 0 0 4px var(--accent-ring)' : 'none',
                  transition: 'border-color .18s, box-shadow .18s',
                  boxSizing: 'border-box',
                }}>
                  <Calendar size={19} color={dateFocus ? 'var(--accent)' : 'var(--muted)'} />
                  <input
                    type="date"
                    value={showDate}
                    max={todayIST}
                    onChange={e => setShowDate(e.target.value)}
                    onFocus={() => setDateFocus(true)}
                    onBlur={() => setDateFocus(false)}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      color: 'var(--text)', fontSize: 16, fontFamily: 'var(--mono)',
                      colorScheme: 'dark', minWidth: 0,
                    }}
                  />
                </div>
                {/* Back-dated indicator */}
                {showDate !== todayIST && (
                  <div style={{
                    fontSize: 12, color: 'var(--purple-text)', marginTop: 8,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="var(--purple-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
                    </svg>
                    Back-dated entry · {formatShowDate(showDate)}
                  </div>
                )}
              </div>

              {/* Start Time */}
              <div>
                <ModalLabel>Start time *</ModalLabel>
                {(() => {
                  const { hour12, minute, ampm } = to12Hour(startTime)
                  const selectStyle: React.CSSProperties = {
                    background: 'var(--surface)', border: 'none', outline: 'none',
                    color: 'var(--text)', fontSize: 16, fontFamily: 'var(--mono)',
                    colorScheme: 'dark', cursor: 'pointer', borderRadius: 4,
                  }
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, height: 52, padding: '0 14px',
                      background: 'var(--input-bg)',
                      border: '1.5px solid var(--input-border)',
                      borderRadius: 'var(--r-input)',
                    }}>
                      <Clock size={19} color="var(--muted)" strokeWidth={1.8} />
                      <select
                        value={hour12}
                        onChange={e => setStartTime(to24Hour(Number(e.target.value), minute, ampm))}
                        style={selectStyle}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                          <option key={h} value={h} style={{ background: 'var(--surface)', color: 'var(--text)' }}>{h}</option>
                        ))}
                      </select>
                      <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 16 }}>:</span>
                      <select
                        value={minute}
                        onChange={e => setStartTime(to24Hour(hour12, Number(e.target.value), ampm))}
                        style={selectStyle}
                      >
                        {Array.from({ length: 60 }, (_, i) => i).map(m => (
                          <option key={m} value={m} style={{ background: 'var(--surface)', color: 'var(--text)' }}>{String(m).padStart(2, '0')}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setStartTime(to24Hour(hour12, minute, ampm === 'AM' ? 'PM' : 'AM'))}
                        onFocus={() => setAmpmFocus(true)}
                        onBlur={() => setAmpmFocus(false)}
                        style={{
                          marginLeft: 'auto', background: 'transparent', border: 'none', outline: 'none',
                          cursor: 'pointer', borderRadius: 6, padding: '4px 10px',
                          fontSize: 14, fontWeight: 600, fontFamily: 'var(--mono)',
                          color: ampmFocus ? 'var(--accent)' : 'var(--text)',
                        }}
                      >
                        {ampm}
                      </button>
                    </div>
                  )
                })()}
              </div>

              {/* Movie Name */}
              <div>
                <ModalLabel>Movie Name *</ModalLabel>
                <DarkInput
                  id="movie-name" type="text" value={movieName}
                  placeholder="Enter movie name"
                  onChange={e => setMovieName(e.target.value)} required
                />
              </div>

              {/* Language */}
              <div>
                <ModalLabel>Language</ModalLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang} type="button" onClick={() => setLanguage(lang)}
                      style={{
                        padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                        background: language === lang ? 'var(--accent)' : 'var(--surface)',
                        color: language === lang ? 'var(--accent-ink)' : 'var(--muted)',
                        border: language === lang
                          ? '1.5px solid var(--accent)'
                          : '1.5px solid var(--input-border)',
                        transition: 'background .15s, color .15s',
                      }}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fan Show */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>Fan Show</span>
                <button
                  type="button" onClick={() => setIsFanShow(v => !v)}
                  style={{
                    width: 44, height: 24, borderRadius: 999, border: 'none',
                    background: isFanShow ? 'var(--accent)' : 'var(--surface)',
                    position: 'relative', cursor: 'pointer', transition: 'background .2s',
                    boxShadow: isFanShow ? '0 0 0 1px var(--accent)' : '0 0 0 1px var(--input-border)',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2,
                    left: isFanShow ? 22 : 2,
                    width: 20, height: 20, borderRadius: 999,
                    background: 'white', transition: 'left .2s',
                  }} />
                </button>
              </div>

              {/* Tickets & Occupancy */}
              <div>
                <div style={{
                  fontSize: 11, color: 'var(--muted)', fontWeight: 600,
                  letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 12,
                }}>
                  Tickets &amp; Occupancy
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <TicketInput label="Box" value={boxTickets} onChange={setBoxTickets} />
                  <TicketInput label="Gold" value={goldTickets} onChange={setGoldTickets} />
                  <TicketInput label="Silver" value={silverTickets} onChange={setSilverTickets} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <ComputedStat label="Total tickets" value={inrFmt.format(totalTickets)} />
                  <ComputedStat label="Occupancy" value={occupancyDisplay} />
                </div>
                {occupancyPct > 100 && (
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                    ⚠ Occupancy exceeds 100% — verify ticket counts
                  </div>
                )}
                {capacity != null && (
                  <div style={{
                    fontSize: 11, color: 'var(--muted)', opacity: 0.65, marginTop: 10,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <User size={12} color="var(--muted)" />
                    {theatreName} · {inrFmt.format(capacity)} seats
                  </div>
                )}
              </div>

              {formError && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>
                  {formError}
                </p>
              )}

              <button
                type="submit" disabled={saving}
                style={{
                  marginTop: 4, height: 52, width: '100%',
                  background: saving ? 'rgba(245,158,11,0.6)' : 'var(--accent)',
                  color: 'var(--accent-ink)',
                  border: 'none', borderRadius: 14,
                  fontWeight: 650, fontSize: 16,
                  cursor: saving ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 6px 22px -8px var(--accent-glow)',
                }}
              >
                {editingShow
                  ? (saving ? 'Updating…' : 'Update Show')
                  : (saving ? 'Saving…' : 'Save Show')}
              </button>
            </form>
          </div>
        </>
      )}

      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface-2)', border: '1px solid var(--card-border)',
          color: 'var(--green)', borderRadius: 999,
          padding: '8px 20px', fontSize: 14, fontWeight: 600,
          pointerEvents: 'none', zIndex: 50,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function ModalLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6, letterSpacing: '.04em', textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

function DarkInput({ id, type, value, onChange, placeholder, required, inputMode }: {
  id: string; type: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string; required?: boolean; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  const [focus, setFocus] = useState(false)
  return (
    <input
      id={id} type={type} value={value} placeholder={placeholder} required={required}
      inputMode={inputMode}
      onChange={onChange}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        display: 'block', width: '100%', height: 46, padding: '0 12px', boxSizing: 'border-box',
        background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
        border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
        borderRadius: 10, color: 'var(--text)', fontSize: 15, outline: 'none',
        fontFamily: 'inherit',
        boxShadow: focus ? '0 0 0 3px var(--accent-ring)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
      }}
    />
  )
}

function TicketInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [focus, setFocus] = useState(false)
  return (
    <label style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: '.03em', textAlign: 'center' }}>
        {label}
      </span>
      <input
        inputMode="numeric"
        value={value}
        placeholder="0"
        onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
        onFocus={e => { setFocus(true); e.target.select() }}
        onBlur={() => setFocus(false)}
        style={{
          width: '100%', height: 52, textAlign: 'center', boxSizing: 'border-box',
          background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
          border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
          borderRadius: 'var(--r-input)', color: 'var(--text)',
          fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, outline: 'none',
          boxShadow: focus ? '0 0 0 4px var(--accent-ring)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      />
    </label>
  )
}

function ComputedStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1, padding: '12px 16px',
      background: 'var(--input-bg)', border: '1px solid var(--card-border)',
      borderRadius: 'var(--r-input)',
    }}>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 600, color: 'var(--accent)',
        textShadow: '0 0 18px var(--accent-glow)', marginTop: 3, lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  )
}
