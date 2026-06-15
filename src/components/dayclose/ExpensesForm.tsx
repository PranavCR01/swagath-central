import { NumberInput, SectionHeader } from './DayCloseShared'
import type { ExpState } from './types'

export default function ExpensesForm({
  exp, readOnly, onExpChange,
}: {
  exp: ExpState
  readOnly: boolean
  onExpChange: (key: keyof ExpState, val: string) => void
}) {
  return (
    <>
      <SectionHeader label="Expenses" />
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-card)',
        border: '1px solid var(--card-border)', marginBottom: 20, padding: '14px 14px 12px',
      }}>
        {([
          ['Wages', exp.wages, 'wages'],
          ['Staff Coffee', exp.staffCoffee, 'staffCoffee'],
          ['Water Cans', exp.waterCans, 'waterCans'],
          ['Lab Food', exp.labFood, 'labFood'],
          ['Wastage', exp.wastage, 'wastage'],
        ] as const).map(([label, val, key]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>₹</span>
              <NumberInput value={val} onChange={v => onExpChange(key, v)} disabled={readOnly} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
