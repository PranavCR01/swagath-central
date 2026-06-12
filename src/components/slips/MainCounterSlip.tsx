import SlipRow from '@/components/SlipRow'
import type { TabRows } from '@/lib/types'
import { ColHeaders, PaymentSection, TotalCard } from './SlipShared'
import { MAIN_ITEMS, tabTotal, updateRow } from './slipData'

interface MainCounterSlipProps {
  rows: TabRows
  setRows: React.Dispatch<React.SetStateAction<TabRows>>
  upi: string
  cash: string
  onUpi: (v: string) => void
  onCash: (v: string) => void
}

export default function MainCounterSlip({ rows, setRows, upi, cash, onUpi, onCash }: MainCounterSlipProps) {
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
          onObChange={v => updateRow(setRows, item.id, 'ob', v)}
          onRecChange={v => updateRow(setRows, item.id, 'rec', v)}
          onCbChange={v => updateRow(setRows, item.id, 'cb', v)}
        />
      ))}
      <TotalCard label="Main Counter Total" amount={total} />
      <PaymentSection
        upi={upi} cash={cash} total={slipTotal} slipTotal={total}
        onUpi={onUpi} onCash={onCash}
      />
      <div style={{ height: 16 }} />
    </>
  )
}
