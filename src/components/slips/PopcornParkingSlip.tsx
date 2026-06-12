import { PRICES } from '@/lib/prices'
import { calcParkingExpected, calcParkingGap } from '@/lib/calculations'
import SlipRow, { LumpRow } from '@/components/SlipRow'
import type { TabRows } from '@/lib/types'
import { ColHeaders, PaymentSection, PayRow, TotalCard, SectionDivider, ParkingRow } from './SlipShared'
import { POPCORN_ITEMS, tabTotal, updateRow, rupee } from './slipData'

interface PopcornParkingSlipProps {
  pcRows: TabRows
  setPcRows: React.Dispatch<React.SetStateAction<TabRows>>
  pcBms: string
  setPcBms: (v: string) => void
  pcUpi: string
  pcCash: string
  onPcUpi: (v: string) => void
  onPcCash: (v: string) => void
  pkScooter: string
  pkAuto: string
  pkCar: string
  pkReported: string
  setPkScooter: (v: string) => void
  setPkAuto: (v: string) => void
  setPkCar: (v: string) => void
  setPkReported: (v: string) => void
}

export default function PopcornParkingSlip({
  pcRows, setPcRows, pcBms, setPcBms, pcUpi, pcCash, onPcUpi, onPcCash,
  pkScooter, pkAuto, pkCar, pkReported, setPkScooter, setPkAuto, setPkCar, setPkReported,
}: PopcornParkingSlipProps) {
  const pcTotal = tabTotal(pcRows, POPCORN_ITEMS) // BMS excluded from total
  const pcSlipTotal = (Number(pcUpi) || 0) + (Number(pcCash) || 0)

  const parkingExpected = calcParkingExpected(
    Number(pkScooter) || 0, Number(pkAuto) || 0, Number(pkCar) || 0,
  )
  const parkingGap = pkReported !== ''
    ? calcParkingGap(parkingExpected, Number(pkReported) || 0)
    : null

  return (
    <>
      <ColHeaders />
      {POPCORN_ITEMS.map(item => (
        <SlipRow
          key={item.id}
          label={item.name}
          subLabel={`₹${item.price}`}
          price={item.price}
          ob={pcRows[item.id]?.ob ?? ''}
          rec={pcRows[item.id]?.rec ?? ''}
          cb={pcRows[item.id]?.cb ?? ''}
          wst={pcRows[item.id]?.wst ?? ''}
          onObChange={v => updateRow(setPcRows, item.id, 'ob', v)}
          onRecChange={v => updateRow(setPcRows, item.id, 'rec', v)}
          onCbChange={v => updateRow(setPcRows, item.id, 'cb', v)}
          onWstChange={v => updateRow(setPcRows, item.id, 'wst', v)}
        />
      ))}
      <LumpRow label="BMS Combo" value={pcBms} onChange={setPcBms} />

      <TotalCard label="Popcorn total" amount={pcTotal} />

      <SectionDivider label="Parking" />

      <ParkingRow label="Scooter" rate={PRICES.scooter} count={pkScooter} onChange={setPkScooter} />
      <ParkingRow label="Auto"    rate={PRICES.auto}    count={pkAuto}    onChange={setPkAuto} />
      <ParkingRow label="Car"     rate={PRICES.car}     count={pkCar}     onChange={setPkCar} />

      {/* Expected + Reported */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--card-border)',
        borderRadius: 'var(--r-card)', padding: '12px 16px', margin: '10px 0 4px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
            Expected collection
          </span>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--muted)',
          }}>
            {rupee(parkingExpected)}
          </span>
        </div>
        <PayRow label="Reported" value={pkReported} onChange={setPkReported} />
      </div>

      {/* Gap indicator */}
      {parkingGap !== null && (
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          {parkingGap === 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999,
              background: 'rgba(34,197,94,0.12)', color: 'var(--green)',
              fontSize: 13, fontWeight: 600,
            }}>
              ✓ No gap
            </div>
          )}
          {parkingGap > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: 'var(--red)', fontSize: 13, fontWeight: 600,
            }}>
              ⚠ Gap: {rupee(parkingGap)} — staff short
            </div>
          )}
          {parkingGap < 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999,
              background: 'rgba(245,158,11,0.12)', color: 'var(--accent)',
              fontSize: 13, fontWeight: 600,
            }}>
              Overpaid: {rupee(Math.abs(parkingGap))}
            </div>
          )}
        </div>
      )}

      <PaymentSection
        upi={pcUpi} cash={pcCash} total={pcSlipTotal} slipTotal={pcTotal}
        onUpi={onPcUpi} onCash={onPcCash}
      />
      <div style={{ height: 16 }} />
    </>
  )
}
