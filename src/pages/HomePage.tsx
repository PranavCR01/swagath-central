import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getTodayIST } from '@/lib/utils'
import { useTheatres } from '@/hooks/useTheatres'
import TheatreCard from '@/components/TheatreCard'
import swagathMark from '@/assets/swagath-mark.png'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

interface TodaySummary {
  showCount: number
  total: number
}

export default function HomePage() {
  const navigate = useNavigate()
  const { theatres, loading } = useTheatres()
  const [summaries, setSummaries] = useState<Record<string, TodaySummary>>({})
  const today = getTodayIST()

  const displayDate = new Date(today + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  useEffect(() => {
    if (theatres.length === 0) return
    async function fetchSummaries() {
      const results: Record<string, TodaySummary> = {}
      await Promise.all(
        theatres.map(async (t) => {
          const { data: dayRow } = await supabase
            .from('theatre_days')
            .select('id')
            .eq('theatre_id', t.id)
            .eq('date', today)
            .maybeSingle()
          if (!dayRow) { results[t.id] = { showCount: 0, total: 0 }; return }
          const { data: shows } = await supabase
            .from('theatre_shows')
            .select('id')
            .eq('day_id', dayRow.id)
          results[t.id] = { showCount: shows?.length ?? 0, total: 0 }
        })
      )
      setSummaries(results)
    }
    fetchSummaries()
  }, [theatres, today])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const combinedShows = Object.values(summaries).reduce((s, v) => s + v.showCount, 0)
  const combinedRevenue = Object.values(summaries).reduce((s, v) => s + v.total, 0)

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', borderBottom: '1px solid var(--card-border)', background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={swagathMark} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Swagath Central</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/history')}
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--surface)', border: '1px solid var(--card-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--surface)', border: '1px solid var(--card-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
              <path d="M10 12H3" /><path d="M6 8l-3 4 3 4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 18, paddingBottom: 32 }}>
        {/* Greeting */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{displayDate}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginTop: 2, letterSpacing: '-.02em' }}>
            Good evening, Owner
          </div>
        </div>

        {/* Theatre cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {theatres.map((t) => (
            <TheatreCard
              key={t.id}
              name={t.name}
              showCount={summaries[t.id]?.showCount ?? 0}
              totalAmount={summaries[t.id]?.total ?? 0}
              onOpen={() => navigate(`/theatre/${t.id}/day/${today}`)}
            />
          ))}
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <SummaryStat
            label="Combined revenue"
            value={'₹' + inrFmt.format(combinedRevenue)}
            icon="coins"
          />
          <SummaryStat
            label="Shows logged today"
            value={String(combinedShows)}
            icon="reel"
          />
        </div>
      </div>
    </div>
  )
}

function SummaryStat({ label, value, icon }: { label: string; value: string; icon: 'coins' | 'reel' }) {
  const paths: Record<string, React.ReactNode> = {
    coins: <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </>,
    reel: <>
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="6.5" r="1.4" /><circle cx="12" cy="17.5" r="1.4" />
      <circle cx="6.5" cy="12" r="1.4" /><circle cx="17.5" cy="12" r="1.4" />
    </>,
  }
  return (
    <div style={{
      background: 'linear-gradient(160deg, var(--surface-2), var(--surface))',
      border: '1px solid var(--card-border)',
      borderRadius: 16, padding: 16,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[icon]}
      </svg>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 600, color: 'var(--text)', marginTop: 10 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
