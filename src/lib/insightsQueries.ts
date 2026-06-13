import { supabase } from './supabase'
import { PRICES, COSTS } from './prices'
import { calcParkingExpected } from './calculations'
import { safeIn } from './utils'
import { loadSlipDataForShows } from './loadSlipData'

// ── DB column prefix -> price/cost/display-name maps ──────────────────────
export const MC_PRICE: Record<string, number> = {
  veg_puff: PRICES.veg_puff, egg_puff: PRICES.egg_puff, h_cake: PRICES.h_cake,
  jam_bun: PRICES.jam_bun, ckn_puff: PRICES.ckn_puff,
  samosa: PRICES.samosa, tin: PRICES.tin, frooty: PRICES.frooty,
  chips: PRICES.chips, frymes: PRICES.frymes, water: PRICES.water,
  milkshake: PRICES.milkshake, kettle_chips: PRICES.kettle_chips,
}
export const MC_COST: Record<string, number> = {
  veg_puff: COSTS.veg_puff, egg_puff: COSTS.egg_puff, h_cake: COSTS.h_cake,
  jam_bun: COSTS.jam_bun, ckn_puff: COSTS.ckn_puff,
  samosa: COSTS.samosa, tin: COSTS.tin, frooty: COSTS.frooty,
  chips: COSTS.chips, frymes: COSTS.frymes, water: COSTS.water,
  milkshake: COSTS.milkshake, kettle_chips: COSTS.kettle_chips,
}
export const MC_NAME: Record<string, string> = {
  veg_puff: 'Veg Puff', egg_puff: 'Egg Puff', h_cake: 'Honey Cake', jam_bun: 'Jam Bun',
  ckn_puff: 'C Puff', samosa: 'Samosa', tin: 'Tins', frooty: 'Frooty',
  chips: 'Chips', frymes: 'Frymes', water: 'Water', milkshake: 'Milkshake',
  kettle_chips: 'Kettle Chips', tins_mc: 'Tins (MC)',
}

export const PC_PRICE: Record<string, number> = { cone_60: PRICES.cone_60, cone_130: PRICES.cone_130, cone_200: PRICES.cone_200 }
export const PC_COST: Record<string, number> = { cone_60: COSTS.cone_60, cone_130: COSTS.cone_130, cone_200: COSTS.cone_200 }
export const PC_NAME: Record<string, string> = { cone_60: 'Cone S', cone_130: 'Cone M', cone_200: 'Cone L' }

export const CD_PRICE: Record<string, number> = {
  water: PRICES.cd_water, tin: PRICES.cd_tin, frooty_trop: PRICES.frooty_trop,
  milkshake: PRICES.cd_milkshake, french_fries: PRICES.french_fries, veg_bites: PRICES.veg_bites,
  onion_samosa: PRICES.onion_samosa, ckn_popcorn: PRICES.ckn_popcorn, ckn_samosa: PRICES.ckn_samosa,
  ckn_nuggets: PRICES.ckn_nuggets, ice_cream1: PRICES.ice_cream1, ice_cream2: PRICES.ice_cream2,
  ice_cream3: PRICES.ice_cream3, tea_coffee: PRICES.tea_coffee, sandwich: PRICES.sandwich,
}
export const CD_COST: Record<string, number> = {
  water: COSTS.cd_water, tin: COSTS.cd_tin, frooty_trop: COSTS.frooty_trop,
  milkshake: COSTS.cd_milkshake, french_fries: COSTS.french_fries, veg_bites: COSTS.veg_bites,
  onion_samosa: COSTS.onion_samosa, ckn_popcorn: COSTS.ckn_popcorn, ckn_samosa: COSTS.ckn_samosa,
  ckn_nuggets: COSTS.ckn_nuggets, ice_cream1: COSTS.ice_cream1, ice_cream2: COSTS.ice_cream2,
  ice_cream3: COSTS.ice_cream3, tea_coffee: COSTS.tea_coffee, sandwich: COSTS.sandwich,
}
export const CD_NAME: Record<string, string> = {
  water: 'Water (CD)', tin: 'Tins', frooty_trop: 'Frooty', milkshake: 'Milkshake (CD)',
  french_fries: 'French Fries', veg_bites: 'Veg Bites', onion_samosa: 'Onion Samosa', ckn_popcorn: 'Ckn Popcorn',
  ckn_samosa: 'Ckn Samosa', ckn_nuggets: 'Ckn Nuggets', ice_cream1: 'Ice Cream 1', ice_cream2: 'Ice Cream 2',
  ice_cream3: 'Ice Cream 3', tea_coffee: 'Tea/Coffee', sandwich: 'Sandwich',
}

