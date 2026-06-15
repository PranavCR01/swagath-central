import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTheatres } from '@/hooks/useTheatres'
import { getTodayIST, safeIn } from '@/lib/utils'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const rupee = (n: number) => '₹' + inrFmt.format(Math.round(n))

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const DOT_COLORS: Record<string, string> = {
  Sandhya: '#f59e0b',
  Manasa: '#a78bfa',
}

interface HistoryRow {
  dayId: string
  theatreId: string
  theatreName: string
  date: string
  showCount: number
  totalSales: number
  bCash: number | null
  isClosed: boolean
}

// ── Data layer ──────────────────────────────────────────────────

type DayRef = { id: string; theatre_id: string; date: string }

async function buildHistoryRows(
  days: DayRef[],
  theatreMap: Record<string, string>,
): Promise<HistoryRow[]> {
  if (!days.length) return []

  const dayIds = days.map(d => d.id)

  // Batch: shows for these days
  const { data: showsData } = await supabase
    .from('theatre_shows').select('id,day_id')
    .in('day_id', safeIn(dayIds))

  const showToDay: Record<string, string> = {}
  const showsPerDay: Record<string, number> = {}
  const showIds: string[] = []
  for (const s of showsData ?? []) {
    showToDay[s.id] = s.day_id
    showsPerDay[s.day_id] = (showsPerDay[s.day_id] ?? 0) + 1
    showIds.push(s.id)
  }

  // Batch: slip totals for those shows
  const totalsPerDay: Record<string, number> = {}
  function addToDay(showId: string, amt: number) {
    const dId = showToDay[showId]
    if (dId) totalsPerDay[dId] = (totalsPerDay[dId] ?? 0) + amt
  }

  if (showIds.length) {
    const [mc, pc, cd, pk] = await Promise.all([
      supabase.from('theatre_main_counter').select('show_id,upi_amount,cash_amount').in('show_id', safeIn(showIds)),
      supabase.from('theatre_popcorn').select('show_id,upi_amount,cash_amount').in('show_id', safeIn(showIds)),
      supabase.from('theatre_cool_drinks').select('show_id,upi_amount,cash_amount').in('show_id', safeIn(showIds)),
      supabase.from('theatre_parking').select('show_id,upi_amount,cash_amount').in('show_id', safeIn(showIds)),
    ])
    type SlipR = { show_id: string; upi_amount: number; cash_amount: number }
    type PkR = { show_id: string; upi_amount: number | null; cash_amount: number | null }
    for (const r of (mc.data ?? []) as SlipR[]) addToDay(r.show_id, (r.upi_amount || 0) + (r.cash_amount || 0))
    for (const r of (pc.data ?? []) as SlipR[]) addToDay(r.show_id, (r.upi_amount || 0) + (r.cash_amount || 0))
    for (const r of (cd.data ?? []) as SlipR[]) addToDay(r.show_id, (r.upi_amount || 0) + (r.cash_amount || 0))
    for (const r of (pk.data ?? []) as PkR[]) addToDay(r.show_id, (r.upi_amount || 0) + (r.cash_amount || 0))
  }

  // Expenses (to determine closed status + B.Cash)
  const { data: expData } = await supabase
    .from('theatre_expenses')
    .select('day_id,wages,staff_coffee,water_cans,lab_food,wastage,others_amount')
    .in('day_id', safeIn(dayIds))

  const closedDays = new Set<string>()
  const bCashMap: Record<string, number> = {}
  type ExpR = { day_id: string; wages: number; staff_coffee: number; water_cans: number; lab_food: number; wastage: number; others_amount: number }
  for (const e of (expData ?? []) as ExpR[]) {
    closedDays.add(e.day_id)
    const totalExp = (e.wages || 0) + (e.staff_coffee || 0) + (e.water_cans || 0) +
      (e.lab_food || 0) + (e.wastage || 0) + (e.others_amount || 0)
    bCashMap[e.day_id] = (totalsPerDay[e.day_id] ?? 0) - totalExp
  }

  return days.map(d => ({
    dayId: d.id,
    theatreId: d.theatre_id,
    theatreName: theatreMap[d.theatre_id] ?? '',
    date: d.date,
    showCount: showsPerDay[d.id] ?? 0,
    totalSales: totalsPerDay[d.id] ?? 0,
    bCash: closedDays.has(d.id) ? bCashMap[d.id] : null,
    isClosed: closedDays.has(d.id),
  }))
}

