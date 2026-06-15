import SlipRow, { MiscDrinksRow } from '@/components/SlipRow'
import type { TabRows } from '@/lib/types'
import { ColHeaders, PaymentSection, TotalCard, SectionDivider } from './SlipShared'
import { CD_ALL, tabTotal, updateRow } from './slipData'
import { PRICES } from '@/lib/prices'

interface CoolDrinksSlipProps {
  rows: TabRows
  setRows: React.Dispatch<React.SetStateAction<TabRows>>
  upi: string
  cash: string
  onUpi: (v: string) => void
  onCash: (v: string) => void
  liveUpi: string
  liveCash: string
  onLiveUpi: (v: string) => void
  onLiveCash: (v: string) => void
  miscDrinksCd: string
  onMiscDrinksCd: (v: string) => void
}

export default function CoolDrinksSlip({
  rows, setRows, upi, cash, onUpi, onCash,
  liveUpi, liveCash, onLiveUpi, onLiveCash,
  miscDrinksCd, onMiscDrinksCd,
}: CoolDrinksSlipProps) {
  const total = tabTotal(rows, CD_ALL)
  const slipTotal = (Number(upi) || 0) + (Number(cash) || 0)
  const drinksTotal = tabTotal(rows, CD_ALL.filter(i => i.section === 'drinks'))
  const liveTotal = tabTotal(rows, CD_ALL.filter(i => i.section === 'live'))
  const liveSlipTotal = (Number(liveUpi) || 0) + (Number(liveCash) || 0)

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
        />
      ))}

      <SectionDivider label="Drinks Payment" />
      <PaymentSection
        upi={upi} cash={cash} total={slipTotal} slipTotal={drinksTotal}
        onUpi={onUpi} onCash={onCash}
      />

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

      <SectionDivider label="Live Counter Payment" />
      <PaymentSection
        upi={liveUpi} cash={liveCash} total={liveSlipTotal} slipTotal={liveTotal}
        onUpi={onLiveUpi} onCash={onLiveCash}
      />

      <MiscDrinksRow label="Misc Drinks (CD)" price={PRICES.cd_tin} value={miscDrinksCd} onChange={onMiscDrinksCd} />

      <TotalCard label="Counter Total" amount={total} />
      <div style={{ height: 16 }} />
    </>
  )
}
