import { supabase } from './supabase'
import { calcParkingExpected, calcParkingGap, computeShowTotal, computeBCash } from './calculations'
import {
  MC_PRICE, MC_NAME, MC_COST, PC_PRICE, PC_NAME, PC_COST, CD_PRICE, CD_NAME, CD_COST,
  sumBySale, dateRange, toDateStr, fetchParkingGapTrend,
  fetchCateringSuggestions, type CateringSuggestions,
} from './insightsQueries'

export interface ShowSummaryLine {
  n: number
  time: string
  movie: string
  occ: number
  revenue: number
}

export interface ItemRev {
  name: string
  units: number
  revenue: number
  trend: 'up' | 'down' | 'flat'
}

export interface ItemIntel {
  top: ItemRev | null
  under: (ItemRev & { suggestion?: string }) | null
}

export interface ParkingAlertData {
  gap: number
  shows: number
  consecutive: number
  trendingUp: boolean
}

export interface DaySummaryData {
  theatreName: string
  date: string
  shows: ShowSummaryLine[]
  foodTotal: number
  popcornTotal: number
  mainCounterTotal: number
  coolDrinksTotal: number
  parkingExpected: number
  parkingReported: number
  parkingGap: number
  topItems: { name: string; revenue: number }[]
  expenses: number
  bCash: number
  vsYesterday: number | null
  grossProfit: number
  profitMargin: number
  itemIntel: ItemIntel
  catering: (CateringSuggestions & { tomorrowLabel: string }) | null
  parking: ParkingAlertData | null
}

const ALL_PRICE_MAPS: { prefix: string; price: Record<string, number>; cost: Record<string, number>; name: Record<string, string>; table: 'mc' | 'pc' | 'cd' }[] = [
  { prefix: 'mc', price: MC_PRICE, cost: MC_COST, name: MC_NAME, table: 'mc' },
  { prefix: 'pc', price: PC_PRICE, cost: PC_COST, name: PC_NAME, table: 'pc' },
  { prefix: 'cd', price: CD_PRICE, cost: CD_COST, name: CD_NAME, table: 'cd' },
]