function monthRange(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${year}-${pad(month + 1)}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`
  return { start, end }
}

// Lightweight: just enough to drive the calendar dots
async function loadMonthStatus(
  theatreIds: string[],
  year: number,
  month: number,
): Promise<Record<string, 'open' | 'closed'>> {
  if (!theatreIds.length) return {}
  const { start, end } = monthRange(year, month)

  const { data: days } = await supabase
    .from('theatre_days').select('id,theatre_id,date')
    .in('theatre_id', safeIn(theatreIds))
    .gte('date', start)
    .lte('date', end)

  if (!days?.length) return {}

  const dayIds = days.map(d => d.id)
  const { data: expData } = await supabase
    .from('theatre_expenses').select('day_id')
    .in('day_id', safeIn(dayIds))

  const closedDayIds = new Set((expData ?? []).map(e => e.day_id as string))

  const idsByDate: Record<string, string[]> = {}
  for (const d of days) (idsByDate[d.date] ??= []).push(d.id)

  const status: Record<string, 'open' | 'closed'> = {}
  for (const [date, ids] of Object.entries(idsByDate)) {
    status[date] = ids.every(id => closedDayIds.has(id)) ? 'closed' : 'open'
  }
  return status
}

// On demand, when a calendar cell is tapped
async function loadSelectedDay(
  theatreIds: string[],
  theatreMap: Record<string, string>,
  date: string,
): Promise<HistoryRow[]> {
  if (!theatreIds.length) return []
  const { data: days } = await supabase
    .from('theatre_days').select('id,theatre_id,date')
    .in('theatre_id', safeIn(theatreIds))
    .eq('date', date)

  return buildHistoryRows((days ?? []) as DayRef[], theatreMap)
}

// Last 30 distinct logged dates across both theatres — wide window so
// filter-tab counts include theatres with multi-day gaps. The Recent
// strip itself only renders the most recent 7 of these.
async function loadRecentDays(
  theatreIds: string[],
  theatreMap: Record<string, string>,
): Promise<HistoryRow[]> {
  if (!theatreIds.length) return []
  const { data: days } = await supabase
    .from('theatre_days').select('id,theatre_id,date')
    .in('theatre_id', safeIn(theatreIds))
    .order('date', { ascending: false })
    .range(0, 59)

  if (!days?.length) return []

  const distinctDates: string[] = []
  for (const d of days) {
    if (!distinctDates.includes(d.date)) distinctDates.push(d.date)
  }
  const recentDates = new Set(distinctDates.slice(0, 30))
  const filtered = (days as DayRef[]).filter(d => recentDates.has(d.date))

  return buildHistoryRows(filtered, theatreMap)
}

// ── UI helpers ──────────────────────────────────────────────────

function formatSelectedHeader(date: string) {
  const d = new Date(date + 'T00:00:00')
  return `${WEEKDAY_FULL[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

function formatRecentLabel(date: string) {
  const d = new Date(date + 'T00:00:00')
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${WEEKDAY_SHORT[d.getDay()]}`
}

function SectionHeader({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {label}
      </span>
      {right}
    </div>
  )
}

function StatusBadge({ isClosed }: { isClosed: boolean }) {
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700,
      whiteSpace: 'nowrap',
      background: isClosed ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
      color: isClosed ? 'var(--green)' : 'var(--accent)',
      border: `1px solid ${isClosed ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
    }}>
      {isClosed ? 'Closed' : 'Open'}
    </span>
  )
}

function TheatreRow({ row, onOpen }: { row: HistoryRow; onOpen: (row: HistoryRow) => void }) {
  const dot = DOT_COLORS[row.theatreName] ?? 'var(--accent)'
  return (
    <button
      onClick={() => onOpen(row)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
        padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--card-border)',
        borderRadius: 12, marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 9, background: dot, flexShrink: 0, boxShadow: `0 0 8px ${dot}66` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{row.theatreName}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>
          {row.showCount} {row.showCount === 1 ? 'show' : 'shows'}
          {row.isClosed && row.bCash !== null ? ` · B.Cash ${rupee(row.bCash)}` : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>
          {rupee(row.totalSales)}
        </div>
        <div style={{ marginTop: 4 }}>
          <StatusBadge isClosed={row.isClosed} />
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  )
}

function RowSkeleton() {
  return (
    <div style={{
      height: 64, background: 'var(--surface)', border: '1px solid var(--card-border)',
      borderRadius: 12, marginBottom: 8, opacity: 0.5,
    }} />
  )
}

// ── Calendar ────────────────────────────────────────────────────

function CalendarCard({
  viewMonth, onNav, monthStatus, selectedDate, onSelect, todayIST,
}: {
  viewMonth: { year: number; month: number }
  onNav: (dir: -1 | 1) => void
  monthStatus: Record<string, 'open' | 'closed'>
  selectedDate: string | null
  onSelect: (date: string) => void
  todayIST: string
}) {
  const { year, month } = viewMonth
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = (d: number) => `${year}-${pad(month + 1)}-${pad(d)}`

  const firstWeekday = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  const [todayY, todayM] = todayIST.split('-').map(Number)
  const canGoNext = year < todayY || (year === todayY && month < todayM - 1)

  const navBtnStyle: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 9, background: 'var(--bg)',
    border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer',
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--card-border)',
      borderRadius: 'var(--r-card)', padding: '14px 14px 12px',
    }}>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={() => onNav(-1)} style={navBtnStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)' }}>{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => canGoNext && onNav(1)} style={{ ...navBtnStyle, opacity: canGoNext ? 1 : 0.3, cursor: canGoNext ? 'pointer' : 'default' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>

      {/* Weekday header row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {WEEKDAY_HEADERS.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', padding: '2px 0' }}>{w}</div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridAutoRows: 32, gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />
          const ds = dateStr(d)
          const status = monthStatus[ds]
          const isToday = ds === todayIST
          const isSelected = ds === selectedDate
          const isFuture = ds > todayIST
          const tappable = !isFuture

          let dotColor = 'transparent'
          if (status === 'open') dotColor = isSelected ? 'var(--accent-ink)' : 'var(--accent)'
          else if (status === 'closed') dotColor = isSelected ? 'rgba(26,18,6,.55)' : 'var(--green)'

          return (
            <button
              key={i}
              onClick={() => tappable && onSelect(ds)}
              style={{
                border: 'none', borderRadius: 8, position: 'relative',
                cursor: tappable ? 'pointer' : 'default',
                background: isSelected ? 'var(--accent)' : 'transparent',
                boxShadow: isToday && !isSelected ? 'inset 0 0 0 1.5px var(--accent)' : 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, fontFamily: 'var(--mono)', transition: 'background .15s',
              }}
            >
              <span style={{
                fontSize: 12, fontWeight: isToday || isSelected ? 700 : 500,
                color: isSelected ? 'var(--accent-ink)' : isFuture ? 'rgba(107,114,128,.45)' : 'var(--text)',
              }}>
                {d}
              </span>
              <span style={{ width: 4, height: 4, borderRadius: 9, background: dotColor }} />
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--card-border)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 9, background: 'var(--accent)' }} />Open
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 9, background: 'var(--green)' }} />Closed
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
          <span style={{ width: 9, height: 9, borderRadius: 9, boxShadow: 'inset 0 0 0 1.5px var(--accent)' }} />Today
        </span>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────

export default function HistoryPage() {
  const navigate = useNavigate()
  const { theatres } = useTheatres()
  const todayIST = useMemo(() => getTodayIST(), [])

  const [filter, setFilter] = useState<string>('all')
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [monthStatus, setMonthStatus] = useState<Record<string, 'open' | 'closed'>>({})
  const [monthLoading, setMonthLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<HistoryRow[]>([])
  const [selectedLoading, setSelectedLoading] = useState(false)
  const [recentRows, setRecentRows] = useState<HistoryRow[]>([])
  const [recentLoading, setRecentLoading] = useState(true)

  const theatreMap = useMemo(
    () => Object.fromEntries(theatres.map(t => [t.id, t.name])),
    [theatres],
  )
  const allTheatreIds = useMemo(() => theatres.map(t => t.id), [theatres])
  const theatreIdsKey = allTheatreIds.join(',')
  const filterTheatreIds = filter === 'all' ? allTheatreIds : [filter]

  // Recent strip — loads once theatres are known
  useEffect(() => {
    if (!allTheatreIds.length) return
    let cancelled = false
    setRecentLoading(true)
    loadRecentDays(allTheatreIds, theatreMap).then(rows => {
      if (!cancelled) { setRecentRows(rows); setRecentLoading(false) }
    })
    return () => { cancelled = true }
  }, [theatreIdsKey])

  // Calendar dots — reload on month or filter change
  useEffect(() => {
    if (!allTheatreIds.length) return
    let cancelled = false
    setMonthLoading(true)
    loadMonthStatus(filterTheatreIds, viewMonth.year, viewMonth.month).then(status => {
      if (!cancelled) { setMonthStatus(status); setMonthLoading(false) }
    })
    return () => { cancelled = true }
  }, [theatreIdsKey, filter, viewMonth.year, viewMonth.month])

  // Selected day panel — loads on demand
  useEffect(() => {
    if (!selectedDate) { setSelectedRows([]); return }
    if (!allTheatreIds.length) return
    let cancelled = false
    setSelectedLoading(true)
    loadSelectedDay(filterTheatreIds, theatreMap, selectedDate).then(rows => {
      if (!cancelled) { setSelectedRows(rows); setSelectedLoading(false) }
    })
    return () => { cancelled = true }
  }, [selectedDate, theatreIdsKey, filter])

  // Reset selection when the filter changes
  useEffect(() => {
    setSelectedDate(null)
  }, [filter])

  function handleNav(dir: -1 | 1) {
    setViewMonth(v => {
      const d = new Date(v.year, v.month + dir, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function openDay(row: HistoryRow) {
    navigate(`/theatre/${row.theatreId}/day/${row.date}/close${row.isClosed ? '?readOnly=true' : ''}`)
  }

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: recentRows.length }
    for (const t of theatres) counts[t.id] = recentRows.filter(r => r.theatreId === t.id).length
    return counts
  }, [recentRows, theatres])

  const recentGroups = useMemo(() => {
    const map = new Map<string, HistoryRow[]>()
    for (const r of recentRows) {
      if (filter !== 'all' && r.theatreId !== filter) continue
      if (!map.has(r.date)) map.set(r.date, [])
      map.get(r.date)!.push(r)
    }
    return Array.from(map.entries())
  }, [recentRows, filter])

  const subtitle = filter === 'all' ? 'Both theatres' : (theatreMap[filter] ?? '')

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)',
        borderBottom: '1px solid var(--card-border)',
      }}>
        <div style={{ height: 60, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: 'var(--surface)', border: '1px solid var(--card-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>History</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{subtitle}</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 14px', overflowX: 'auto' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 650,
              whiteSpace: 'nowrap', fontFamily: 'inherit', cursor: 'pointer',
              background: filter === 'all' ? 'var(--accent)' : 'transparent',
              color: filter === 'all' ? 'var(--accent-ink)' : 'var(--muted)',
              border: `1px solid ${filter === 'all' ? 'var(--accent)' : 'var(--card-border)'}`,
            }}
          >
            All <span style={{ fontFamily: 'var(--mono)', opacity: 0.7 }}>{filterCounts.all ?? 0}</span>
          </button>
          {theatres.map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              style={{
                padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 650,
                whiteSpace: 'nowrap', fontFamily: 'inherit', cursor: 'pointer',
                background: filter === t.id ? 'var(--accent)' : 'transparent',
                color: filter === t.id ? 'var(--accent-ink)' : 'var(--muted)',
                border: `1px solid ${filter === t.id ? 'var(--accent)' : 'var(--card-border)'}`,
              }}
            >
              {t.name} <span style={{ fontFamily: 'var(--mono)', opacity: 0.7 }}>{filterCounts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <CalendarCard
          viewMonth={viewMonth}
          onNav={handleNav}
          monthStatus={monthStatus}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          todayIST={todayIST}
        />
        {monthLoading && (
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: -10 }}>Loading month…</div>
        )}

        {/* Selected day panel */}
        {selectedDate && (
          <div>
            <SectionHeader
              label={`Day · ${formatSelectedHeader(selectedDate)}`}
              right={!selectedLoading && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)' }}>
                  {selectedRows.reduce((s, r) => s + r.showCount, 0)} shows · {rupee(selectedRows.reduce((s, r) => s + r.totalSales, 0))}
                </span>
              )}
            />
            {selectedLoading ? (
              <>
                <RowSkeleton />
                <RowSkeleton />
              </>
            ) : selectedRows.length ? (
              selectedRows.map(row => <TheatreRow key={row.dayId} row={row} onOpen={openDay} />)
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13.5, border: '1px dashed var(--card-border)', borderRadius: 14 }}>
                No shows logged for this date
              </div>
            )}
          </div>
        )}

        {/* Recent strip */}
        <div>
          <SectionHeader label="Recent" />
          {recentLoading ? (
            <>
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </>
          ) : recentGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13.5, border: '1px dashed var(--card-border)', borderRadius: 14 }}>
              No history yet. Start logging shows to see data here.
            </div>
          ) : (
            recentGroups.slice(0, 7).map(([date, rows]) => (
              <div key={date} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                  {formatRecentLabel(date)}
                </div>
                {rows.map(row => <TheatreRow key={row.dayId} row={row} onOpen={openDay} />)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
