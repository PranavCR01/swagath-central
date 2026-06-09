import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PRICES } from '@/lib/prices'
import {
  calcSale, calcAmount, calcClosingStock,
  calcParkingExpected, calcParkingGap,
} from '@/lib/calculations'
import SlipRow, { LumpRow } from '@/components/SlipRow'
import type { Show, TabRows, MainCounterRow, PopcornRow, CoolDrinksRow, ParkingRow } from '@/lib/types'

// ── Item catalogues ───────────────────────────────────────────────
const MAIN_ITEMS = [
  { id: 'vegpuff',  name: 'Veg Puff',   price: PRICES.veg_puff  },
  { id: 'eggpuff',  name: 'Egg Puff',   price: PRICES.egg_puff  },
  { id: 'hcake',    name: 'Honey Cake', price: PRICES.h_cake    },
  { id: 'jambun',   name: 'Jam Bun',    price: PRICES.jam_bun   },
  { id: 'cknpuff',  name: 'C Puff',     price: PRICES.ckn_puff  },
  { id: 'bs',       name: 'BS',         price: PRICES.bs        },
  { id: 'samosa',   name: 'Samosa',     price: PRICES.samosa    },
  { id: 'tin',      name: 'Tins',       price: PRICES.tin       },
  { id: 'frooty',   name: 'Frooty',     price: PRICES.frooty    },
  { id: 'chips',    name: 'Chips',      price: PRICES.chips     },
  { id: 'frymes',   name: 'Frymes',     price: PRICES.frymes    },
  { id: 'water',    name: 'Water',      price: PRICES.water     },
  { id: 'mshake',   name: 'Milkshake',  price: PRICES.milkshake },
  { id: 'lays',     name: 'Lays',       price: PRICES.lays      },
]

const POPCORN_ITEMS = [
  { id: 'cone_s', name: 'Cone S', price: PRICES.cone_60 },
  { id: 'cone_m', name: 'Cone M', price: PRICES.cone_130 },
  { id: 'cone_l', name: 'Cone L', price: PRICES.cone_200 },
]

const CD_ALL = [
  { id: 'c_water',   name: 'Water',         price: PRICES.cd_water,     section: 'drinks' },
  { id: 'c_tin',     name: 'Tins 1',        price: PRICES.cd_tin,       section: 'drinks' },
  { id: 'c_tin2',    name: 'Tins 2',        price: PRICES.cd_tin2,      section: 'drinks' },
  { id: 'c_frooty',  name: 'Frooty',        price: PRICES.frooty_trop,  section: 'drinks' },
  { id: 'c_mshake',  name: 'Milkshake',     price: PRICES.cd_milkshake, section: 'drinks' },
  { id: 'c_fries',   name: 'French Fries',  price: PRICES.french_fries, section: 'live'   },
  { id: 'c_vbites',  name: 'Veg Bites',     price: PRICES.veg_bites,    section: 'live'   },
  { id: 'c_osam',    name: 'Onion Samosa',  price: PRICES.onion_samosa, section: 'live'   },
  { id: 'c_cpop',    name: 'Ckn Popcorn',   price: PRICES.ckn_popcorn,  section: 'live'   },
  { id: 'c_csam',    name: 'Ckn Samosa',    price: PRICES.ckn_samosa,   section: 'live'   },
  { id: 'c_cnug',    name: 'Ckn Nuggets',   price: PRICES.ckn_nuggets,  section: 'live'   },
  { id: 'c_ice1',    name: 'Ice Cream 1',   price: PRICES.ice_cream1,   section: 'live'   },
  { id: 'c_ice2',    name: 'Ice Cream 2',   price: PRICES.ice_cream2,   section: 'live'   },
  { id: 'c_ice3',    name: 'Ice Cream 3',   price: PRICES.ice_cream3,   section: 'live'   },
  { id: 'c_tcoffee', name: 'Tea / Coffee',  price: PRICES.tea_coffee,   section: 'live'   },
]

