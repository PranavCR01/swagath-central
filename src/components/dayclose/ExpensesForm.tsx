import { NumberInput, SectionHeader } from './DayCloseShared'
import type { ExpState } from './types'

export default function ExpensesForm({
  exp, othersDesc, readOnly, onExpChange, onOthersDescChange,
}: {
  exp: ExpState
  othersDesc: string
  readOnly: boolean
  onExpChange: (key: keyof ExpState, val: string) => void
  onOthersDescChange: (v: string) => void
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
        {/* Others row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
          <span style={{ fontSize: 13, color: 'var(--text)', flexShrink: 0, width: 48 }}>Others</span>
          <input
            value={othersDesc}
            onChange={e => onOthersDescChange(e.target.value)}
            placeholder="Description"
            disabled={readOnly}
            style={{
              flex: 1, height: 38, padding: '0 10px', boxSizing: 'border-box',
              background: 'var(--input-bg)', border: '1.5px solid var(--input-border)',
              borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none',
              fontFamily: 'inherit', opacity: readOnly ? 0.6 : 1,
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>₹</span>
          <NumberInput value={exp.othersAmount} onChange={v => onExpChange('othersAmount', v)} disabled={readOnly} width={72} />
        </div>
      </div>
    </>
  )
}
