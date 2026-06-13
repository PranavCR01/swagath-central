import { PRICES } from '@/lib/prices'
import { calcSale, calcAmount } from '@/lib/calculations'
import type { TabRows } from '@/lib/types'

// ── Item catalogues ───────────────────────────────────────────────
export const MAIN_ITEMS = [
  { id: 'vegpuff',   name: 'Veg Puff',     price: PRICES.veg_puff     },
  { id: 'eggpuff',   name: 'Egg Puff',     price: PRICES.egg_puff     },
  { id: 'samosa',    name: 'Samosa',       price: PRICES.samosa       },
  { id: 'cknpuff',   name: 'C Puff',       price: PRICES.ckn_puff     },
  { id: 'hcake',     name: 'Honey Cake',   price: PRICES.h_cake       },
  { id: 'jambun',    name: 'Jam Bun',      price: PRICES.jam_bun      },
  { id: 'chips',     name: 'Chips',        price: PRICES.chips        },
  { id: 'frymes',    name: 'Frymes',       price: PRICES.frymes       },
  { id: 'kettle',    name: 'Kettle Chips', price: PRICES.kettle_chips },
  { id: 'water',     name: 'Water',        price: PRICES.water        },
  { id: 'mshake',    name: 'Milkshake',    price: PRICES.milkshake    },
  { id: 'frooty',    name: 'Frooty',       price: PRICES.frooty       },
  { id: 'tin',       name: 'Tins',         price: PRICES.tin          },
  { id: 'tins_mc',   name: 'Tins (MC)',    price: PRICES.tins_mc      },
]

export const POPCORN_ITEMS = [
  { id: 'cone_s', name: 'Cone S', price: PRICES.cone_60 },
  { id: 'cone_m', name: 'Cone M', price: PRICES.cone_130 },
  { id: 'cone_l', name: 'Cone L', price: PRICES.cone_200 },
]

export const CD_ALL = [
  { id: 'c_water',   name: 'Water',         price: PRICES.cd_water,     section: 'drinks' },
  { id: 'c_tin',     name: 'Tins',          price: PRICES.cd_tin,       section: 'drinks' },
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
  { id: 'c_sand',    name: 'Sandwich',      price: PRICES.sandwich,     section: 'live'   },
]

// ── item.id → DB column prefix ────────────────────────────────────
export const MC_DB_KEY: Record<string, string> = {
  vegpuff: 'veg_puff',
  eggpuff: 'egg_puff',
  hcake:   'h_cake',
  jambun:  'jam_bun',
  cknpuff: 'ckn_puff',
  samosa:  'samosa',
  tin:     'tin',
  frooty:  'frooty',
  chips:   'chips',
  frymes:  'frymes',
  water:   'water',
  mshake:  'milkshake',
  kettle:  'kettle_chips',
  tins_mc: 'tins_mc',
}
export const PC_DB_KEY: Record<string, string> = {
  cone_s: 'cone_60', cone_m: 'cone_130', cone_l: 'cone_200',
}
export const CD_DB_KEY: Record<string, string> = {
  c_water:   'water',
  c_tin:     'tin',
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
  c_sand:    'sandwich',
}

export const TABS = [
  { id: 'main',    label: 'Main Counter' },
  { id: 'popcorn', label: 'Popcorn' },
  { id: 'cool',    label: 'Cool Drinks' },
] as const
export type TabId = typeof TABS[number]['id']

// ── Formatting ───────────────────────────────────────────────────
const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
export const rupee = (n: number) => '₹' + inrFmt.format(Math.round(n))

// ── Row helpers ──────────────────────────────────────────────────
export function emptyRows(items: { id: string }[]): TabRows {
  return Object.fromEntries(items.map(i => [i.id, { ob: '', rec: '', cb: '', wst: '' }]))
}

export function flatToRows(
  data: Record<string, unknown>,
  items: { id: string }[],
  keyMap: Record<string, string>,
  obAdjustments?: Record<string, number>,
): TabRows {
  const rows = emptyRows(items)
  for (const item of items) {
    const k = keyMap[item.id]
    const adj = obAdjustments?.[item.id] ?? 0
    rows[item.id] = {
      ob:  data[`${k}_ob`]  != null ? String(Number(data[`${k}_ob`]) + adj) : '',
      rec: data[`${k}_rec`] != null ? String(data[`${k}_rec`]) : '',
      cb:  data[`${k}_cb`]  != null ? String(data[`${k}_cb`])  : '',
      wst: String(data[`${k}_wst`] ?? 0),
    }
  }
  return rows
}

export function rowsToFlat(
  rows: TabRows,
  items: { id: string }[],
  keyMap: Record<string, string>,
  obAdjustments?: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of items) {
    const k = keyMap[item.id]
    const r = rows[item.id] ?? { ob: '', rec: '', cb: '', wst: '' }
    const adj = obAdjustments?.[item.id] ?? 0
    const ob  = (Number(r.ob) || 0) - adj
    const rec = Number(r.rec) || 0
    const cb  = Number(r.cb)  || 0
    const wst = Math.max(0, Number(r.wst) || 0)
    out[`${k}_ob`]   = ob
    out[`${k}_rec`]  = rec
    out[`${k}_cb`]   = cb
    out[`${k}_wst`]  = wst
    out[`${k}_sale`] = Math.max(0, calcSale(ob, rec, cb) - wst)
  }
  return out
}

export function applyCarryForward(
  prevRows: TabRows,
  items: readonly { id: string }[],
): TabRows {
  const result: TabRows = {}
  for (const item of items) {
    const prev = prevRows[item.id]
    const cb = prev?.cb ?? '0'
    result[item.id] = { ob: cb, rec: '', cb: '', wst: '' }
  }
  return result
}

export function tabTotal(rows: TabRows, items: { id: string; price: number }[]): number {
  return items.reduce((sum, item) => {
    const r = rows[item.id] ?? { ob: '', rec: '', cb: '', wst: '' }
    const sale = calcSale(Number(r.ob) || 0, Number(r.rec) || 0, Number(r.cb) || 0) - (Number(r.wst) || 0)
    return sum + calcAmount(Math.max(0, sale), item.price)
  }, 0)
}

export function updateRow(
  setter: React.Dispatch<React.SetStateAction<TabRows>>,
  id: string,
  field: 'ob' | 'rec' | 'cb' | 'wst',
  v: string,
) {
  setter(prev => ({ ...prev, [id]: { ...(prev[id] ?? { ob: '', rec: '', cb: '', wst: '' }), [field]: v } }))
}