export function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

// last `days` calendar days, ending today, ascending
export function dateRange(days: number): string[] {
  const out: string[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
  }
  return out
}

export function sumBySale(row: Record<string, unknown> | null, priceMap: Record<string, number>): number {
  if (!row) return 0
  let total = 0
  for (const prefix in priceMap) {
    const sale = Number(row[`${prefix}_sale`]) || 0
    total += sale * priceMap[prefix]
  }
  return total
}

export function sumByCost(row: Record<string, unknown> | null, costMap: Record<string, number>): number {
  if (!row) return 0
  let total = 0
  for (const prefix in costMap) {
    const sale = Number(row[`${prefix}_sale`]) || 0
    const wst = Number(row[`${prefix}_wst`]) || 0
    total += (sale + wst) * costMap[prefix]
  }
  return total
}

async function resolveTheatreIds(theatreId: string | 'both'): Promise<{ id: string; name: string }[]> {
  if (theatreId === 'both') {
    const { data } = await supabase.from('theatre_theatres').select('id,name').in('name', ['Sandhya', 'Manasa'])
    return (data ?? []) as { id: string; name: string }[]
  }
  const { data } = await supabase.from('theatre_theatres').select('id,name').eq('id', theatreId).maybeSingle()
  return data ? [data as { id: string; name: string }] : [{ id: theatreId, name: '' }]
}

interface ShowAgg {
  showId: string
  dayId: string
  date: string
  showNumber: number
  occupancy: number
  revenue: number
  parkingExpected: number
  parkingReported: number
}

// Loads all shows + slip totals for a theatre over a date range
async function loadShowAggregates(theatreId: string, dates: string[]): Promise<ShowAgg[]> {
  const { data: days } = await supabase
    .from('theatre_days').select('id,date')
    .eq('theatre_id', theatreId).in('date', dates)
  if (!days || days.length === 0) return []
  const dayMap = new Map(days.map(d => [d.id as string, d.date as string]))
  const dayIds = days.map(d => d.id as string)

  const { data: shows } = await supabase
    .from('theatre_shows').select('id,day_id,show_number,occupancy_pct')
    .in('day_id', dayIds)
  if (!shows || shows.length === 0) return []
  const showIds = shows.map(s => s.id as string)

  const { mc: mcRows, pc: pcRows, cd: cdRows, parking: pkRows } = await loadSlipDataForShows(showIds)
  const mcMap = new Map((mcRows ?? []).map(r => [r.show_id as string, r as Record<string, unknown>]))
  const pcMap = new Map((pcRows ?? []).map(r => [r.show_id as string, r as Record<string, unknown>]))
  const cdMap = new Map((cdRows ?? []).map(r => [r.show_id as string, r as Record<string, unknown>]))
  const pkMap = new Map((pkRows ?? []).map(r => [r.show_id as string, r as Record<string, unknown>]))

  return shows.map(s => {
    const showId = s.id as string
    const mc = mcMap.get(showId) ?? null
    const pc = pcMap.get(showId) ?? null
    const cd = cdMap.get(showId) ?? null
    const pk = pkMap.get(showId) ?? null

    const mcRev = sumBySale(mc, MC_PRICE)
    const pcRev = sumBySale(pc, PC_PRICE) + (Number(pc?.bms_combo_amount) || 0)
    const cdRev = sumBySale(cd, CD_PRICE)
    const parkingReported = (Number(pk?.upi_amount) || 0) + (Number(pk?.cash_amount) || 0)
    const parkingExpected = pk
      ? calcParkingExpected(Number(pk.scooter_count) || 0, Number(pk.auto_count) || 0, Number(pk.car_count) || 0)
      : 0

    return {
      showId,
      dayId: s.day_id as string,
      date: dayMap.get(s.day_id as string) ?? '',
      showNumber: s.show_number as number,
      occupancy: Number(s.occupancy_pct) || 0,
      revenue: mcRev + pcRev + cdRev + parkingReported,
      parkingExpected,
      parkingReported,
    }
  })
}

