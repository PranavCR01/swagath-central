import SlipRow, { MiscDrinksRow } from '@/components/SlipRow'
import type { TabRows } from '@/lib/types'
import { ColHeaders, PaymentSection, TotalCard } from './SlipShared'
import { MAIN_ITEMS, tabTotal, updateRow } from './slipData'
import { PRICES } from '@/lib/prices'

interface MainCounterSlipProps {
  rows: TabRows
  setRows: React.Dispatch<React.SetStateAction<TabRows>>
  upi: string
  cash: string
  onUpi: (v: string) => void
  onCash: (v: string) => void
  miscDrinksMc: string
  onMiscDrinksMc: (v: string) => void
  miscWaterMc: string
  onMiscWaterMc: (v: string) => void
}

export default function MainCounterSlip({
  rows, setRows, upi, cash, onUpi, onCash,
  miscDrinksMc, onMiscDrinksMc,
  miscWaterMc, onMiscWaterMc,
}: MainCounterSlipProps) {
  const total = tabTotal(rows, MAIN_ITEMS)
  const slipTotal = (Number(upi) || 0) + (Number(cash) || 0)

  return (
    <>
      <ColHeaders />
      {MAIN_ITEMS.map(item => (
        <SlipRow
          key={item.id}
          label={item.name}
          subLabel={`₹${item.price}`}
          price={item.price}
          ob={rows[item.id]?.ob ?? ''}
          rec={rows[item.id]?.rec ?? ''}
          cb={rows[item.id]?.cb ?? ''}
          wst={rows[item.id]?.wst ?? ''}
          onObChange={v => updateRow(setRows, item.id, 'ob', v)}
          onRecChange={v => updateRow(setRows, item.id, 'rec', v)}
          onCbChange={v => updateRow(setRows, item.id, 'cb', v)}
          onWstChange={v => updateRow(setRows, item.id, 'wst', v)}
        />
      ))}
      <MiscDrinksRow label="Misc Drinks (MC)" price={PRICES.tins_mc} value={miscDrinksMc} onChange={onMiscDrinksMc} />
      <MiscDrinksRow label="Misc Water (MC)" price={PRICES.water} value={miscWaterMc} onChange={onMiscWaterMc} />
      <TotalCard label="Main Counter Total" amount={total} />
      <PaymentSection
        upi={upi} cash={cash} total={slipTotal} slipTotal={total}
        onUpi={onUpi} onCash={onCash}
      />
      <div style={{ height: 16 }} />
    </>
  )
}
