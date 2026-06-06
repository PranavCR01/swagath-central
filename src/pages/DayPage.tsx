import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useDay } from '@/hooks/useDay'
import { useShows } from '@/hooks/useShows'
import ShowCard from '@/components/ShowCard'
import type { Show } from '@/lib/types'
import { Pencil } from 'lucide-react'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

const LANGUAGES = ['Kannada', 'Hindi', 'Tamil', 'Telugu', 'English', 'Other']

export default function DayPage() {
  const { theatreId, date } = useParams<{ theatreId: string; date: string }>()
  const navigate = useNavigate()

  const { day, theatreName, loading: dayLoading, error: dayError } = useDay(theatreId!, date!)
  const { shows, loading: showsLoading, refetch } = useShows(day?.id ?? null)

  const [showForm, setShowForm] = useState(false)
  const [editingShow, setEditingShow] = useState<Show | null>(null)
  const [startTime, setStartTime] = useState('')
  const [movieName, setMovieName] = useState('')
  const [language, setLanguage] = useState('Kannada')
  const [isFanShow, setIsFanShow] = useState(false)
  const [ticketCount, setTicketCount] = useState('')
  const [occupancyPct, setOccupancyPct] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [runningTotal, setRunningTotal] = useState<number | null>(null)

  useEffect(() => {
    if (!shows.length) { setRunningTotal(null); return }
    const showIds = shows.map(s => s.id)
    async function fetchTotals() {
      const [mcRes, pcRes, cdRes, pkRes] = await Promise.all([
        supabase.from('theatre_main_counter').select('upi_amount,cash_amount').in('show_id', showIds),
        supabase.from('theatre_popcorn').select('upi_amount,cash_amount').in('show_id', showIds),
        supabase.from('theatre_cool_drinks').select('upi_amount,cash_amount').in('show_id', showIds),
        supabase.from('theatre_parking').select('reported_amount').in('show_id', showIds),
      ])
      let total = 0
      for (const r of mcRes.data ?? []) total += (r.upi_amount || 0) + (r.cash_amount || 0)
      for (const r of pcRes.data ?? []) total += (r.upi_amount || 0) + (r.cash_amount || 0)
      for (const r of cdRes.data ?? []) total += (r.upi_amount || 0) + (r.cash_amount || 0)
      for (const r of pkRes.data ?? []) total += (r.reported_amount || 0)
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
    setStartTime(''); setMovieName(''); setLanguage('Kannada')
    setIsFanShow(false); setTicketCount(''); setOccupancyPct('')
    setFormError(''); setShowForm(true)
  }

  function openEditForm(show: Show) {
    setEditingShow(show)
    setStartTime(show.start_time)
    setMovieName(show.movie_name)
    setLanguage(show.language)
    setIsFanShow(show.is_fan_show)
    setTicketCount(show.ticket_count != null ? String(show.ticket_count) : '')
    setOccupancyPct(show.occupancy_pct != null ? String(show.occupancy_pct) : '')
    setFormError(''); setShowForm(true)
  }

  function closeSheet() {
    setShowForm(false)
    setEditingShow(null)
  }

  async function handleSubmitShow(e: React.FormEvent) {
    e.preventDefault()
    if (!startTime || !movieName.trim()) { setFormError('Start time and movie name are required'); return }
    setSaving(true); setFormError('')

    if (editingShow) {
      const { error } = await supabase
        .from('theatre_shows')
        .update({
          start_time: startTime,
          movie_name: movieName.trim(),
          language,
          is_fan_show: isFanShow,
          ticket_count: ticketCount ? parseInt(ticketCount, 10) : null,
          occupancy_pct: occupancyPct ? parseInt(occupancyPct, 10) : null,
        })
        .eq('id', editingShow.id)
      setSaving(false)
      if (error) { setFormError(error.message); return }
    } else {
      const { error } = await supabase.from('theatre_shows').insert({
        day_id: day!.id,
        show_number: shows.length + 1,
        start_time: startTime,
        movie_name: movieName.trim(),
        language,
        is_fan_show: isFanShow,
        ticket_count: ticketCount ? parseInt(ticketCount, 10) : null,
        occupancy_pct: occupancyPct ? parseInt(occupancyPct, 10) : null,
      })
      setSaving(false)
      if (error) { setFormError(error.message); return }
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

  // Loading finished but day row is null — insert failed (not a race condition)
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
              />
              <button
                onClick={e => { e.stopPropagation(); openEditForm(s) }}
                style={{
                  position: 'absolute', bottom: 10, right: 10,
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--card-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                }}
              >
                <Pencil size={14} color="var(--muted)" />
              </button>
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

            <form onSubmit={handleSubmitShow} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ width: 56, flexShrink: 0 }}>
                  <ModalLabel>Show #</ModalLabel>
                  <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginTop: 6 }}>
                    {editingShow ? editingShow.show_number : shows.length + 1}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <ModalLabel>Start Time *</ModalLabel>
                  <DarkInput
                    id="start-time" type="time" value={startTime}
                    onChange={e => setStartTime(e.target.value)} required
                  />
                </div>
              </div>

              <div>
                <ModalLabel>Movie Name *</ModalLabel>
                <DarkInput
                  id="movie-name" type="text" value={movieName}
                  placeholder="Enter movie name"
                  onChange={e => setMovieName(e.target.value)} required
                />
              </div>

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

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <ModalLabel>Tickets</ModalLabel>
                  <DarkInput
                    id="tickets" type="text" inputMode="numeric" value={ticketCount}
                    placeholder="0" onChange={e => setTicketCount(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <ModalLabel>Occupancy %</ModalLabel>
                  <DarkInput
                    id="occ" type="text" inputMode="numeric" value={occupancyPct}
                    placeholder="0–100" onChange={e => setOccupancyPct(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
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
