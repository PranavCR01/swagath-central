import { PRICES } from '@/lib/prices'
import { calcParkingExpected, calcParkingGap } from '@/lib/calculations'
import SlipRow, { LumpRow } from '@/components/SlipRow'
import type { TabRows } from '@/lib/types'
import { ColHeaders, PaymentSection, TotalCard, SectionDivider, ParkingRow } from './SlipShared'
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
  pkUpi: string
  pkCash: string
  setPkScooter: (v: string) => void
  setPkAuto: (v: string) => void
  setPkCar: (v: string) => void
  onPkUpi: (v: string) => void
  onPkCash: (v: string) => void
}

export default function PopcornParkingSlip({
  pcRows, setPcRows, pcBms, setPcBms, pcUpi, pcCash, onPcUpi, onPcCash,
  pkScooter, pkAuto, pkCar, pkUpi, pkCash, setPkScooter, setPkAuto, setPkCar, onPkUpi, onPkCash,
}: PopcornParkingSlipProps) {
  const pcTotal = tabTotal(pcRows, POPCORN_ITEMS) // BMS excluded from total
  const pcSlipTotal = (Number(pcUpi) || 0) + (Number(pcCash) || 0)

  const parkingExpected = calcParkingExpected(
    Number(pkScooter) || 0, Number(pkAuto) || 0, Number(pkCar) || 0,
  )
  const pkSlipTotal = (Number(pkUpi) || 0) + (Number(pkCash) || 0)
  const parkingGap = (pkUpi !== '' || pkCash !== '')
    ? calcParkingGap(parkingExpected, pkSlipTotal)
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

      <PaymentSection
        upi={pkUpi} cash={pkCash} total={pkSlipTotal} slipTotal={parkingExpected}
        onUpi={onPkUpi} onCash={onPkCash}
      />

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
