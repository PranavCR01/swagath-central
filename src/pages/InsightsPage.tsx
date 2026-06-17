import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Film, AlertTriangle, Check } from 'lucide-react'
import { useTheatres } from '@/hooks/useTheatres'
import { LineChart, rupee, type LineChartSeries } from '@/components/charts/LineChart'
import { HBarChart } from '@/components/charts/HBarChart'
import {
  fetchDailyRevenue, fetchDailyProfit, fetchShowPerformance, fetchTopItems,
  fetchParkingGapTrend, fetchCateringSuggestions,
  type DailyRevenuePoint, type DailyProfitPoint, type ShowPerformancePoint, type TopItem,
  type ParkingGapPoint, type CateringSuggestions,
} from '@/lib/insightsQueries'

const RANGES = [
  { id: 'week', label: 'This Week', days: 7 },
  { id: 'month', label: 'This Month', days: 30 },
  { id: 'last30', label: 'Last 30 Days', days: 30 },
] as const

const SERIES_COLORS = ['#f59e0b', '#a78bfa']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmtDateLabel(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  return days <= 7 ? DOW[d.getDay()] : String(d.getDate())
}

function useIsWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 768)
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return wide
}

// ── shared bits ────────────────────────────────────────────────────────
function InsightCard({ title, sub, action, children }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 'var(--r-card)', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 650, color: 'var(--text)', letterSpacing: '-.01em' }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '34px 16px', textAlign: 'center' }}>
      <Film size={42} color="var(--muted)" strokeWidth={1.3} style={{ opacity: 0.4 }} />
      <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 12, maxWidth: 200 }}>Not enough data yet — keep logging shows</div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--purple-text)',
      background: 'var(--purple-chip)', padding: '6px 11px', borderRadius: 999, fontWeight: 600,
    }}>
      <Film size={13} color="var(--purple-text)" />{children}
    </span>
  )
}

function QtyStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const step = value >= 50 ? 5 : 1
  const btnStyle: React.CSSProperties = {
    width: 36, height: 44, flexShrink: 0, border: '1.5px solid var(--input-border)', background: 'var(--input-bg)',
    color: 'var(--accent)', borderRadius: 10, fontSize: 20, fontWeight: 600, lineHeight: 1, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button style={btnStyle} onClick={() => onChange(Math.max(0, value - step))}>−</button>
      <input
        inputMode="numeric"
        value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0))}
        onFocus={e => e.target.select()}
        style={{
          width: 48, height: 44, textAlign: 'center', boxSizing: 'border-box', background: 'var(--input-bg)',
          border: '1.5px solid var(--accent)', borderRadius: 10, color: 'var(--accent)', fontFamily: 'var(--mono)',
          fontSize: 15, fontWeight: 600, outline: 'none',
        }}
      />
      <button style={btnStyle} onClick={() => onChange(value + step)}>+</button>
    </div>
  )
}

const TREND: Record<string, { ch: string; c: string }> = {
  up: { ch: '↑', c: 'var(--green)' },
  down: { ch: '↓', c: 'var(--red)' },
  flat: { ch: '→', c: 'var(--muted)' },
}

