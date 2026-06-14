import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  computeShowTotal, computeDayTotal, computeBCash,
  calcParkingExpected, calcParkingGap,
} from '@/lib/calculations'
import { loadSlipDataForShows } from '@/lib/loadSlipData'
import { sumBySale, sumByCost, getWastageItems, MC_PRICE, PC_PRICE, CD_PRICE, MC_COST, PC_COST, CD_COST, MC_NAME, PC_NAME, CD_NAME } from '@/lib/insightsQueries'
import { generateDayReportPdf } from '@/lib/pdfReport'
import { toNum } from '@/lib/utils'
import {
  emptyCash, emptyExp, emptyUpi, inrFmt,
  type CashState, type ExpState, type ShowSummary, type StaffRow, type UpiState,
} from '@/components/dayclose/types'
import DayCloseHeader from '@/components/dayclose/DayCloseHeader'
import ShowSummaryTable from '@/components/dayclose/ShowSummaryTable'
import ParkingSummaryTable from '@/components/dayclose/ParkingSummaryTable'
import WastageTable from '@/components/dayclose/WastageTable'
import UpiBreakdownForm from '@/components/dayclose/UpiBreakdownForm'
import CashBreakdownForm from '@/components/dayclose/CashBreakdownForm'
import ExpensesForm from '@/components/dayclose/ExpensesForm'
import StaffWagesForm from '@/components/dayclose/StaffWagesForm'
import ActionButtons from '@/components/dayclose/ActionButtons'
import BCashBar from '@/components/dayclose/BCashBar'