// ── 1. Daily revenue ────────────────────────────────────────────────────
export interface DailyRevenuePoint {
  date: string
  revenue: number
  theatreId?: string
}

export async function fetchDailyRevenue(theatreId: string | 'both', days: number): Promise<DailyRevenuePoint[]> {
  const dates = dateRange(days)
  const theatres = await resolveTheatreIds(theatreId)
  const out: DailyRevenuePoint[] = []

  for (const t of theatres) {
    const aggs = await loadShowAggregates(t.id, dates)
    const byDate = new Map<string, number>()
    for (const date of dates) byDate.set(date, 0)
    for (const a of aggs) byDate.set(a.date, (byDate.get(a.date) ?? 0) + a.revenue)

    for (const date of dates) {
      out.push(theatreId === 'both'
        ? { date, revenue: byDate.get(date) ?? 0, theatreId: t.id }
        : { date, revenue: byDate.get(date) ?? 0 })
    }
  }
  return out
}

// ── 2. Show performance by slot ─────────────────────────────────────────
export interface ShowPerformancePoint {
  slot: string
  avgRevenue: number
  avgOccupancy: number
}

export async function fetchShowPerformance(theatreId: string | 'both', days: number): Promise<ShowPerformancePoint[]> {
  const dates = dateRange(days)
  const theatres = await resolveTheatreIds(theatreId)
  const bySlot = new Map<number, { revSum: number; occSum: number; n: number }>()

  for (const t of theatres) {
    const aggs = await loadShowAggregates(t.id, dates)
    for (const a of aggs) {
      const cur = bySlot.get(a.showNumber) ?? { revSum: 0, occSum: 0, n: 0 }
      cur.revSum += a.revenue
      cur.occSum += a.occupancy
      cur.n += 1
      bySlot.set(a.showNumber, cur)
    }
  }

  return [...bySlot.entries()]
    .sort(([a], [b]) => a - b)
    .map(([slot, v]) => ({
      slot: `Show ${slot}`,
      avgRevenue: v.n ? Math.round(v.revSum / v.n) : 0,
      avgOccupancy: v.n ? Math.round(v.occSum / v.n) : 0,
    }))
}

// ── 3. Top items by revenue ─────────────────────────────────────────────
export interface TopItem {
  name: string
  revenue: number
  units: number
  profit?: number
  marginPct?: number
}

