import { AlertTriangle, SquareParking } from 'lucide-react'
import { rupee } from '@/components/charts/LineChart'
import type { DaySummaryData } from '@/lib/aiSummary'
import { ordinal } from './shared'

export default function ParkingAlert({ parking, navigate }: { parking: NonNullable<DaySummaryData['parking']>; navigate: (path: string) => void }) {
  return (
    <div style={{
      background: 'color-mix(in srgb, var(--red) 11%, var(--surface))', border: '1px solid color-mix(in srgb, var(--red) 34%, transparent)',
      borderRadius: 'var(--r-card)', padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <AlertTriangle size={18} color="var(--red)" />
        <span style={{ fontSize: 13, fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--red)' }}>Parking alert</span>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 600, color: 'var(--red)', lineHeight: 1, textShadow: '0 0 22px color-mix(in srgb, var(--red) 40%, transparent)' }}>{rupee(parking.gap)}</div>
      <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 8, fontWeight: 500 }}>Staff short by {rupee(parking.gap)} today</div>
      {parking.trendingUp && (
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
          {parking.consecutive}{ordinal(parking.consecutive)} consecutive day with a gap — investigate
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <button onClick={() => navigate('/insights')} style={{
          height: 40, padding: '0 16px', border: '1.5px solid var(--red)', borderRadius: 'var(--r-btn)',
          background: 'transparent', color: 'var(--red)', fontFamily: 'inherit', fontSize: 13, fontWeight: 650, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}><SquareParking size={15} />View parking history</button>
      </div>
    </div>
  )
}