// ── catering suggestions ─────────────────────────────────────────────
function CateringSection({ catering, theatreName }: { catering: CateringSuggestions | null; theatreName: string }) {
  const [editing, setEditing] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [qty, setQty] = useState<Record<string, number>>({})

  useEffect(() => {
    if (catering) setQty(Object.fromEntries(catering.items.map(it => [it.name, it.qty])))
    setEditing(false)
    setConfirmed(false)
  }, [catering])

  if (!catering || catering.items.length === 0) {
    return <InsightCard title="Catering Suggestions" sub="For tomorrow"><EmptyState /></InsightCard>
  }

  const primaryBtn: React.CSSProperties = {
    flex: 1, height: 44, border: 'none', borderRadius: 'var(--r-btn)', background: 'var(--accent)',
    color: 'var(--accent-ink)', fontFamily: 'inherit', fontSize: 14, fontWeight: 650, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }
  const ghostBtn: React.CSSProperties = {
    height: 44, padding: '0 18px', border: '1.5px solid var(--accent)', borderRadius: 'var(--r-btn)',
    background: 'transparent', color: 'var(--accent)', fontFamily: 'inherit', fontSize: 14, fontWeight: 650, cursor: 'pointer',
  }

  return (
    <InsightCard title="Catering Suggestions" sub="For tomorrow" action={<Chip>{theatreName}</Chip>}>
      {(catering.movie || catering.occupancy != null) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--purple-chip)', borderRadius: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--text)' }}>{catering.movie ?? '—'}</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600, color: 'var(--accent)', textShadow: '0 0 18px var(--accent-glow)' }}>
              {catering.occupancy != null ? `${catering.occupancy}%` : '—'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Exp. occupancy</div>
          </div>
        </div>
      )}

      <div>
        {catering.items.map((it, i) => {
          const ta = TREND[it.trend]
          const v = qty[it.name] ?? it.qty
          return (
            <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: editing ? '7px 4px' : '11px 4px', borderTop: i ? '1px solid var(--card-border)' : 'none' }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{it.name}</span>
              {editing ? (
                <QtyStepper value={v} onChange={nv => { setQty(q => ({ ...q, [it.name]: nv })); setConfirmed(false) }} />
              ) : (
                <>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{v}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 26 }}>units</span>
                </>
              )}
              <span style={{ fontSize: 16, fontWeight: 700, color: ta.c, width: 16, textAlign: 'center' }}>{ta.ch}</span>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', margin: '8px 0 14px', opacity: 0.75 }}>
        {editing ? 'Tap − / + to adjust tomorrow’s stock' : `Based on ${catering.basedOnCount} similar show${catering.basedOnCount === 1 ? '' : 's'}`}
      </div>

      {confirmed && !editing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 12, background: 'color-mix(in srgb, var(--green) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)', borderRadius: 12 }}>
          <Check size={16} color="var(--green)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Stock plan confirmed for tomorrow</span>
        </div>
      )}

      {editing ? (
        <button style={primaryBtn} onClick={() => setEditing(false)}><Check size={16} />Save quantities</button>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={primaryBtn} onClick={() => setConfirmed(true)}><Check size={16} />{confirmed ? 'Confirmed' : 'Looks good'}</button>
          <button style={ghostBtn} onClick={() => { setEditing(true); setConfirmed(false) }}>Adjust</button>
        </div>
      )}
    </InsightCard>
  )
}

// ── parking gap trend ────────────────────────────────────────────────
function ParkingGapSection({ data, theatreName, loading }: { data: ParkingGapPoint[]; theatreName: string; loading: boolean }) {
  const hasData = data.some(p => p.gap !== 0)
  if (loading || data.length < 3 || !hasData) {
    return <InsightCard title="Parking Gap Trend" sub={`Last 30 days · ${theatreName}`}><EmptyState /></InsightCard>
  }

  const n = data.length, k = Math.floor(n / 3)
  const first = data.slice(0, k).reduce((s, p) => s + p.gap, 0) / Math.max(1, k)
  const last = data.slice(n - k).reduce((s, p) => s + p.gap, 0) / Math.max(1, k)
  const trendingUp = first >= 0 && last > first * 1.25
  const avg = Math.round(data.reduce((s, p) => s + p.gap, 0) / n / 10) * 10

  return (
    <InsightCard title="Parking Gap Trend" sub={`Last 30 days · ${theatreName}`}>
      <LineChart
        series={[{ id: 'gap', name: 'Daily gap', color: trendingUp ? '#ef4444' : '#22c55e', points: data.map(p => ({ label: fmtDateLabel(p.date, 30), v: p.gap })) }]}
        height={170} yTicks={3}
      />
      <div style={{ marginTop: 14 }}>
        {trendingUp ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 34%, transparent)', borderRadius: 13 }}>
            <AlertTriangle size={20} color="var(--accent)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--accent)' }}>Parking gaps increasing</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Avg ₹{avg}/day · review with staff</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'color-mix(in srgb, var(--green) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)', borderRadius: 999 }}>
            <Check size={16} color="var(--green)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Gaps stable · avg ₹{avg}/day</span>
          </div>
        )}
      </div>
    </InsightCard>
  )
}

