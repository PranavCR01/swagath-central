import { rupee } from '@/components/charts/LineChart'
import type { DaySummaryData } from '@/lib/aiSummary'
import { Card } from './shared'

export default function SnapshotCard({ data }: { data: DaySummaryData }) {
  const total = data.shows.reduce((s, sh) => s + sh.revenue, 0)
  const best = data.shows.reduce((b, sh) => (!b || sh.revenue > b.revenue ? sh : b), null as DaySummaryData['shows'][number] | null)
  const occAvg = data.shows.length
    ? Math.round(data.shows.reduce((s, sh) => s + sh.occ, 0) / data.shows.length)
    : 0
  const vsYesterday = data.vsYesterday
  const up = (vsYesterday ?? 0) >= 0

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 11.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>Total revenue</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 36, fontWeight: 600, color: 'var(--accent)', letterSpacing: '-.01em', textShadow: '0 0 28px var(--accent-glow)' }}>{rupee(total)}</span>
        {vsYesterday != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 650, color: up ? 'var(--green)' : 'var(--red)' }}>
            {up ? '▲' : '▼'} {Math.abs(vsYesterday)}% <span style={{ color: 'var(--muted)', fontWeight: 500 }}>vs yesterday</span>
          </span>
        )}
      </div>
      {data.grossProfit > 0 && (
        <div style={{ fontSize: 13, color: 'var(--green)', marginTop: 6 }}>
          Gross profit {rupee(data.grossProfit)} · {data.profitMargin}% margin
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <div style={{ flex: 1, padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 13 }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>Best show</div>
          {best && <>
            <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--text)', marginTop: 4 }}>Show {best.n} · {best.time}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--accent)', marginTop: 2 }}>{rupee(best.revenue)}</div>
          </>}
        </div>
        <div style={{ flex: 1, padding: '12px 14px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 13 }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>Avg occupancy</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 600, color: 'var(--text)', marginTop: 4, lineHeight: 1 }}>{occAvg}%</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>across all shows</div>
        </div>
      </div>
    </Card>
  )
}