export async function fetchTopItems(theatreId: string | 'both', days: number): Promise<TopItem[]> {
  const dates = dateRange(days)
  const theatres = await resolveTheatreIds(theatreId)

  const totals = new Map<string, { revenue: number; units: number; profit: number; hasProfit: boolean }>()
  const addItem = (key: string, sale: number, price: number, cost?: number) => {
    if (sale <= 0) return
    const cur = totals.get(key) ?? { revenue: 0, units: 0, profit: 0, hasProfit: cost != null }
    cur.revenue += sale * price
    cur.units += sale
    if (cost != null) cur.profit += sale * (price - cost)
    totals.set(key, cur)
  }

  for (const t of theatres) {
    const { data: days_ } = await supabase.from('theatre_days').select('id').eq('theatre_id', t.id).in('date', dates)
    const dayIds = (days_ ?? []).map(d => d.id as string)
    if (dayIds.length === 0) continue
    const { data: shows } = await supabase.from('theatre_shows').select('id').in('day_id', dayIds)
    const showIds = (shows ?? []).map(s => s.id as string)
    if (showIds.length === 0) continue

    const [{ data: mcRows }, { data: pcRows }, { data: cdRows }] = await Promise.all([
      supabase.from('theatre_main_counter').select('*').in('show_id', safeIn(showIds)),
      supabase.from('theatre_popcorn').select('*').in('show_id', safeIn(showIds)),
      supabase.from('theatre_cool_drinks').select('*').in('show_id', safeIn(showIds)),
    ])

    for (const row of mcRows ?? []) {
      for (const prefix in MC_PRICE) {
        addItem(`mc_${prefix}`, Number((row as Record<string, unknown>)[`${prefix}_sale`]) || 0, MC_PRICE[prefix], MC_COST[prefix])
      }
    }
    for (const row of pcRows ?? []) {
      for (const prefix in PC_PRICE) {
        addItem(`pc_${prefix}`, Number((row as Record<string, unknown>)[`${prefix}_sale`]) || 0, PC_PRICE[prefix], PC_COST[prefix])
      }
      const bms = Number((row as Record<string, unknown>).bms_combo_amount) || 0
      if (bms > 0) {
        const cur = totals.get('pc_bms') ?? { revenue: 0, units: 0, profit: 0, hasProfit: false }
        cur.revenue += bms
        totals.set('pc_bms', cur)
      }
    }
    for (const row of cdRows ?? []) {
      for (const prefix in CD_PRICE) {
        addItem(`cd_${prefix}`, Number((row as Record<string, unknown>)[`${prefix}_sale`]) || 0, CD_PRICE[prefix], CD_COST[prefix])
      }
    }
  }

  const NAME_BY_KEY: Record<string, string> = { pc_bms: 'BMS Combo' }
  for (const prefix in MC_NAME) NAME_BY_KEY[`mc_${prefix}`] = MC_NAME[prefix]
  for (const prefix in PC_NAME) NAME_BY_KEY[`pc_${prefix}`] = PC_NAME[prefix]
  for (const prefix in CD_NAME) NAME_BY_KEY[`cd_${prefix}`] = CD_NAME[prefix]

  return [...totals.entries()]
    .map(([key, v]) => ({
      name: NAME_BY_KEY[key] ?? key,
      revenue: Math.round(v.revenue),
      units: v.units,
      profit: v.hasProfit ? Math.round(v.profit) : undefined,
      marginPct: v.hasProfit && v.revenue > 0 ? Math.round((v.profit / v.revenue) * 100) : undefined,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
}

// ── 4. Parking gap trend ────────────────────────────────────────────────
export interface ParkingGapPoint {
  date: string
  gap: number
}

export async function fetchParkingGapTrend(theatreId: string, days: number): Promise<ParkingGapPoint[]> {
  const dates = dateRange(days)
  const aggs = await loadShowAggregates(theatreId, dates)
  const byDate = new Map<string, number>()
  for (const date of dates) byDate.set(date, 0)
  for (const a of aggs) byDate.set(a.date, (byDate.get(a.date) ?? 0) + (a.parkingExpected - a.parkingReported))
  return dates.map(date => ({ date, gap: byDate.get(date) ?? 0 }))
}

// ── 5. Catering suggestions for tomorrow ────────────────────────────────
export interface CateringItem {
  name: string
  qty: number
  trend: 'up' | 'down' | 'flat'
}

export interface CateringSuggestions {
  movie: string | null
  occupancy: number | null
  basedOnCount: number
  items: CateringItem[]
}

export async function fetchCateringSuggestions(theatreId: string): Promise<CateringSuggestions> {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowStr = toDateStr(tomorrow)
  const tomorrowDow = tomorrow.getDay()

  // tomorrow's movie/occupancy if already entered
  let movie: string | null = null
  let occupancy: number | null = null
  const { data: tomorrowDay } = await supabase.from('theatre_days').select('id').eq('theatre_id', theatreId).eq('date', tomorrowStr).maybeSingle()
  if (tomorrowDay) {
    const { data: tomorrowShows } = await supabase.from('theatre_shows').select('movie_name,occupancy_pct').eq('day_id', tomorrowDay.id)
    if (tomorrowShows && tomorrowShows.length > 0) {
      movie = (tomorrowShows[0].movie_name as string) ?? null
      const occs = tomorrowShows.map(s => Number(s.occupancy_pct) || 0).filter(v => v > 0)
      occupancy = occs.length ? Math.round(occs.reduce((a, b) => a + b, 0) / occs.length) : null
    }
  }

  // last 28 days, same day-of-week as tomorrow
  const dates = dateRange(28).filter(d => new Date(d + 'T00:00:00').getDay() === tomorrowDow)
  const aggs = await loadShowAggregates(theatreId, dates)

  // need raw item sale qtys -> re-fetch slip rows for these shows
  const showIds = aggs.map(a => a.showId)
  const dateByShow = new Map(aggs.map(a => [a.showId, a.date]))

  const [{ data: mcRows }, { data: pcRows }, { data: cdRows }] = await Promise.all([
    supabase.from('theatre_main_counter').select('*').in('show_id', safeIn(showIds)),
    supabase.from('theatre_popcorn').select('*').in('show_id', safeIn(showIds)),
    supabase.from('theatre_cool_drinks').select('*').in('show_id', safeIn(showIds)),
  ])

  // per-item: array of {date, qty} across matching shows
  const series = new Map<string, { name: string; byDate: Map<string, number> }>()
  const accumulate = (rows: { show_id: unknown; [k: string]: unknown }[] | null, priceMap: Record<string, number>, nameMap: Record<string, string>, prefixKey: string) => {
    for (const row of rows ?? []) {
      const date = dateByShow.get(row.show_id as string)
      if (!date) continue
      for (const prefix in priceMap) {
        const key = `${prefixKey}_${prefix}`
        const qty = Number(row[`${prefix}_sale`]) || 0
        const entry = series.get(key) ?? { name: nameMap[prefix], byDate: new Map<string, number>() }
        entry.byDate.set(date, (entry.byDate.get(date) ?? 0) + qty)
        series.set(key, entry)
      }
    }
  }
  accumulate(mcRows as never, MC_PRICE, MC_NAME, 'mc')
  accumulate(pcRows as never, PC_PRICE, PC_NAME, 'pc')
  accumulate(cdRows as never, CD_PRICE, CD_NAME, 'cd')

  const items: CateringItem[] = []
  for (const [, entry] of series) {
    const vals = dates.map(d => entry.byDate.get(d) ?? 0)
    const total = vals.reduce((a, b) => a + b, 0)
    if (total === 0) continue
    const avg = total / vals.length
    const half = Math.floor(vals.length / 2)
    const recentAvg = vals.slice(half).reduce((a, b) => a + b, 0) / Math.max(1, vals.length - half)
    const olderAvg = vals.slice(0, half).reduce((a, b) => a + b, 0) / Math.max(1, half)
    let trend: 'up' | 'down' | 'flat' = 'flat'
    if (olderAvg > 0) {
      if (recentAvg > olderAvg * 1.1) trend = 'up'
      else if (recentAvg < olderAvg * 0.9) trend = 'down'
    } else if (recentAvg > 0) {
      trend = 'up'
    }
    items.push({ name: entry.name, qty: Math.round(avg), trend })
  }

  items.sort((a, b) => b.qty - a.qty)

  return {
    movie,
    occupancy,
    basedOnCount: aggs.length,
    items: items.slice(0, 5),
  }
}