function fmtTime(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

interface ShowRows {
  showId: string
  showNumber: number
  startTime: string
  movieName: string
  occupancy: number
  mc: Record<string, unknown> | null
  pc: Record<string, unknown> | null
  cd: Record<string, unknown> | null
  pk: Record<string, unknown> | null
}

async function loadDayShows(theatreId: string, date: string): Promise<{ dayId: string; shows: ShowRows[] } | null> {
  const { data: day } = await supabase
    .from('theatre_days').select('id')
    .eq('theatre_id', theatreId).eq('date', date).maybeSingle()
  if (!day) return null

  const { data: shows } = await supabase
    .from('theatre_shows')
    .select('id,show_number,start_time,movie_name,occupancy_pct')
    .eq('day_id', day.id).order('show_number')
  if (!shows?.length) return { dayId: day.id, shows: [] }

  const showIds = shows.map(s => s.id as string)
  const [mcRes, pcRes, cdRes, pkRes] = await Promise.all([
    supabase.from('theatre_main_counter').select('*').in('show_id', showIds),
    supabase.from('theatre_popcorn').select('*').in('show_id', showIds),
    supabase.from('theatre_cool_drinks').select('*').in('show_id', showIds),
    supabase.from('theatre_parking').select('*').in('show_id', showIds),
  ])
  const mcMap = new Map((mcRes.data ?? []).map(r => [r.show_id as string, r as Record<string, unknown>]))
  const pcMap = new Map((pcRes.data ?? []).map(r => [r.show_id as string, r as Record<string, unknown>]))
  const cdMap = new Map((cdRes.data ?? []).map(r => [r.show_id as string, r as Record<string, unknown>]))
  const pkMap = new Map((pkRes.data ?? []).map(r => [r.show_id as string, r as Record<string, unknown>]))

  return {
    dayId: day.id,
    shows: shows.map(s => ({
      showId: s.id as string,
      showNumber: s.show_number as number,
      startTime: s.start_time as string,
      movieName: s.movie_name as string,
      occupancy: Number(s.occupancy_pct) || 0,
      mc: mcMap.get(s.id as string) ?? null,
      pc: pcMap.get(s.id as string) ?? null,
      cd: cdMap.get(s.id as string) ?? null,
      pk: pkMap.get(s.id as string) ?? null,
    })),
  }
}

// total revenue (food + parking reported) across a set of shows — used for "vs yesterday"
async function dayRevenue(theatreId: string, date: string): Promise<number | null> {
  const loaded = await loadDayShows(theatreId, date)
  if (!loaded || loaded.shows.length === 0) return null
  let total = 0
  for (const s of loaded.shows) {
    const mcTotal = sumBySale(s.mc, MC_PRICE)
    const popcornTotal = sumBySale(s.pc, PC_PRICE) + (Number(s.pc?.bms_combo_amount) || 0)
    const cdTotal = sumBySale(s.cd, CD_PRICE)
    const parkingReported = Number(s.pk?.reported_amount) || 0
    total += computeShowTotal(mcTotal, popcornTotal, cdTotal, parkingReported)
  }
  return total
}

// per-item qty totals for a date range, keyed by `${prefix}_${tablePrefix}` -> qty
async function itemQtyTotals(theatreId: string, dates: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>()
  if (dates.length === 0) return totals

  const { data: days } = await supabase.from('theatre_days').select('id').eq('theatre_id', theatreId).in('date', dates)
  const dayIds = (days ?? []).map(d => d.id as string)
  if (dayIds.length === 0) return totals
  const { data: shows } = await supabase.from('theatre_shows').select('id').in('day_id', dayIds)
  const showIds = (shows ?? []).map(s => s.id as string)
  if (showIds.length === 0) return totals

  const [mcRes, pcRes, cdRes] = await Promise.all([
    supabase.from('theatre_main_counter').select('*').in('show_id', showIds),
    supabase.from('theatre_popcorn').select('*').in('show_id', showIds),
    supabase.from('theatre_cool_drinks').select('*').in('show_id', showIds),
  ])
  const rowsByTable: Record<'mc' | 'pc' | 'cd', Record<string, unknown>[]> = {
    mc: (mcRes.data ?? []) as Record<string, unknown>[],
    pc: (pcRes.data ?? []) as Record<string, unknown>[],
    cd: (cdRes.data ?? []) as Record<string, unknown>[],
  }
  for (const { prefix, price, table } of ALL_PRICE_MAPS) {
    for (const row of rowsByTable[table]) {
      for (const item in price) {
        const qty = Number(row[`${item}_sale`]) || 0
        const key = `${prefix}_${item}`
        totals.set(key, (totals.get(key) ?? 0) + qty)
      }
    }
  }
  return totals
}

export async function buildDaySummary(theatreId: string, date: string): Promise<DaySummaryData | null> {
  const { data: theatre } = await supabase.from('theatre_theatres').select('name').eq('id', theatreId).maybeSingle()
  const theatreName = theatre?.name ?? ''

  const loaded = await loadDayShows(theatreId, date)
  if (!loaded || loaded.shows.length === 0) return null

  const shows: ShowSummaryLine[] = []
  let mainCounterTotal = 0, popcornTotal = 0, coolDrinksTotal = 0
  let parkingExpected = 0, parkingReported = 0
  let totalSales = 0
  // per-item revenue/units across today's shows, keyed `${prefix}_${item}`
  const todayItems = new Map<string, { name: string; units: number; revenue: number; cost: number }>()

  for (const s of loaded.shows) {
    const mcTotal = sumBySale(s.mc, MC_PRICE)
    const pcTotal = sumBySale(s.pc, PC_PRICE) + (Number(s.pc?.bms_combo_amount) || 0)
    const cdTotal = sumBySale(s.cd, CD_PRICE)
    const scooter = Number(s.pk?.scooter_count) || 0
    const auto = Number(s.pk?.auto_count) || 0
    const car = Number(s.pk?.car_count) || 0
    const reported = Number(s.pk?.reported_amount) || 0
    const expected = calcParkingExpected(scooter, auto, car)

    mainCounterTotal += mcTotal
    popcornTotal += pcTotal
    coolDrinksTotal += cdTotal
    parkingExpected += expected
    parkingReported += reported
    totalSales += computeShowTotal(mcTotal, pcTotal, cdTotal, reported)

    shows.push({
      n: s.showNumber, time: fmtTime(s.startTime), movie: s.movieName,
      occ: s.occupancy, revenue: computeShowTotal(mcTotal, pcTotal, cdTotal, reported),
    })

    for (const { prefix, price, cost, name, table } of ALL_PRICE_MAPS) {
      const row = table === 'mc' ? s.mc : table === 'pc' ? s.pc : s.cd
      for (const item in price) {
        const qty = Number(row?.[`${item}_sale`]) || 0
        if (qty <= 0) continue
        const key = `${prefix}_${item}`
        const cur = todayItems.get(key) ?? { name: name[item], units: 0, revenue: 0, cost: 0 }
        cur.units += qty
        cur.revenue += qty * price[item]
        cur.cost += qty * (cost[item] ?? 0)
        todayItems.set(key, cur)
      }
      if (table === 'pc') {
        const bms = Number(s.pc?.bms_combo_amount) || 0
        if (bms > 0) {
          const cur = todayItems.get('pc_bms') ?? { name: 'BMS Combo', units: 0, revenue: 0, cost: 0 }
          cur.revenue += bms
          todayItems.set('pc_bms', cur)
        }
      }
    }
  }

  const foodTotal = mainCounterTotal + popcornTotal + coolDrinksTotal
  const parkingGap = calcParkingGap(parkingExpected, parkingReported)

  // gross profit from item-level revenue/cost (excludes parking, BMS combo has no cost data)
  const itemRevenue = [...todayItems.values()].reduce((s, v) => s + v.revenue, 0)
  const itemCost = [...todayItems.values()].reduce((s, v) => s + v.cost, 0)
  const grossProfit = Math.round(itemRevenue - itemCost)
  const profitMargin = itemRevenue > 0 ? Math.round((grossProfit / itemRevenue) * 100) : 0

  const sortedItems = [...todayItems.entries()].sort(([, a], [, b]) => b.revenue - a.revenue)
  const topItems = sortedItems.slice(0, 3).map(([, v]) => ({ name: v.name, revenue: Math.round(v.revenue) }))

  // trend: today's qty vs avg daily qty over the previous 7 days
  const prevDates = dateRange(8).filter(d => d !== date)
  const prevQty = await itemQtyTotals(theatreId, prevDates)
  const trendOf = (key: string, todayQty: number): 'up' | 'down' | 'flat' => {
    const histTotal = prevQty.get(key) ?? 0
    const avg = histTotal / Math.max(1, prevDates.length)
    if (avg <= 0) return todayQty > 0 ? 'up' : 'flat'
    if (todayQty > avg * 1.1) return 'up'
    if (todayQty < avg * 0.9) return 'down'
    return 'flat'
  }

  const withUnits = sortedItems.filter(([, v]) => v.units > 0)
  let itemIntel: ItemIntel = { top: null, under: null }
  if (withUnits.length > 0) {
    const [topKey, topVal] = withUnits[0]
    const [underKey, underVal] = withUnits[withUnits.length - 1]
    const topTrend = trendOf(topKey, topVal.units)
    const underTrend = trendOf(underKey, underVal.units)
    itemIntel = {
      top: { name: topVal.name, units: topVal.units, revenue: Math.round(topVal.revenue), trend: topTrend },
      under: withUnits.length > 1 || topKey !== underKey
        ? {
            name: underVal.name, units: underVal.units, revenue: Math.round(underVal.revenue), trend: underTrend,
            suggestion: underTrend === 'down' ? `${underVal.name} is selling below its weekly average — consider trimming stock for slower shows.` : undefined,
          }
        : null,
    }
  }

  // expenses + B.Cash
  const { data: expRow } = await supabase.from('theatre_expenses').select('*').eq('day_id', loaded.dayId).maybeSingle()
  const e = (expRow ?? {}) as Record<string, unknown>
  const expObj = {
    wages: Number(e.wages) || 0,
    staff_coffee: Number(e.staff_coffee) || 0,
    water_cans: Number(e.water_cans) || 0,
    lab_food: Number(e.lab_food) || 0,
    wastage: Number(e.wastage) || 0,
    others_amount: Number(e.others_amount) || 0,
  }
  const expenses = Object.values(expObj).reduce((s, v) => s + v, 0)
  const bCash = computeBCash(totalSales, expObj)

  // vs yesterday
  const yesterday = toDateStr(new Date(new Date(date + 'T00:00:00').getTime() - 86400000))
  const yesterdayRevenue = await dayRevenue(theatreId, yesterday)
  const vsYesterday = yesterdayRevenue && yesterdayRevenue > 0
    ? Math.round(((totalSales - yesterdayRevenue) / yesterdayRevenue) * 100)
    : null

  // parking alert
  let parking: ParkingAlertData | null = null
  if (parkingGap > 0) {
    const trend = await fetchParkingGapTrend(theatreId, 7)
    let consecutive = 0
    for (let i = trend.length - 1; i >= 0; i--) {
      if (trend[i].gap > 0) consecutive++
      else break
    }
    const gapShows = loaded.shows.filter(s => {
      const expected = calcParkingExpected(Number(s.pk?.scooter_count) || 0, Number(s.pk?.auto_count) || 0, Number(s.pk?.car_count) || 0)
      return calcParkingGap(expected, Number(s.pk?.reported_amount) || 0) > 0
    }).length
    parking = { gap: parkingGap, shows: gapShows, consecutive: Math.max(consecutive, 1), trendingUp: consecutive >= 3 }
  }

  // catering suggestions for tomorrow (Slice 5 logic, reused as-is)
  const cateringBase = await fetchCateringSuggestions(theatreId)
  const tomorrow = new Date(new Date(date + 'T00:00:00').getTime() + 86400000)
  const tomorrowLabel = tomorrow.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
  const catering = cateringBase.items.length > 0 ? { ...cateringBase, tomorrowLabel } : null

  return {
    theatreName, date, shows,
    foodTotal, popcornTotal, mainCounterTotal, coolDrinksTotal,
    parkingExpected, parkingReported, parkingGap,
    topItems, expenses, bCash, vsYesterday,
    grossProfit, profitMargin,
    itemIntel, catering, parking,
  }
}