export default function DayClosePage() {
  const { theatreId, date } = useParams<{ theatreId: string; date: string }>()
  const [searchParams] = useSearchParams()
  // readOnly is URL-based — not server-enforced. Acceptable for single-user app; known limitation.
  const readOnly = searchParams.get('readOnly') === 'true'
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [theatreName, setTheatreName] = useState('')
  const [dayId, setDayId] = useState<string | null>(null)
  const [showSummaries, setShowSummaries] = useState<ShowSummary[]>([])
  const [wastageItems, setWastageItems] = useState<{ section: string; name: string; qty: number; cost: number }[]>([])

  const [upi, setUpi] = useState<UpiState>(emptyUpi)
  const [cash, setCash] = useState<CashState>(emptyCash)
  const [exp, setExp] = useState<ExpState>(emptyExp)
  const [othersDesc, setOthersDesc] = useState('')
  const [staffRows, setStaffRows] = useState<StaffRow[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  const setUpiField = (key: keyof UpiState, val: string) => setUpi(u => ({ ...u, [key]: val }))
  const setCashField = (key: keyof CashState, val: string) => setCash(c => ({ ...c, [key]: val }))
  const setExpField = (key: keyof ExpState, val: string) => setExp(e => ({ ...e, [key]: val }))

  // Live-computed totals — these update as the user types
  const totalSales = computeDayTotal(showSummaries.map(s => s.showTotal))
  const totalProfit = showSummaries.reduce((s, v) => s + v.showProfit, 0)
  const costOfGoods = totalSales - totalProfit
  const totalUpi = toNum(upi.popcornUpi) + toNum(upi.mcUpi) + toNum(upi.cdUpi) + toNum(upi.lcUpi) + toNum(upi.bmsUpi) + toNum(upi.parkingUpi)
  const totalCash = [cash.popcornCash, cash.mcCash, cash.cdCash, cash.lcCash, cash.parkingCash].reduce((s, v) => s + toNum(v), 0)
  const expObj = {
    wages: toNum(exp.wages),
    staff_coffee: toNum(exp.staffCoffee),
    water_cans: toNum(exp.waterCans),
    lab_food: toNum(exp.labFood),
    wastage: toNum(exp.wastage),
    others_amount: toNum(exp.othersAmount),
  }
  const totalExpenses = Object.values(expObj).reduce((s, v) => s + v, 0)
  const netProfit = totalProfit - totalExpenses
  // B.Cash uses theatre_expenses.wages only — staff wage rows are breakdown only, not additive
  const bCash = computeBCash(totalSales, expObj)
  const staffWagesTotal = staffRows.reduce((s, r) => s + toNum(r.amount), 0)

  useEffect(() => {
    if (!theatreId || !date) return
    async function load() {
      const { data: theatre } = await supabase
        .from('theatre_theatres').select('name').eq('id', theatreId!).single()
      setTheatreName(theatre?.name ?? '')

      const { data: day } = await supabase
        .from('theatre_days').select('id')
        .eq('theatre_id', theatreId!).eq('date', date!).maybeSingle()
      if (!day) { setLoading(false); return }
      setDayId(day.id)

      const { data: shows } = await supabase
        .from('theatre_shows')
        .select('id,show_number,start_time,movie_name,box_tickets,gold_tickets,silver_tickets,ticket_count,occupancy_pct')
        .eq('day_id', day.id).order('show_number')
      if (!shows?.length) { setLoading(false); return }

      const showIds = shows.map(s => s.id)
      const [{ mc: mcRows, pc: pcRows, cd: cdRows, parking: pkRows }, expRes, swRes] = await Promise.all([
        loadSlipDataForShows(showIds),
        supabase.from('theatre_expenses').select('*').eq('day_id', day.id).maybeSingle(),
        supabase.from('theatre_staff_wages').select('id,staff_name,amount').eq('day_id', day.id),
      ])

      type McR = Record<string, unknown> & { show_id: string; upi_amount: number; cash_amount: number }
      type PcR = Record<string, unknown> & { show_id: string; upi_amount: number; cash_amount: number; bms_combo_amount: number }
      type CdR = Record<string, unknown> & { show_id: string; upi_amount: number; cash_amount: number; live_upi_amount: number; live_cash_amount: number }
      type PkR = Record<string, unknown> & { show_id: string; scooter_count: number; auto_count: number; car_count: number; upi_amount: number | null; cash_amount: number | null }

      const mcMap = Object.fromEntries((mcRows as McR[]).map(r => [r.show_id, r]))
      const pcMap = Object.fromEntries((pcRows as PcR[]).map(r => [r.show_id, r]))
      const cdMap = Object.fromEntries((cdRows as CdR[]).map(r => [r.show_id, r]))
      const pkMap = Object.fromEntries((pkRows as PkR[]).map(r => [r.show_id, r]))

      const summaries: ShowSummary[] = shows.map(s => {
        const mc = mcMap[s.id], pc = pcMap[s.id], cd = cdMap[s.id], pk = pkMap[s.id]
        const mcTotal = sumBySale(mc ?? null, MC_PRICE)
        const popcornTotal = sumBySale(pc ?? null, PC_PRICE) + (Number(pc?.bms_combo_amount) || 0)
        const cdTotal = sumBySale(cd ?? null, CD_PRICE)
        const mcCost = sumByCost(mc ?? null, MC_COST)
        const pcCost = sumByCost(pc ?? null, PC_COST)
        const cdCost = sumByCost(cd ?? null, CD_COST)
        const parkingReported = (pk?.upi_amount ?? 0) + (pk?.cash_amount ?? 0)
        const scooter = pk?.scooter_count ?? 0, auto = pk?.auto_count ?? 0, car = pk?.car_count ?? 0
        const expected = calcParkingExpected(scooter, auto, car)
        const showProfit = (mcTotal + popcornTotal + cdTotal + expected) - (mcCost + pcCost + cdCost)
        return {
          showId: s.id, showNumber: s.show_number,
          startTime: s.start_time, movieName: s.movie_name,
          mcTotal, popcornTotal, cdTotal, parkingReported,
          showTotal: computeShowTotal(mcTotal, popcornTotal, cdTotal, expected),
          showProfit,
          isComplete: !!(mcMap[s.id] && pcMap[s.id] && cdMap[s.id]),
          scooterCount: scooter, autoCount: auto, carCount: car,
          parkingExpected: expected,
          parkingGap: calcParkingGap(expected, parkingReported),
          parkingMissing: pk === undefined || (pk.upi_amount === null && pk.cash_amount === null),
          boxTickets: s.box_tickets ?? 0,
          goldTickets: s.gold_tickets ?? 0,
          silverTickets: s.silver_tickets ?? 0,
          ticketCount: s.ticket_count ?? 0,
          occupancyPct: s.occupancy_pct ?? 0,
        }
      })
      setShowSummaries(summaries)

      const mcRowsForWastage = shows.map(sh => mcMap[sh.id] ?? null)
      const pcRowsForWastage = shows.map(sh => pcMap[sh.id] ?? null)
      const cdRowsForWastage = shows.map(sh => cdMap[sh.id] ?? null)
      setWastageItems([
        ...getWastageItems(mcRowsForWastage, MC_COST, MC_NAME, 'Main Counter'),
        ...getWastageItems(pcRowsForWastage, PC_COST, PC_NAME, 'Popcorn'),
        ...getWastageItems(cdRowsForWastage, CD_COST, CD_NAME, 'Cool Drinks'),
      ])

      // Auto-populate UPI fields from slip data — summed across all shows
      const autoMcUpi = shows.reduce((s, sh) => s + (mcMap[sh.id]?.upi_amount || 0), 0)
      const autoPopcornUpi = shows.reduce((s, sh) => s + (pcMap[sh.id]?.upi_amount || 0), 0)
      const autoCdUpi = shows.reduce((s, sh) => s + (cdMap[sh.id]?.upi_amount || 0), 0)
      const autoBmsUpi = shows.reduce((s, sh) => s + (pcMap[sh.id]?.bms_combo_amount || 0), 0)
      const autoMcCash = shows.reduce((s, sh) => s + (mcMap[sh.id]?.cash_amount || 0), 0)
      const autoPopcornCash = shows.reduce((s, sh) => s + (pcMap[sh.id]?.cash_amount || 0), 0)
      const autoCdCash = shows.reduce((s, sh) => s + (cdMap[sh.id]?.cash_amount || 0), 0)
      const autoParkingUpi = shows.reduce((s, sh) => s + (pkMap[sh.id]?.upi_amount || 0), 0)
      const autoParkingCash = shows.reduce((s, sh) => s + (pkMap[sh.id]?.cash_amount || 0), 0)
      const autoLcUpi = shows.reduce((s, sh) => s + (cdMap[sh.id]?.live_upi_amount || 0), 0)
      const autoLcCash = shows.reduce((s, sh) => s + (cdMap[sh.id]?.live_cash_amount || 0), 0)

      // Pre-fill existing expenses if day was previously closed
      const e = expRes.data as Record<string, unknown> | null
      if (e) setIsSaved(true)
      if (e) {
        setExp({
          wages: e.wages?.toString() ?? '',
          staffCoffee: e.staff_coffee?.toString() ?? '',
          waterCans: e.water_cans?.toString() ?? '',
          labFood: e.lab_food?.toString() ?? '',
          wastage: e.wastage?.toString() ?? '',
          othersAmount: e.others_amount?.toString() ?? '',
        })
        setOthersDesc((e.others_description as string) ?? '')
        // Use saved value if non-zero; fall back to auto-computed from slip data
        const sv = (key: string, auto: number) => {
          const saved = Number(e[key]) || 0
          return saved > 0 ? String(saved) : auto > 0 ? String(auto) : ''
        }
        setUpi({
          mcUpi:       sv('main_counter_upi', autoMcUpi),
          popcornUpi:  sv('popcorn_upi',      autoPopcornUpi),
          cdUpi:       sv('cool_drink_upi',   autoCdUpi),
          bmsUpi:      sv('bms_upi',          autoBmsUpi),
          lcUpi:       sv('live_counter_upi', autoLcUpi),
          parkingUpi:  sv('parking_upi',      autoParkingUpi),
        })
        setCash({
          mcCash:      sv('main_counter_cash', autoMcCash),
          popcornCash: sv('popcorn_cash',      autoPopcornCash),
          cdCash:      sv('cool_drink_cash',   autoCdCash),
          lcCash:      sv('live_counter_cash', autoLcCash),
          parkingCash: sv('parking_cash',      autoParkingCash),
        })
      } else {
        // First time on this day — pre-fill entirely from slip data
        setUpi({
          mcUpi:      autoMcUpi      > 0 ? String(autoMcUpi)      : '',
          popcornUpi: autoPopcornUpi > 0 ? String(autoPopcornUpi) : '',
          cdUpi:      autoCdUpi      > 0 ? String(autoCdUpi)      : '',
          bmsUpi:     autoBmsUpi     > 0 ? String(autoBmsUpi)     : '',
          lcUpi:      autoLcUpi      > 0 ? String(autoLcUpi)      : '',
          parkingUpi: autoParkingUpi > 0 ? String(autoParkingUpi) : '',
        })
        setCash({
          mcCash:      autoMcCash      > 0 ? String(autoMcCash)      : '',
          popcornCash: autoPopcornCash > 0 ? String(autoPopcornCash) : '',
          cdCash:      autoCdCash      > 0 ? String(autoCdCash)      : '',
          lcCash:      autoLcCash      > 0 ? String(autoLcCash)      : '',
          parkingCash: autoParkingCash > 0 ? String(autoParkingCash) : '',
        })
      }

      type SwR = { id: string; staff_name: string; amount: number }
      const sw = (swRes.data ?? []) as SwR[]
      if (sw.length) {
        setStaffRows(sw.map(w => ({ tempId: w.id, name: w.staff_name ?? '', amount: w.amount?.toString() ?? '' })))
      }

      setLoading(false)
    }
    load()
  }, [theatreId, date])

  async function handleSave() {
    if (!dayId) return
    setSaving(true)
    // wages field comes directly from the Expenses form input — never derived by summing staff wage rows
    await supabase.from('theatre_expenses').upsert({
      day_id: dayId,
      wages: toNum(exp.wages),
      staff_coffee: toNum(exp.staffCoffee),
      water_cans: toNum(exp.waterCans),
      lab_food: toNum(exp.labFood),
      wastage: toNum(exp.wastage),
      others_description: othersDesc,
      others_amount: toNum(exp.othersAmount),
      popcorn_upi: toNum(upi.popcornUpi),
      main_counter_upi: toNum(upi.mcUpi),
      cool_drink_upi: toNum(upi.cdUpi),
      live_counter_upi: toNum(upi.lcUpi),
      bms_upi: toNum(upi.bmsUpi),
      parking_upi: toNum(upi.parkingUpi),
      popcorn_cash: toNum(cash.popcornCash),
      main_counter_cash: toNum(cash.mcCash),
      cool_drink_cash: toNum(cash.cdCash),
      live_counter_cash: toNum(cash.lcCash),
      parking_cash: toNum(cash.parkingCash),
    }, { onConflict: 'day_id' })

    // Replace staff wages in full (delete + reinsert)
    await supabase.from('theatre_staff_wages').delete().eq('day_id', dayId)
    const valid = staffRows.filter(r => r.name.trim())
    if (valid.length) {
      await supabase.from('theatre_staff_wages').insert(
        valid.map(r => ({ day_id: dayId, staff_name: r.name.trim(), amount: toNum(r.amount) }))
      )
    }

    setSaving(false)
    setIsSaved(true)
    setToast('✓ Saved')
    setTimeout(() => setToast(''), 2500)
  }

  async function downloadDayReport() {
    await generateDayReportPdf({
      theatreName, date: date!, showSummaries, totalSales, totalExpenses, bCash,
      exp, othersDesc, staffRows,
    })
  }

  const displayDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    : ''

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      paddingBottom: 140,
    }}>
      <DayCloseHeader
        theatreId={theatreId} date={date} theatreName={theatreName}
        displayDate={displayDate} readOnly={readOnly} toast={toast}
      />

      <div style={{ padding: '18px 18px 0' }}>
        <ShowSummaryTable showSummaries={showSummaries} totalSales={totalSales} theatreId={theatreId} date={date} />
        <WastageTable wastageItems={wastageItems} />
        <ParkingSummaryTable showSummaries={showSummaries} />
        <UpiBreakdownForm upi={upi} totalUpi={totalUpi} readOnly={readOnly} onChange={setUpiField} />
        <CashBreakdownForm cash={cash} totalCash={totalCash} readOnly={readOnly} onChange={setCashField} />
        <ExpensesForm exp={exp} othersDesc={othersDesc} readOnly={readOnly} onExpChange={setExpField} onOthersDescChange={setOthersDesc} />
        <StaffWagesForm staffRows={staffRows} setStaffRows={setStaffRows} readOnly={readOnly} staffWagesTotal={staffWagesTotal} />

        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-card)',
          border: '1px solid var(--card-border)', marginTop: 16, marginBottom: 20, padding: '14px 14px 12px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--muted)',
            letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            NET PROFIT
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Gross Revenue</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)' }}>
              ₹{inrFmt.format(totalSales)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Cost of Goods</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)' }}>
              ₹{inrFmt.format(costOfGoods)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Gross Profit</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)' }}>
              ₹{inrFmt.format(totalProfit)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total Expenses</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)' }}>
              ₹{inrFmt.format(totalExpenses)}
            </span>
          </div>
          <div style={{ height: 1, background: 'var(--card-border)', marginBottom: 8 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Net Profit</span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700,
              color: netProfit >= 0 ? 'var(--accent)' : 'var(--red)',
            }}>
              ₹{inrFmt.format(netProfit)}
            </span>
          </div>
        </div>

        <ActionButtons
          readOnly={readOnly} saving={saving} isSaved={isSaved}
          onSave={handleSave} onDownload={downloadDayReport}
          onGenerateSummary={() => navigate(`/summary/${theatreId}/${date}`, { state: { readOnly } })}
        />
      </div>

      <BCashBar totalSales={totalSales} totalExpenses={totalExpenses} bCash={bCash} />
    </div>
  )
}