// ── item.id → DB column prefix ────────────────────────────────────
const MC_DB_KEY: Record<string, string> = {
  vegpuff: 'veg_puff',
  eggpuff: 'egg_puff',
  hcake:   'h_cake',
  jambun:  'jam_bun',
  cknpuff: 'ckn_puff',
  bs:      'bs',
  samosa:  'samosa',
  tin:     'tin',
  frooty:  'frooty',
  chips:   'chips',
  frymes:  'frymes',
  water:   'water',
  mshake:  'milkshake',
  lays:    'lays',
}
const PC_DB_KEY: Record<string, string> = {
  cone_s: 'cone_60', cone_m: 'cone_130', cone_l: 'cone_200',
}
const CD_DB_KEY: Record<string, string> = {
  c_water:   'water',
  c_tin:     'tin',
  c_tin2:    'tins2',
  c_frooty:  'frooty_trop',
  c_mshake:  'milkshake',
  c_fries:   'french_fries',
  c_vbites:  'veg_bites',
  c_osam:    'onion_samosa',
  c_cpop:    'ckn_popcorn',
  c_csam:    'ckn_samosa',
  c_cnug:    'ckn_nuggets',
  c_ice1:    'ice_cream1',
  c_ice2:    'ice_cream2',
  c_ice3:    'ice_cream3',
  c_tcoffee: 'tea_coffee',
}

const TABS = [
  { id: 'main',    label: 'Main Counter' },
  { id: 'popcorn', label: 'Popcorn' },
  { id: 'cool',    label: 'Cool Drinks' },
] as const
type TabId = typeof TABS[number]['id']

// ── Helpers ───────────────────────────────────────────────────────
const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const rupee = (n: number) => '₹' + inrFmt.format(Math.round(n))

function emptyRows(items: { id: string }[]): TabRows {
  return Object.fromEntries(items.map(i => [i.id, { ob: '', rec: '', cb: '' }]))
}

function flatToRows(
  data: Record<string, unknown>,
  items: { id: string }[],
  keyMap: Record<string, string>,
): TabRows {
  const rows = emptyRows(items)
  for (const item of items) {
    const k = keyMap[item.id]
    rows[item.id] = {
      ob:  data[`${k}_ob`]  != null ? String(data[`${k}_ob`])  : '',
      rec: data[`${k}_rec`] != null ? String(data[`${k}_rec`]) : '',
      cb:  data[`${k}_cb`]  != null ? String(data[`${k}_cb`])  : '',
    }
  }
  return rows
}

function rowsToFlat(
  rows: TabRows,
  items: { id: string }[],
  keyMap: Record<string, string>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of items) {
    const k = keyMap[item.id]
    const r = rows[item.id] ?? { ob: '', rec: '', cb: '' }
    const ob  = Number(r.ob)  || 0
    const rec = Number(r.rec) || 0
    const cb  = Number(r.cb)  || 0
    out[`${k}_ob`]   = ob
    out[`${k}_rec`]  = rec
    out[`${k}_cb`]   = cb
    out[`${k}_sale`] = calcSale(ob, rec, cb)
  }
  return out
}

function applyCarryForward(prevItems: TabRows, items: { id: string }[]): TabRows {
  const rows = emptyRows(items)
  items.forEach(item => {
    const prev = prevItems[item.id]
    if (prev) {
      const ob = Number(prev.ob) || 0
      const rec = Number(prev.rec) || 0
      const cb = Number(prev.cb) || 0
      const sale = calcSale(ob, rec, cb)
      const newOb = calcClosingStock(ob, rec, cb, sale)
      rows[item.id] = { ob: String(newOb), rec: '', cb: '' }
    }
  })
  return rows
}