// ── main page ─────────────────────────────────────────────────────────
export default function InsightsPage() {
  const navigate = useNavigate()
  const { theatres } = useTheatres()
  const [theatreSel, setTheatreSel] = useState<string>('both')
  const [rangeId, setRangeId] = useState<typeof RANGES[number]['id']>('week')
  const range = RANGES.find(r => r.id === rangeId)!
  const isWide = useIsWide()

  const [revenue, setRevenue] = useState<DailyRevenuePoint[]>([])
  const [profitData, setProfitData] = useState<DailyProfitPoint[]>([])
  const [perf, setPerf] = useState<ShowPerformancePoint[]>([])
  const [tops, setTops] = useState<TopItem[]>([])
  const [parkingGap, setParkingGap] = useState<ParkingGapPoint[]>([])
  const [catering, setCatering] = useState<CateringSuggestions | null>(null)
  const [loading, setLoading] = useState(true)
  const [revenueLoading, setRevenueLoading] = useState(true)
  const [profitLoading, setProfitLoading] = useState(true)

  const singleId = theatreSel === 'both' ? theatres[0]?.id : theatreSel
  const singleName = theatreSel === 'both' ? (theatres[0]?.name ?? '') : (theatres.find(t => t.id === theatreSel)?.name ?? '')

  useEffect(() => {
    if (theatres.length === 0) return
    let cancelled = false
    setLoading(true)
    setRevenueLoading(true)
    setProfitLoading(true)
    setRevenue([])       // clear stale data immediately so revSeries never mixes old/new theatreSel
    setProfitData([])
    setParkingGap([])
    const target = theatreSel === 'both' ? 'both' : theatreSel
    Promise.all([
      fetchDailyRevenue(target, range.days),
      fetchDailyProfit(target, range.days),
      fetchShowPerformance(target, range.days),
      fetchTopItems(target, range.days),
      singleId ? fetchParkingGapTrend(singleId, 30) : Promise.resolve([]),
      singleId ? fetchCateringSuggestions(singleId) : Promise.resolve(null),
    ]).then(([rev, prof, perfData, topsData, gap, cater]) => {
      if (cancelled) return
      setRevenue(rev)
      setProfitData(prof)
      setPerf(perfData)
      setTops(topsData)
      setParkingGap(gap)
      setCatering(cater)
      setLoading(false)
      setRevenueLoading(false)
      setProfitLoading(false)
    })
    return () => { cancelled = true }
  }, [theatreSel, range.days, singleId, theatres.length])

  const revSeries: LineChartSeries[] = useMemo(() => {
    if (theatreSel === 'both') {
      const raw = theatres.map((t, i) => ({
        id: t.id, name: t.name, color: SERIES_COLORS[i % SERIES_COLORS.length],
        points: revenue.filter(p => p.theatreId === t.id).map(p => ({ label: fmtDateLabel(p.date, range.days), v: p.revenue, date: p.date })),
      })).filter(s => s.points.length > 0)

      if (raw.length < 2) return raw.map(s => ({ ...s, points: s.points.map(({ label, v }) => ({ label, v })) }))

      // Align both series to dates present in both, so they share the same x-axis.
      const dates0 = new Set(raw[0].points.map(p => p.date))
      const dates1 = new Set(raw[1].points.map(p => p.date))
      const common = [...dates0].filter(d => dates1.has(d))

      return raw.map(s => ({
        ...s,
        points: s.points.filter(p => common.includes(p.date)).map(({ label, v }) => ({ label, v })),
      }))
    }
    return [{
      id: theatreSel, name: singleName, color: '#f59e0b',
      points: revenue.map(p => ({ label: fmtDateLabel(p.date, range.days), v: p.revenue })),
    }]
  }, [revenue, theatreSel, theatres, range.days, singleName])

  const totalRev = useMemo(() => revSeries.reduce((s, ser) => s + ser.points.reduce((a, p) => a + p.v, 0), 0), [revSeries])
  const daysWithData = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const p of revenue) byDate.set(p.date, (byDate.get(p.date) ?? 0) + p.revenue)
    return [...byDate.values()].filter(v => v > 0).length
  }, [revenue])

  const profitSeries: LineChartSeries[] = useMemo(() => {
    if (theatreSel === 'both') {
      const raw = theatres.map((t, i) => ({
        id: t.id, name: t.name, color: SERIES_COLORS[i % SERIES_COLORS.length],
        points: profitData.filter(p => p.theatreId === t.id).map(p => ({ label: fmtDateLabel(p.date, range.days), v: p.profit, date: p.date })),
      })).filter(s => s.points.length > 0)

      if (raw.length < 2) return raw.map(s => ({ ...s, points: s.points.map(({ label, v }) => ({ label, v })) }))

      const dates0 = new Set(raw[0].points.map(p => p.date))
      const dates1 = new Set(raw[1].points.map(p => p.date))
      const common = [...dates0].filter(d => dates1.has(d))

      return raw.map(s => ({
        ...s,
        points: s.points.filter(p => common.includes(p.date)).map(({ label, v }) => ({ label, v })),
      }))
    }
    return [{
      id: theatreSel, name: singleName, color: '#f59e0b',
      points: profitData.map(p => ({ label: fmtDateLabel(p.date, range.days), v: p.profit })),
    }]
  }, [profitData, theatreSel, theatres, range.days, singleName])

  const totalProfit = useMemo(() => profitSeries.reduce((s, ser) => s + ser.points.reduce((a, p) => a + p.v, 0), 0), [profitSeries])

  if (loading && theatres.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const cardStyle: React.CSSProperties = isWide ? {} : {}

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: '1px solid var(--card-border)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={19} color="var(--text)" />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Insights</span>
        </div>
        <Chip>Live</Chip>
      </div>

      {/* Range pills */}
      <div style={{ flexShrink: 0, padding: '12px 18px', borderBottom: '1px solid var(--card-border)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {RANGES.map(r => {
            const on = r.id === rangeId
            return (
              <button key={r.id} onClick={() => setRangeId(r.id)} style={{
                flex: 1, height: 34, border: `1px solid ${on ? 'transparent' : 'var(--card-border)'}`, cursor: 'pointer', borderRadius: 999,
                background: on ? 'var(--purple-chip)' : 'transparent', color: on ? 'var(--purple-text)' : 'var(--muted)',
                fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, transition: 'all .2s',
              }}>{r.label}</button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {/* Theatre toggle */}
        <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface)', border: '1px solid var(--card-border)', borderRadius: 999 }}>
          {[...theatres.map(t => ({ id: t.id, label: t.name })), { id: 'both', label: 'Both' }].map(o => {
            const on = o.id === theatreSel
            return (
              <button key={o.id} onClick={() => setTheatreSel(o.id)} style={{
                flex: 1, height: 38, border: 'none', cursor: 'pointer', borderRadius: 999,
                background: on ? 'var(--accent)' : 'transparent', color: on ? 'var(--accent-ink)' : 'var(--muted)',
                fontFamily: 'inherit', fontSize: 13.5, fontWeight: on ? 650 : 500,
                transition: 'background .2s, color .2s', boxShadow: on ? '0 4px 14px -4px var(--accent-glow)' : 'none',
              }}>{o.label}</button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isWide ? '1fr 1fr' : '1fr', gap: 16, marginTop: 16 }}>
          {/* Revenue overview */}
          <div style={{ gridColumn: isWide ? '1 / -1' : 'auto' }}>
            <InsightCard
              title="Revenue Overview"
              sub={`Last ${range.days} days`}
              action={<div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--accent)', textShadow: '0 0 16px var(--accent-glow)' }}>{rupee(totalRev)}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Total</div>
              </div>}
            >
              {revenueLoading || daysWithData < 3 ? <EmptyState /> : (
                <>
                  <LineChart series={revSeries} height={216} />
                  {theatreSel === 'both' && (
                    <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 14 }}>
                      {revSeries.map(s => (
                        <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--muted)' }}>
                          <span style={{ width: 16, height: 3, borderRadius: 2, background: s.color }} />{s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </InsightCard>
          </div>

          {/* Profit overview */}
          <div style={{ gridColumn: isWide ? '1 / -1' : 'auto' }}>
            <InsightCard
              title="Profit Overview"
              sub={`Last ${range.days} days`}
              action={<div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--accent)', textShadow: '0 0 16px var(--accent-glow)' }}>{rupee(totalProfit)}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Total</div>
              </div>}
            >
              {profitLoading || daysWithData < 3 ? <EmptyState /> : (
                <>
                  <LineChart series={profitSeries} height={216} />
                  {theatreSel === 'both' && (
                    <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 14 }}>
                      {profitSeries.map(s => (
                        <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--muted)' }}>
                          <span style={{ width: 16, height: 3, borderRadius: 2, background: s.color }} />{s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </InsightCard>
          </div>

          {/* Show performance */}
          <div style={cardStyle}>
            <InsightCard title="Show Performance" sub="Avg revenue by slot">
              {perf.length < 3 ? <EmptyState /> : (
                <HBarChart data={perf.map(p => ({ label: p.slot, sub: `${p.avgOccupancy}% occ`, v: p.avgRevenue }))} animateKey={theatreSel} />
              )}
            </InsightCard>
          </div>

          {/* Top items */}
          <div style={cardStyle}>
            <InsightCard title="Top Items" sub={`By revenue · last ${range.days} days`}>
              {tops.length < 3 ? <EmptyState /> : (
                <HBarChart
                  data={tops.map(t => ({
                    label: t.name,
                    sub: t.profit != null ? `+${rupee(t.profit)} profit (${t.marginPct}%)` : undefined,
                    v: t.revenue,
                  }))}
                  animateKey={theatreSel}
                />
              )}
            </InsightCard>
          </div>

          {/* Catering */}
          <div style={{ gridColumn: isWide ? '1 / -1' : 'auto' }}>
            <CateringSection catering={catering} theatreName={singleName} />
          </div>

          {/* Parking gap */}
          <div style={{ gridColumn: isWide ? '1 / -1' : 'auto' }}>
            <ParkingGapSection data={parkingGap} theatreName={singleName} loading={revenueLoading} />
          </div>
        </div>
        <div style={{ height: 6 }} />
      </div>
    </div>
  )
}
