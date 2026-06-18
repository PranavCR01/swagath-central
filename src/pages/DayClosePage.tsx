import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  computeShowTotal, computeDayTotal, computeBCash,
  calcParkingExpected,
} from '@/lib/calculations'
import { loadSlipDataForShows } from '@/lib/loadSlipData'
import { sumBySale, sumByCost, getWastageItems, MC_PRICE, PC_PRICE, CD_DRINKS_PRICE, CD_LIVE_PRICE, MC_COST, PC_COST, CD_COST, MC_NAME, PC_NAME, CD_NAME } from '@/lib/insightsQueries'
import { generateDayReportPdf } from '@/lib/pdfReport'
import { toNum } from '@/lib/utils'
import {
  emptyCash, emptyExp, emptyUpi, inrFmt,
  type CashState, type ExpState, type OthersRow, type ShowSummary, type StaffRow, type UpiState,
} from '@/components/dayclose/types'
import { NumberInput, SectionHeader } from '@/components/dayclose/DayCloseShared'
import DayCloseHeader from '@/components/dayclose/DayCloseHeader'
import ShowSummaryTable from '@/components/dayclose/ShowSummaryTable'
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
  const [othersRows, setOthersRows] = useState<OthersRow[]>([{ tempId: crypto.randomUUID(), description: '', amount: '' }])
  const [staffRows, setStaffRows] = useState<StaffRow[]>([])
  const [bmsAmount, setBmsAmount] = useState('')
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
  const totalUpi = toNum(upi.popcornUpi) + toNum(upi.mcUpi) + toNum(upi.cdUpi) + toNum(upi.lcUpi) + toNum(upi.parkingUpi)
  const totalCash = [cash.popcornCash, cash.mcCash, cash.cdCash, cash.lcCash, cash.parkingCash].reduce((s, v) => s + toNum(v), 0)
  const othersTotal = othersRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const expObj = {
    wages: toNum(exp.wages),
    staff_coffee: toNum(exp.staffCoffee),
    water_cans: toNum(exp.waterCans),
    lab_food: toNum(exp.labFood),
    wastage: toNum(exp.wastage),
    others_amount: othersTotal,
  }
  const totalExpenses = Object.values(expObj).reduce((s, v) => s + v, 0)
  const netProfit = totalProfit - totalExpenses
  // B.Cash uses theatre_expenses.wages only — staff wage rows are breakdown only, not additive
  const bCash = computeBCash(totalSales, expObj)
  const staffWagesTotal = staffRows.reduce((s, r) => s + toNum(r.amount), 0)

  function addOthersRow() { setOthersRows(rs => [...rs, { tempId: crypto.randomUUID(), description: '', amount: '' }]) }
  function removeOthersRow(tempId: string) { setOthersRows(rs => rs.filter(r => r.tempId !== tempId)) }
  function updateOthersRow(tempId: string, field: 'description' | 'amount', val: string) {
    setOthersRows(rs => rs.map(r => r.tempId === tempId ? { ...r, [field]: val } : r))
  }

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
      const [{ mc: mcRows, pc: pcRows, cd: cdRows, parking: pkRows }, expRes, swRes, othersRes] = await Promise.all([
        loadSlipDataForShows(showIds),
        supabase.from('theatre_expenses').select('*').eq('day_id', day.id).maybeSingle(),
        supabase.from('theatre_staff_wages').select('id,staff_name,amount').eq('day_id', day.id),
        supabase.from('theatre_expense_others').select('*').eq('day_id', day.id),
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
        const popcornTotal = sumBySale(pc ?? null, PC_PRICE)
        const cdDrinksTotal = sumBySale(cd ?? null, CD_DRINKS_PRICE)
        const cdLiveTotal = sumBySale(cd ?? null, CD_LIVE_PRICE)
        const mcCost = sumByCost(mc ?? null, MC_COST)
        const pcCost = sumByCost(pc ?? null, PC_COST)
        const cdCost = sumByCost(cd ?? null, CD_COST)
        const parkingReported = (pk?.upi_amount ?? 0) + (pk?.cash_amount ?? 0)
        const scooter = pk?.scooter_count ?? 0, auto = pk?.auto_count ?? 0, car = pk?.car_count ?? 0
        const expected = calcParkingExpected(scooter, auto, car)
        const showProfit = (mcTotal + popcornTotal + cdDrinksTotal + cdLiveTotal + expected) - (mcCost + pcCost + cdCost)
        return {
          showId: s.id, showNumber: s.show_number,
          startTime: s.start_time, movieName: s.movie_name,
          mcTotal, popcornTotal, cdDrinksTotal, cdLiveTotal, parkingReported,
          showTotal: computeShowTotal(mcTotal, popcornTotal, cdDrinksTotal + cdLiveTotal, expected),
          showProfit,
          isComplete: !!(mcMap[s.id] && pcMap[s.id] && cdMap[s.id]),
          scooterCount: scooter, autoCount: auto, carCount: car,
          parkingExpected: expected,
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
      const autoBmsAmount = shows.reduce((s, sh) => s + (pcMap[sh.id]?.bms_combo_amount || 0), 0)
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
        })
        const othersResData = (othersRes.data ?? []) as { description: string; amount: number }[]
        if (othersResData.length) {
          setOthersRows(othersResData.map(r => ({ tempId: crypto.randomUUID(), description: r.description, amount: String(r.amount) })))
        } else if (e.others_description || Number(e.others_amount)) {
          setOthersRows([{ tempId: crypto.randomUUID(), description: (e.others_description as string) ?? '', amount: e.others_amount?.toString() ?? '' }])
        }
        // Prefer live slip-computed value; fall back to saved only when live is zero (e.g. slip not yet entered)
        const sv = (key: string, auto: number) => {
          if (auto > 0) return String(auto)
          const saved = Number(e[key]) || 0
          return saved > 0 ? String(saved) : ''
        }
        setUpi({
          mcUpi:       sv('main_counter_upi', autoMcUpi),
          popcornUpi:  sv('popcorn_upi',      autoPopcornUpi),
          cdUpi:       sv('cool_drink_upi',   autoCdUpi),
          lcUpi:       sv('live_counter_upi', autoLcUpi),
          parkingUpi:  sv('parking_upi',      autoParkingUpi),
        })
        setBmsAmount(sv('bms_amount', autoBmsAmount))
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
          lcUpi:      autoLcUpi      > 0 ? String(autoLcUpi)      : '',
          parkingUpi: autoParkingUpi > 0 ? String(autoParkingUpi) : '',
        })
        setBmsAmount(autoBmsAmount > 0 ? String(autoBmsAmount) : '')
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
    const { error: expensesErr } = await supabase.from('theatre_expenses').upsert({
      day_id: dayId,
      wages: toNum(exp.wages),
      staff_coffee: toNum(exp.staffCoffee),
      water_cans: toNum(exp.waterCans),
      lab_food: toNum(exp.labFood),
      wastage: toNum(exp.wastage),
      others_description: '',
      others_amount: 0,
      popcorn_upi: toNum(upi.popcornUpi),
      main_counter_upi: toNum(upi.mcUpi),
      cool_drink_upi: toNum(upi.cdUpi),
      live_counter_upi: toNum(upi.lcUpi),
      bms_amount: toNum(bmsAmount),
      parking_upi: toNum(upi.parkingUpi),
      popcorn_cash: toNum(cash.popcornCash),
      main_counter_cash: toNum(cash.mcCash),
      cool_drink_cash: toNum(cash.cdCash),
      live_counter_cash: toNum(cash.lcCash),
      parking_cash: toNum(cash.parkingCash),
    }, { onConflict: 'day_id' })
    if (expensesErr) {
      setSaving(false)
      setToast('Failed to save expenses')
      setTimeout(() => setToast(''), 2500)
      return
    }

    // Replace staff wages in full (delete + reinsert)
    const { error: wagesDeleteErr } = await supabase.from('theatre_staff_wages').delete().eq('day_id', dayId)
    if (wagesDeleteErr) {
      setSaving(false)
      setToast('Failed to save staff wages')
      setTimeout(() => setToast(''), 2500)
      return
    }
    const valid = staffRows.filter(r => r.name.trim())
    if (valid.length) {
      const { error: wagesInsertErr } = await supabase.from('theatre_staff_wages').insert(
        valid.map(r => ({ day_id: dayId, staff_name: r.name.trim(), amount: toNum(r.amount) }))
      )
      if (wagesInsertErr) {
        setSaving(false)
        setToast('Failed to save staff wages')
        setTimeout(() => setToast(''), 2500)
        return
      }
    }

    // Replace other expenses in full (delete + reinsert)
    const { error: othersDeleteErr } = await supabase.from('theatre_expense_others').delete().eq('day_id', dayId)
    if (othersDeleteErr) {
      setSaving(false)
      setToast('Failed to save other expenses')
      setTimeout(() => setToast(''), 2500)
      return
    }
    const validOthers = othersRows.filter(r => r.description.trim() || Number(r.amount))
    if (validOthers.length) {
      const { error: othersInsertErr } = await supabase.from('theatre_expense_others').insert(
        validOthers.map(r => ({ day_id: dayId, description: r.description.trim(), amount: Number(r.amount) || 0 }))
      )
      if (othersInsertErr) {
        setSaving(false)
        setToast('Failed to save other expenses')
        setTimeout(() => setToast(''), 2500)
        return
      }
    }

    setSaving(false)
    setIsSaved(true)
    setToast('✓ Saved')
    setTimeout(() => setToast(''), 2500)
  }

  async function downloadDayReport() {
    await generateDayReportPdf({
      theatreName, date: date!, showSummaries, totalSales, totalExpenses, bCash,
      exp, othersRows, staffRows, bmsAmount: toNum(bmsAmount),
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
        <UpiBreakdownForm upi={upi} totalUpi={totalUpi} readOnly={readOnly} onChange={setUpiField} />
        <CashBreakdownForm cash={cash} totalCash={totalCash} readOnly={readOnly} onChange={setCashField} />
        <ExpensesForm exp={exp} readOnly={readOnly} onExpChange={setExpField} />
        <StaffWagesForm staffRows={staffRows} setStaffRows={setStaffRows} readOnly={readOnly} staffWagesTotal={staffWagesTotal} />

        <SectionHeader label="Other Expenses" />
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-card)',
          border: '1px solid var(--card-border)', marginBottom: 20, padding: '14px 14px 10px',
        }}>
          {othersRows.length === 0 && readOnly && (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '6px 0 10px' }}>
              No other expenses recorded
            </div>
          )}
          {othersRows.map(row => (
            <div key={row.tempId} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <input
                value={row.description}
                onChange={e => updateOthersRow(row.tempId, 'description', e.target.value)}
                placeholder="Description"
                disabled={readOnly}
                style={{
                  flex: 1, height: 38, padding: '0 10px', boxSizing: 'border-box',
                  background: 'var(--input-bg)', border: '1.5px solid var(--input-border)',
                  borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none',
                  fontFamily: 'inherit', opacity: readOnly ? 0.6 : 1,
                }}
              />
              <NumberInput
                value={row.amount}
                onChange={v => updateOthersRow(row.tempId, 'amount', v)}
                disabled={readOnly}
                width={80}
                placeholder="0"
              />
              {!readOnly && (
                <button
                  onClick={() => removeOthersRow(row.tempId)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--red)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button
              onClick={addOthersRow}
              style={{
                width: '100%', height: 38, background: 'transparent',
                border: '1.5px dashed var(--input-border)', borderRadius: 8,
                color: 'var(--muted)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              + Add Other
            </button>
          )}
          {othersTotal > 0 && (
            <div style={{
              marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--card-border)',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Running Total</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>
                ₹{inrFmt.format(othersTotal)}
              </span>
            </div>
          )}
        </div>

        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-card)',
          border: '1px solid var(--card-border)', marginTop: 16, marginBottom: 20, padding: '14px 14px 12px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--muted)',
            letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            COLLECTED
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>UPI</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)' }}>
              ₹{inrFmt.format(totalUpi)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Cash</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)' }}>
              ₹{inrFmt.format(totalCash)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>BMS</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)' }}>
              ₹{inrFmt.format(toNum(bmsAmount))}
            </span>
          </div>
        </div>

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
