import SlipRow, { LumpRow } from '@/components/SlipRow'
import type { TabRows } from '@/lib/types'
import { ColHeaders, PaymentSection, TotalCard, SectionDivider } from './SlipShared'
import { CD_ALL, tabTotal, updateRow } from './slipData'

interface CoolDrinksSlipProps {
  rows: TabRows
  setRows: React.Dispatch<React.SetStateAction<TabRows>>
  upi: string
  cash: string
  onUpi: (v: string) => void
  onCash: (v: string) => void
  miscDrinksCd: string
  onMiscDrinksCd: (v: string) => void
}

export default function CoolDrinksSlip({
  rows, setRows, upi, cash, onUpi, onCash,
  miscDrinksCd, onMiscDrinksCd,
}: CoolDrinksSlipProps) {
  const total = tabTotal(rows, CD_ALL)
  const slipTotal = (Number(upi) || 0) + (Number(cash) || 0)
  const firstItemId = CD_ALL[0].id
  const miscNote = (Number(miscDrinksCd) || 0) > 0 ? `−${miscDrinksCd} from OB` : undefined

  return (
    <>
      <ColHeaders />
      {CD_ALL.filter(i => i.section === 'drinks').map(item => (
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
          note={item.id === firstItemId ? miscNote : undefined}
        />
      ))}

      <SectionDivider label="Live Counter" />

      {CD_ALL.filter(i => i.section === 'live').map(item => (
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

      <LumpRow label="Misc Drinks (CD)" value={miscDrinksCd} onChange={onMiscDrinksCd} />

      <TotalCard label="Cool Drinks Total" amount={total} />
      <PaymentSection
        upi={upi} cash={cash} total={slipTotal} slipTotal={total}
        onUpi={onUpi} onCash={onCash}
      />
      <div style={{ height: 16 }} />
    </>
  )
}