function tabTotal(rows: TabRows, items: { id: string; price: number }[]): number {
  return items.reduce((sum, item) => {
    const r = rows[item.id] ?? { ob: '', rec: '', cb: '' }
    const sale = calcSale(Number(r.ob) || 0, Number(r.rec) || 0, Number(r.cb) || 0)
    return sum + calcAmount(sale, item.price)
  }, 0)
}

function updateRow(
  setter: React.Dispatch<React.SetStateAction<TabRows>>,
  id: string,
  field: 'ob' | 'rec' | 'cb',
  v: string,
) {
  setter(prev => ({ ...prev, [id]: { ...(prev[id] ?? { ob: '', rec: '', cb: '' }), [field]: v } }))
}

// ── Status helpers ────────────────────────────────────────────────
const STATUS_META = {
  complete:   { label: 'Complete',    dot: '✓', bg: 'rgba(34,197,94,0.16)',    fg: '#22c55e' },
  inprogress: { label: 'In Progress', dot: '◐', bg: 'rgba(245,158,11,0.16)',   fg: '#f59e0b' },
  pending:    { label: 'Not Started', dot: '○', bg: 'rgba(255,255,255,0.05)',  fg: 'rgba(255,255,255,0.38)' },
}

// ── Column header row ─────────────────────────────────────────────
function ColHeaders() {
  const hStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase',
    color: 'var(--muted)', flexShrink: 0,
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '6px 0 4px',
      position: 'sticky', top: 0, zIndex: 5,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--card-border)',
    }}>
      <div style={{ flex: 1, ...hStyle }}>ITEM</div>
      <div style={{ width: 52, textAlign: 'center', ...hStyle }}>OB</div>
      <div style={{ width: 52, textAlign: 'center', ...hStyle }}>REC</div>
      <div style={{ width: 52, textAlign: 'center', ...hStyle }}>CB</div>
      <div style={{ width: 36, textAlign: 'right', ...hStyle }}>SALE</div>
      <div style={{ width: 64, textAlign: 'right', ...hStyle }}>₹ AMT</div>
    </div>
  )
}

// ── Payment section (UPI + Cash + Total) ──────────────────────────
function PaymentSection({
  upi, cash, total, slipTotal,
  onUpi, onCash,
}: {
  upi: string; cash: string; total: number; slipTotal: number
  onUpi: (v: string) => void; onCash: (v: string) => void
}) {
  function handleUpi(v: string) {
    onUpi(v)
    if (slipTotal > 0) {
      const diff = slipTotal - (Number(v) || 0)
      if (diff >= 0) onCash(String(diff))
    }
  }
  function handleCash(v: string) {
    onCash(v)
    if (slipTotal > 0) {
      const diff = slipTotal - (Number(v) || 0)
      if (diff >= 0) onUpi(String(diff))
    }
  }
  return (
    <div style={{
      margin: '12px 0 4px',
      background: 'var(--surface)',
      border: '1px solid var(--card-border)',
      borderRadius: 'var(--r-card)',
      padding: '12px 16px',
    }}>
      <PayRow label="UPI" value={upi} onChange={handleUpi} />
      <PayRow label="Cash" value={cash} onChange={handleCash} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 10, marginTop: 6, borderTop: '1px solid var(--card-border)',
      }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Total</span>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent)',
        }}>
          {rupee(total)}
        </span>
      </div>
    </div>
  )
}

function PayRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [focus, setFocus] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, width: 40 }}>{label}</span>
      <input
        inputMode="numeric"
        value={value}
        placeholder="0"
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        onFocus={e => { setFocus(true); e.target.select() }}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1, marginLeft: 12, height: 40, textAlign: 'right', boxSizing: 'border-box',
          padding: '0 12px',
          background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
          border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
          borderRadius: 'var(--r-input)', color: 'var(--text)',
          fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, outline: 'none',
          boxShadow: focus ? '0 0 0 3px var(--accent-ring)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      />
    </div>
  )
}

