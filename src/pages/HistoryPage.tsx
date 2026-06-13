import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const PAGE = 30

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

export default function HistoryPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    loadHistory(PAGE, true)
  }, [])

  async function loadHistory(lim: number, initial: boolean) {
    if (initial) setLoading(true); else setLoadingMore(true)

    // Get all theatres for this user
    const { data: theatres } = await supabase
      .from('theatre_theatres').select('id,name')
    if (!theatres?.length) { setLoading(false); setLoadingMore(false); return }

    const theatreIds = theatres.map(t => t.id)
    const theatreMap = Object.fromEntries(theatres.map(t => [t.id, t.name]))

    // Fetch days across all theatres, newest first
    const { data: days } = await supabase
      .from('theatre_days').select('id,theatre_id,date')
      .in('theatre_id', theatreIds)
      .order('date', { ascending: false })
      .range(0, lim - 1)

    if (!days?.length) {
      setRows([]); setHasMore(false)
      setLoading(false); setLoadingMore(false)
      return
    }

    const dayIds = days.map(d => d.id)

    // Batch: shows for these days
    const { data: showsData } = await supabase
      .from('theatre_shows').select('id,day_id')
      .in('day_id', dayIds)

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
        supabase.from('theatre_main_counter').select('show_id,upi_amount,cash_amount').in('show_id', showIds),
        supabase.from('theatre_popcorn').select('show_id,upi_amount,cash_amount').in('show_id', showIds),
        supabase.from('theatre_cool_drinks').select('show_id,upi_amount,cash_amount').in('show_id', showIds),
        supabase.from('theatre_parking').select('show_id,upi_amount,cash_amount').in('show_id', showIds),
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
      .in('day_id', dayIds)

    const closedDays = new Set<string>()
    const bCashMap: Record<string, number> = {}
    type ExpR = { day_id: string; wages: number; staff_coffee: number; water_cans: number; lab_food: number; wastage: number; others_amount: number }
    for (const e of (expData ?? []) as ExpR[]) {
      closedDays.add(e.day_id)
      const totalExp = (e.wages || 0) + (e.staff_coffee || 0) + (e.water_cans || 0) +
        (e.lab_food || 0) + (e.wastage || 0) + (e.others_amount || 0)
      bCashMap[e.day_id] = (totalsPerDay[e.day_id] ?? 0) - totalExp
    }

    const built: HistoryRow[] = days.map(d => ({
      dayId: d.id,
      theatreId: d.theatre_id,
      theatreName: theatreMap[d.theatre_id] ?? '',
      date: d.date,
      showCount: showsPerDay[d.id] ?? 0,
      totalSales: totalsPerDay[d.id] ?? 0,
      bCash: closedDays.has(d.id) ? bCashMap[d.id] : null,
      isClosed: closedDays.has(d.id),
    }))

    setRows(built)
    setHasMore(days.length >= lim)
    setLoading(false)
    setLoadingMore(false)
  }

  function handleLoadMore() {
    const next = limit + PAGE
    setLimit(next)
    loadHistory(next, false)
  }

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading history…</div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 18px', borderBottom: '1px solid var(--card-border)',
        background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/home')}
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
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Both theatres · newest first</div>
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
            No history yet. Start logging shows to see data here.
          </div>
        ) : rows.map(row => (
          <button
            key={row.dayId}
            onClick={() => navigate(`/theatre/${row.theatreId}/day/${row.date}/close?readOnly=true`)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'var(--surface)', borderRadius: 'var(--r-card)',
              border: '1px solid var(--card-border)', padding: '14px 16px',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'border-color .15s',
            }}
          >
            {/* Row top */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {formatDate(row.date)}
                </span>
                <span style={{
                  padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: 'var(--purple-chip)', color: 'var(--purple-text)',
                  border: '1px solid var(--purple-border)', whiteSpace: 'nowrap',
                }}>
                  {row.theatreName}
                </span>
              </div>
              {/* Status badge */}
              <span style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                whiteSpace: 'nowrap', flexShrink: 0,
                background: row.isClosed ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                color: row.isClosed ? 'var(--green)' : 'var(--accent)',
                border: `1px solid ${row.isClosed ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
              }}>
                {row.isClosed ? 'Closed ✓' : 'Open'}
              </span>
            </div>

            {/* Row bottom */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {row.showCount} {row.showCount === 1 ? 'show' : 'shows'}
              </span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Sales</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>
                    ₹{inrFmt.format(row.totalSales)}
                  </div>
                </div>
                {row.isClosed && row.bCash !== null && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>B.Cash</div>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700,
                      color: row.bCash > 0 ? 'var(--green)' : row.bCash < 0 ? 'var(--red)' : 'var(--accent)',
                    }}>
                      ₹{inrFmt.format(row.bCash)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}

        {/* Load more */}
        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              width: '100%', height: 46, marginTop: 4,
              background: 'transparent',
              border: '1.5px solid var(--card-border)',
              borderRadius: 'var(--r-btn)', color: 'var(--muted)',
              fontSize: 14, fontWeight: 600, cursor: loadingMore ? 'default' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  )
}
