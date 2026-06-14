import { SectionHeader } from './DayCloseShared'
import { inrFmt } from './types'

interface WastageItem { section: string; name: string; qty: number; cost: number }

export default function WastageTable({ wastageItems }: { wastageItems: WastageItem[] }) {
  const totalCost = wastageItems.reduce((s, i) => s + i.cost, 0)
  const sections = [...new Set(wastageItems.map(i => i.section))]

  return (
    <>
      <SectionHeader label="Wastage" />
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-card)',
        border: '1px solid var(--card-border)', marginBottom: 20, overflow: 'hidden',
      }}>
        {wastageItems.length === 0 ? (
          <div style={{ padding: '20px 12px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
            No wastage recorded
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 60px 90px',
              gap: 4, padding: '9px 12px',
              background: 'var(--surface-2)', borderBottom: '1px solid var(--card-border)',
            }}>
              {['Item', 'Qty', 'Cost Loss'].map((h, i) => (
                <div key={h} style={{
                  fontSize: 10, color: 'var(--muted)', fontWeight: 700,
                  textAlign: i >= 1 ? 'right' : 'left', textTransform: 'uppercase', letterSpacing: '.04em',
                }}>{h}</div>
              ))}
            </div>

            {sections.map(section => (
              <div key={section}>
                <div style={{
                  padding: '6px 12px', background: 'var(--surface-2)',
                  fontSize: 10, color: 'var(--muted)', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.04em',
                }}>
                  {section}
                </div>
                {wastageItems.filter(i => i.section === section).map(item => (
                  <div key={item.name} style={{
                    display: 'grid', gridTemplateColumns: '1fr 60px 90px',
                    gap: 4, padding: '9px 12px',
                    borderBottom: '1px solid var(--card-border)', alignItems: 'center',
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'right', color: 'var(--text)' }}>
                      {item.qty}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'right', color: 'var(--text)' }}>
                      ₹{inrFmt.format(item.cost)}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 60px 90px',
              gap: 4, padding: '9px 12px', background: 'var(--surface-2)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Total Cost Loss</div>
              <div />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>
                ₹{inrFmt.format(totalCost)}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