// ── Total card ────────────────────────────────────────────────────
function TotalCard({ label, amount }: { label: string; amount: number }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: 'var(--purple-chip)',
      border: '1px solid var(--purple-border)',
      borderRadius: 'var(--r-card)',
      padding: '12px 16px',
      margin: '12px 0 4px',
    }}>
      <span style={{ fontSize: 14, color: 'var(--purple-text)', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)',
      }}>
        {rupee(amount)}
      </span>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 6px' }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
        color: 'var(--muted)', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
    </div>
  )
}

// ── Parking count row ─────────────────────────────────────────────
function ParkingRow({
  label, rate, count, onChange,
}: {
  label: string; rate: number; count: string; onChange: (v: string) => void
}) {
  const [focus, setFocus] = useState(false)
  const expected = (Number(count) || 0) * rate
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      minHeight: 52, padding: '6px 0',
      borderBottom: '1px solid var(--card-border)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>₹{rate} each</div>
      </div>
      <input
        inputMode="numeric"
        value={count}
        placeholder="0"
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        onFocus={e => { setFocus(true); e.target.select() }}
        onBlur={() => setFocus(false)}
        style={{
          width: 72, height: 44, textAlign: 'center', boxSizing: 'border-box',
          background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
          border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
          borderRadius: 'var(--r-input)', color: 'var(--text)',
          fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, outline: 'none',
          boxShadow: focus ? '0 0 0 3px var(--accent-ring)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
          flexShrink: 0,
        }}
      />
      <div style={{
        width: 72, textAlign: 'right', flexShrink: 0,
        fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
        color: expected > 0 ? 'var(--muted)' : 'var(--muted)',
      }}>
        {expected > 0 ? rupee(expected) : '—'}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function ShowPage() {
  const { theatreId, showId } = useParams<{
    theatreId: string; date: string; showId: string
  }>()
  const navigate = useNavigate()
  const cancelled = useRef(false)

  const [showMeta, setShowMeta] = useState<Show | null>(null)
  const [theatreName, setTheatreName] = useState('')
  const [loading, setLoading] = useState(true)

  const [hasMc, setHasMc] = useState(false)
  const [hasPc, setHasPc] = useState(false)
  const [hasCd, setHasCd] = useState(false)

  const [activeTab, setActiveTab] = useState<TabId>('main')
  const [obNote, setObNote] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Main counter state
  const [mcRows, setMcRows] = useState<TabRows>(emptyRows(MAIN_ITEMS))
  const [mcUpi, setMcUpi] = useState('')
  const [mcCash, setMcCash] = useState('')
  const [mcSaving, setMcSaving] = useState(false)

  // Popcorn state
  const [pcRows, setPcRows] = useState<TabRows>(emptyRows(POPCORN_ITEMS))
  const [pcBms, setPcBms] = useState('')
  const [pcUpi, setPcUpi] = useState('')
  const [pcCash, setPcCash] = useState('')

  // Parking state
  const [pkScooter, setPkScooter] = useState('')
  const [pkAuto, setPkAuto] = useState('')
  const [pkCar, setPkCar] = useState('')
  const [pkReported, setPkReported] = useState('')
  const [pcSaving, setPcSaving] = useState(false)

  // Cool drinks state
  const [cdRows, setCdRows] = useState<TabRows>(emptyRows(CD_ALL))
  const [cdUpi, setCdUpi] = useState('')
  const [cdCash, setCdCash] = useState('')
  const [cdSaving, setCdSaving] = useState(false)

  // ── Load on mount ───────────────────────────────────────────────
  useEffect(() => {
    cancelled.current = false
    if (!showId || !theatreId) return

    async function loadAll() {
      const [showRes, theatreRes, mcRes, pcRes, cdRes, pkRes] = await Promise.all([
        supabase.from('theatre_shows').select('*').eq('id', showId!).single(),
        supabase.from('theatre_theatres').select('name').eq('id', theatreId!).single(),
        supabase.from('theatre_main_counter').select('*').eq('show_id', showId!).maybeSingle(),
        supabase.from('theatre_popcorn').select('*').eq('show_id', showId!).maybeSingle(),
        supabase.from('theatre_cool_drinks').select('*').eq('show_id', showId!).maybeSingle(),
        supabase.from('theatre_parking').select('*').eq('show_id', showId!).maybeSingle(),
      ])

      if (cancelled.current) return

      if (showRes.data) setShowMeta(showRes.data as Show)
      if (theatreRes.data) setTheatreName(theatreRes.data.name)

      const mcData = mcRes.data as MainCounterRow | null
      const pcData = pcRes.data as PopcornRow | null
      const cdData = cdRes.data as CoolDrinksRow | null
      const pkData = pkRes.data as ParkingRow | null

      if (mcData) {
        setMcRows(flatToRows(mcData as Record<string, unknown>, MAIN_ITEMS, MC_DB_KEY))
        setMcUpi(mcData.upi_amount ? String(mcData.upi_amount) : '')
        setMcCash(mcData.cash_amount ? String(mcData.cash_amount) : '')
        setHasMc(true)
      }
      if (pcData) {
        setPcRows(flatToRows(pcData as Record<string, unknown>, POPCORN_ITEMS, PC_DB_KEY))
        setPcBms(pcData.bms_combo_amount ? String(pcData.bms_combo_amount) : '')
        setPcUpi(pcData.upi_amount ? String(pcData.upi_amount) : '')
        setPcCash(pcData.cash_amount ? String(pcData.cash_amount) : '')
        setHasPc(true)
      }
      if (cdData) {
        setCdRows(flatToRows(cdData as Record<string, unknown>, CD_ALL, CD_DB_KEY))
        setCdUpi(cdData.upi_amount ? String(cdData.upi_amount) : '')
        setCdCash(cdData.cash_amount ? String(cdData.cash_amount) : '')
        setHasCd(true)
      }
      if (pkData) {
        setPkScooter(pkData.scooter_count ? String(pkData.scooter_count) : '')
        setPkAuto(pkData.auto_count ? String(pkData.auto_count) : '')
        setPkCar(pkData.car_count ? String(pkData.car_count) : '')
        setPkReported(pkData.reported_amount != null ? String(pkData.reported_amount) : '')
      }

      // OB carry-forward — only when no existing data and show_number > 1
      const showNum = showRes.data?.show_number
      if (showNum && showNum > 1 && !mcData) {
        const { data: prevShow } = await supabase
          .from('theatre_shows')
          .select('id')
          .eq('day_id', showRes.data.day_id)
          .eq('show_number', showNum - 1)
          .maybeSingle()

        if (!cancelled.current && prevShow) {
          const [prevMcRes, prevPcRes, prevCdRes] = await Promise.all([
            supabase.from('theatre_main_counter').select('*').eq('show_id', prevShow.id).maybeSingle(),
            supabase.from('theatre_popcorn').select('*').eq('show_id', prevShow.id).maybeSingle(),
            supabase.from('theatre_cool_drinks').select('*').eq('show_id', prevShow.id).maybeSingle(),
          ])

          if (cancelled.current) return

          let didCarry = false
          if (prevMcRes.data) {
            setMcRows(applyCarryForward(
              flatToRows(prevMcRes.data as Record<string, unknown>, MAIN_ITEMS, MC_DB_KEY),
              MAIN_ITEMS,
            ))
            didCarry = true
          }
          if (prevPcRes.data) {
            setPcRows(applyCarryForward(
              flatToRows(prevPcRes.data as Record<string, unknown>, POPCORN_ITEMS, PC_DB_KEY),
              POPCORN_ITEMS,
            ))
            didCarry = true
          }
          if (prevCdRes.data) {
            setCdRows(applyCarryForward(
              flatToRows(prevCdRes.data as Record<string, unknown>, CD_ALL, CD_DB_KEY),
              CD_ALL,
            ))
            didCarry = true
          }
          if (didCarry) setObNote(`OB carried from Show ${showNum - 1}`)
        }
      }

      if (!cancelled.current) setLoading(false)
    }

    loadAll()
    return () => { cancelled.current = true }
  }, [showId, theatreId])

  // ── Toast helper ────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  // ── Recheck completion ──────────────────────────────────────────
  async function recheckCompletion() {
    const [a, b, c] = await Promise.all([
      supabase.from('theatre_main_counter').select('show_id').eq('show_id', showId!).maybeSingle(),
      supabase.from('theatre_popcorn').select('show_id').eq('show_id', showId!).maybeSingle(),
      supabase.from('theatre_cool_drinks').select('show_id').eq('show_id', showId!).maybeSingle(),
    ])
    setHasMc(!!a.data)
    setHasPc(!!b.data)
    setHasCd(!!c.data)
  }

  // ── Save functions ──────────────────────────────────────────────
  async function saveMc() {
    setMcSaving(true)
    const { error } = await supabase
      .from('theatre_main_counter')
      .upsert(
        {
          show_id: showId!,
          ...rowsToFlat(mcRows, MAIN_ITEMS, MC_DB_KEY),
          upi_amount: Number(mcUpi) || 0,
          cash_amount: Number(mcCash) || 0,
        },
        { onConflict: 'show_id' },
      )
    setMcSaving(false)
    if (!error) { showToast('✓ Saved'); recheckCompletion() }
    else showToast('Save failed')
  }

  async function savePcAndPk() {
    setPcSaving(true)
    const [pcErr, pkErr] = await Promise.all([
      supabase.from('theatre_popcorn').upsert(
        {
          show_id: showId!,
          ...rowsToFlat(pcRows, POPCORN_ITEMS, PC_DB_KEY),
          bms_combo_amount: Number(pcBms) || 0,
          upi_amount: Number(pcUpi) || 0,
          cash_amount: Number(pcCash) || 0,
        },
        { onConflict: 'show_id' },
      ).then(r => r.error),
      supabase.from('theatre_parking').upsert(
        {
          show_id: showId!,
          scooter_count: Number(pkScooter) || 0,
          auto_count: Number(pkAuto) || 0,
          car_count: Number(pkCar) || 0,
          reported_amount: pkReported !== '' ? Number(pkReported) : null,
        },
        { onConflict: 'show_id' },
      ).then(r => r.error),
    ])
    setPcSaving(false)
    if (!pcErr && !pkErr) { showToast('✓ Saved'); recheckCompletion() }
    else showToast('Save failed')
  }

  async function saveCd() {
    setCdSaving(true)
    const { error } = await supabase
      .from('theatre_cool_drinks')
      .upsert(
        {
          show_id: showId!,
          ...rowsToFlat(cdRows, CD_ALL, CD_DB_KEY),
          upi_amount: Number(cdUpi) || 0,
          cash_amount: Number(cdCash) || 0,
        },
        { onConflict: 'show_id' },
      )
    setCdSaving(false)
    if (!error) { showToast('✓ Saved'); recheckCompletion() }
    else showToast('Save failed')
  }

  // ── Derived values ──────────────────────────────────────────────
  const isComplete = hasMc && hasPc && hasCd
  const isInProgress = (hasMc || hasPc || hasCd) && !isComplete
  const statusKey = isComplete ? 'complete' : isInProgress ? 'inprogress' : 'pending'
  const statusMeta = STATUS_META[statusKey]

  const mcTotal = tabTotal(mcRows, MAIN_ITEMS)
  const pcTotal = tabTotal(pcRows, POPCORN_ITEMS) + (Number(pcBms) || 0)
  const cdTotal = tabTotal(cdRows, CD_ALL)

  const parkingExpected = calcParkingExpected(
    Number(pkScooter) || 0, Number(pkAuto) || 0, Number(pkCar) || 0,
  )
  const parkingGap = pkReported !== ''
    ? calcParkingGap(parkingExpected, Number(pkReported) || 0)
    : null

  const mcSlipTotal = (Number(mcUpi) || 0) + (Number(mcCash) || 0)
  const pcSlipTotal = (Number(pcUpi) || 0) + (Number(pcCash) || 0)
  const cdSlipTotal = (Number(cdUpi) || 0) + (Number(cdCash) || 0)

  const displayTime = showMeta?.start_time?.slice(0, 5) ?? ''

  const tabSaveConfig = {
    main:    { label: 'Save Main Counter',       handler: saveMc,      saving: mcSaving },
    popcorn: { label: 'Save Popcorn & Parking',  handler: savePcAndPk, saving: pcSaving },
    cool:    { label: 'Save Cool Drinks',         handler: saveCd,      saving: cdSaving },
  }
  const { label: saveLabel, handler: saveHandler, saving: isSaving } = tabSaveConfig[activeTab]

  if (loading) {
    return (
      <div className="t" style={{
        position: 'fixed', inset: 0, background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  return (
    <div className="t" style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px 10px', flexShrink: 0,
        borderBottom: '1px solid var(--card-border)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 36, height: 36, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', border: '1px solid var(--card-border)',
            borderRadius: 10, color: 'var(--text)', cursor: 'pointer',
            fontSize: 18,
          }}
        >
          ‹
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 16, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            Show {showMeta?.show_number}{showMeta?.movie_name ? ` · ${showMeta.movie_name}` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
            {theatreName}{displayTime ? ` · ${displayTime}` : ''}
            {showMeta?.is_fan_show && (
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px',
                borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: 'var(--accent)',
              }}>FAN</span>
            )}
          </div>
        </div>

        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 10px',
          borderRadius: 999, background: statusMeta.bg, color: statusMeta.fg,
          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11 }}>{statusMeta.dot}</span>
          {statusMeta.label}
        </span>
      </div>

      {/* ── OB carry-forward note ─────────────────────────────────── */}
      {obNote && (
        <div style={{
          padding: '6px 16px', background: 'rgba(139,92,246,0.08)',
          borderBottom: '1px solid var(--purple-border)',
          fontSize: 12, color: 'var(--purple-text)', flexShrink: 0,
        }}>
          {obNote}
        </div>
      )}

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexShrink: 0,
        borderBottom: '1px solid var(--card-border)',
      }}>
        {TABS.map(tab => {
          const on = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, height: 46, background: 'transparent', border: 'none',
                cursor: 'pointer', color: on ? 'var(--text)' : 'var(--muted)',
                fontSize: 13.5, fontWeight: on ? 650 : 500,
                fontFamily: 'inherit', position: 'relative',
                transition: 'color .18s',
              }}
            >
              {tab.label}
              <span style={{
                position: 'absolute', left: 8, right: 8, bottom: -1, height: 2.5,
                borderRadius: 2, background: 'var(--accent)',
                transform: on ? 'scaleX(1)' : 'scaleX(0)',
                transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
                boxShadow: on ? '0 0 10px var(--accent-glow)' : 'none',
              }} />
            </button>
          )
        })}
      </div>

      {/* ── Scrollable content ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', overscrollBehavior: 'none' }}>

        {/* ── Main Counter tab ────────────────────────────────────── */}
        {activeTab === 'main' && (
          <>
            <ColHeaders />
            {MAIN_ITEMS.map(item => (
              <SlipRow
                key={item.id}
                label={item.name}
                subLabel={`₹${item.price}`}
                price={item.price}
                ob={mcRows[item.id]?.ob ?? ''}
                rec={mcRows[item.id]?.rec ?? ''}
                cb={mcRows[item.id]?.cb ?? ''}
                onObChange={v => updateRow(setMcRows, item.id, 'ob', v)}
                onRecChange={v => updateRow(setMcRows, item.id, 'rec', v)}
                onCbChange={v => updateRow(setMcRows, item.id, 'cb', v)}
              />
            ))}
            <TotalCard label="Main Counter Total" amount={mcTotal} />
            <PaymentSection
              upi={mcUpi} cash={mcCash} total={mcSlipTotal} slipTotal={mcTotal}
              onUpi={setMcUpi} onCash={setMcCash}
            />
            <div style={{ height: 16 }} />
          </>
        )}

        {/* ── Popcorn tab ─────────────────────────────────────────── */}
        {activeTab === 'popcorn' && (
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
                onObChange={v => updateRow(setPcRows, item.id, 'ob', v)}
                onRecChange={v => updateRow(setPcRows, item.id, 'rec', v)}
                onCbChange={v => updateRow(setPcRows, item.id, 'cb', v)}
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
              onUpi={setPcUpi} onCash={setPcCash}
            />
            <div style={{ height: 16 }} />
          </>
        )}

        {/* ── Cool Drinks tab ──────────────────────────────────────── */}
        {activeTab === 'cool' && (
          <>
            <ColHeaders />
            {CD_ALL.filter(i => i.section === 'drinks').map(item => (
              <SlipRow
                key={item.id}
                label={item.name}
                subLabel={`₹${item.price}`}
                price={item.price}
                ob={cdRows[item.id]?.ob ?? ''}
                rec={cdRows[item.id]?.rec ?? ''}
                cb={cdRows[item.id]?.cb ?? ''}
                onObChange={v => updateRow(setCdRows, item.id, 'ob', v)}
                onRecChange={v => updateRow(setCdRows, item.id, 'rec', v)}
                onCbChange={v => updateRow(setCdRows, item.id, 'cb', v)}
              />
            ))}

            <SectionDivider label="Live Counter" />

            {CD_ALL.filter(i => i.section === 'live').map(item => (
              <SlipRow
                key={item.id}
                label={item.name}
                subLabel={`₹${item.price}`}
                price={item.price}
                ob={cdRows[item.id]?.ob ?? ''}
                rec={cdRows[item.id]?.rec ?? ''}
                cb={cdRows[item.id]?.cb ?? ''}
                onObChange={v => updateRow(setCdRows, item.id, 'ob', v)}
                onRecChange={v => updateRow(setCdRows, item.id, 'rec', v)}
                onCbChange={v => updateRow(setCdRows, item.id, 'cb', v)}
              />
            ))}

            <TotalCard label="Cool Drinks Total" amount={cdTotal} />
            <PaymentSection
              upi={cdUpi} cash={cdCash} total={cdSlipTotal} slipTotal={cdTotal}
              onUpi={setCdUpi} onCash={setCdCash}
            />
            <div style={{ height: 16 }} />
          </>
        )}

      </div>

      {/* ── Save button ───────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--card-border)',
        background: 'var(--bg)',
        flexShrink: 0,
      }}>
        <button
          onClick={saveHandler}
          disabled={isSaving}
          style={{
            width: '100%', height: 52,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: isSaving ? 'rgba(245,158,11,0.6)' : 'var(--accent)',
            color: 'var(--accent-ink)',
            border: 'none', borderRadius: 'var(--r-btn)',
            fontWeight: 650, fontSize: 16, cursor: isSaving ? 'default' : 'pointer',
            boxShadow: '0 6px 22px -8px var(--accent-glow)',
            transition: 'background .15s',
            fontFamily: 'inherit',
          }}
        >
          {isSaving ? 'Saving…' : saveLabel}
        </button>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface-2)', border: '1px solid var(--card-border)',
          color: 'var(--green)', borderRadius: 999,
          padding: '8px 20px', fontSize: 14, fontWeight: 600,
          pointerEvents: 'none', zIndex: 50,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

    </div>
  )
}
