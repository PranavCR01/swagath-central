import { Check, AlertTriangle } from 'lucide-react'
import { rupee } from '@/components/charts/LineChart'
import type { ItemRev } from '@/lib/aiSummary'
import { Card, TREND } from './shared'

export default function ItemCard({ kind, item }: { kind: 'top' | 'under'; item: ItemRev & { suggestion?: string } }) {
  const isTop = kind === 'top'
  const tm = TREND[item.trend]
  return (
    <Card style={{ padding: 16, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isTop ? 'color-mix(in srgb, var(--green) 18%, transparent)' : 'color-mix(in srgb, var(--accent) 16%, transparent)',
        }}>
          {isTop ? <Check size={13} color="var(--green)" /> : <AlertTriangle size={13} color="var(--accent)" />}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: isTop ? 'var(--green)' : 'var(--accent)' }}>
          {isTop ? 'Top performer' : 'Underperformer'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 17, fontWeight: 650, color: 'var(--text)' }}>{item.name}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: tm.c }}>{tm.ch}</span>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{item.units} units · {rupee(item.revenue)}</div>
      {isTop && (
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
          {item.name} is your strongest item — leading revenue this session.
          {item.trend === 'up' && ' Sales are trending up vs last week.'}
          {item.trend === 'flat' && ' Sales are steady vs last week.'}
        </div>
      )}
      {!isTop && item.suggestion && (
        <div style={{ fontSize: 12.5, color: 'var(--purple-text)', marginTop: 10, lineHeight: 1.45, paddingTop: 10, borderTop: '1px solid var(--card-border)' }}>
          {item.suggestion}
        </div>
      )}
    </Card>
  )
}
