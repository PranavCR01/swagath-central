import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  computeSlipTotal, computeShowTotal, computeDayTotal, computeBCash,
  calcParkingExpected, calcParkingGap,
} from '@/lib/calculations'
import jsPDF from 'jspdf'

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const toNum = (s: string) => parseFloat(s) || 0

interface ShowSummary {
  showId: string
  showNumber: number
  startTime: string
  movieName: string
  mcTotal: number
  popcornTotal: number
  cdTotal: number
  parkingReported: number
  showTotal: number
  isComplete: boolean
  scooterCount: number
  autoCount: number
  carCount: number
  parkingExpected: number
  parkingGap: number
  parkingMissing: boolean
}

interface StaffRow { tempId: string; name: string; amount: string }

interface UpiState {
  popcornUpi: string; mcUpi: string; cdUpi: string; lcUpi: string; bmsUpi: string
}
interface ExpState {
  wages: string; staffCoffee: string; waterCans: string
  labFood: string; wastage: string; othersAmount: string
}

const emptyUpi: UpiState = { popcornUpi: '', mcUpi: '', cdUpi: '', lcUpi: '', bmsUpi: '' }
const emptyExp: ExpState = { wages: '', staffCoffee: '', waterCans: '', labFood: '', wastage: '', othersAmount: '' }

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

  const [upi, setUpi] = useState<UpiState>(emptyUpi)
  const [exp, setExp] = useState<ExpState>(emptyExp)
  const [othersDesc, setOthersDesc] = useState('')
  const [staffRows, setStaffRows] = useState<StaffRow[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const setUpiField = (key: keyof UpiState, val: string) => setUpi(u => ({ ...u, [key]: val }))
  const setExpField = (key: keyof ExpState, val: string) => setExp(e => ({ ...e, [key]: val }))

  // Live-computed totals — these update as the user types
  const totalSales = computeDayTotal(showSummaries.map(s => s.showTotal))
  const totalUpi = toNum(upi.popcornUpi) + toNum(upi.mcUpi) + toNum(upi.cdUpi) + toNum(upi.lcUpi) + toNum(upi.bmsUpi)
  const expObj = {
    wages: toNum(exp.wages),
    staff_coffee: toNum(exp.staffCoffee),
    water_cans: toNum(exp.waterCans),
    lab_food: toNum(exp.labFood),
    wastage: toNum(exp.wastage),
    others_amount: toNum(exp.othersAmount),
  }
  const totalExpenses = Object.values(expObj).reduce((s, v) => s + v, 0)
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
        .select('id,show_number,start_time,movie_name')
        .eq('day_id', day.id).order('show_number')
      if (!shows?.length) { setLoading(false); return }

      const showIds = shows.map(s => s.id)
      const [mcRes, pcRes, cdRes, pkRes, expRes, swRes] = await Promise.all([
        supabase.from('theatre_main_counter').select('show_id,upi_amount,cash_amount').in('show_id', showIds),
        supabase.from('theatre_popcorn').select('show_id,upi_amount,cash_amount,bms_combo_amount').in('show_id', showIds),
        supabase.from('theatre_cool_drinks').select('show_id,upi_amount,cash_amount').in('show_id', showIds),
        supabase.from('theatre_parking').select('show_id,scooter_count,auto_count,car_count,reported_amount').in('show_id', showIds),
        supabase.from('theatre_expenses').select('*').eq('day_id', day.id).maybeSingle(),
        supabase.from('theatre_staff_wages').select('id,staff_name,amount').eq('day_id', day.id),
      ])

      type McR = { show_id: string; upi_amount: number; cash_amount: number }
      type PcR = { show_id: string; upi_amount: number; cash_amount: number; bms_combo_amount: number }
      type CdR = { show_id: string; upi_amount: number; cash_amount: number }
      type PkR = { show_id: string; scooter_count: number; auto_count: number; car_count: number; reported_amount: number | null }

      const mcMap = Object.fromEntries(((mcRes.data ?? []) as McR[]).map(r => [r.show_id, r]))
      const pcMap = Object.fromEntries(((pcRes.data ?? []) as PcR[]).map(r => [r.show_id, r]))
      const cdMap = Object.fromEntries(((cdRes.data ?? []) as CdR[]).map(r => [r.show_id, r]))
      const pkMap = Object.fromEntries(((pkRes.data ?? []) as PkR[]).map(r => [r.show_id, r]))

      const summaries: ShowSummary[] = shows.map(s => {
        const mc = mcMap[s.id], pc = pcMap[s.id], cd = cdMap[s.id], pk = pkMap[s.id]
        const mcTotal = mc ? computeSlipTotal(mc.upi_amount || 0, mc.cash_amount || 0) : 0
        const popcornTotal = pc ? computeSlipTotal(pc.upi_amount || 0, pc.cash_amount || 0) + (pc.bms_combo_amount || 0) : 0
        const cdTotal = cd ? computeSlipTotal(cd.upi_amount || 0, cd.cash_amount || 0) : 0
        const parkingReported = pk?.reported_amount ?? 0
        const scooter = pk?.scooter_count ?? 0, auto = pk?.auto_count ?? 0, car = pk?.car_count ?? 0
        const expected = calcParkingExpected(scooter, auto, car)
        return {
          showId: s.id, showNumber: s.show_number,
          startTime: s.start_time, movieName: s.movie_name,
          mcTotal, popcornTotal, cdTotal, parkingReported,
          showTotal: computeShowTotal(mcTotal, popcornTotal, cdTotal, parkingReported),
          isComplete: !!(mcMap[s.id] && pcMap[s.id] && cdMap[s.id]),
          scooterCount: scooter, autoCount: auto, carCount: car,
          parkingExpected: expected,
          parkingGap: calcParkingGap(expected, parkingReported),
          parkingMissing: pk === undefined || pk.reported_amount === null,
        }
      })
      setShowSummaries(summaries)

      // Auto-populate UPI fields from slip data — summed across all shows
      const autoMcUpi = shows.reduce((s, sh) => s + (mcMap[sh.id]?.upi_amount || 0), 0)
      const autoPopcornUpi = shows.reduce((s, sh) => s + (pcMap[sh.id]?.upi_amount || 0), 0)
      const autoCdUpi = shows.reduce((s, sh) => s + (cdMap[sh.id]?.upi_amount || 0), 0)
      const autoBmsUpi = shows.reduce((s, sh) => s + (pcMap[sh.id]?.bms_combo_amount || 0), 0)

      // Pre-fill existing expenses if day was previously closed
      const e = expRes.data as Record<string, unknown> | null
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
          lcUpi:       e.live_counter_upi ? String(e.live_counter_upi) : '',
        })
      } else {
        // First time on this day — pre-fill entirely from slip data
        setUpi({
          mcUpi:      autoMcUpi      > 0 ? String(autoMcUpi)      : '',
          popcornUpi: autoPopcornUpi > 0 ? String(autoPopcornUpi) : '',
          cdUpi:      autoCdUpi      > 0 ? String(autoCdUpi)      : '',
          bmsUpi:     autoBmsUpi     > 0 ? String(autoBmsUpi)     : '',
          lcUpi:      '',
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
    setToast('✓ Saved')
    setTimeout(() => setToast(''), 2500)
  }

  function downloadDayReport() {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    const W = 210
    const M = 14
    let y = 0

    // Dark header
    doc.setFillColor(10, 10, 15)
    doc.rect(0, 0, W, 30, 'F')
    doc.setTextColor(245, 158, 11)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('SWAGATH ENTERPRISES — DAILY REPORT', W / 2, 12, { align: 'center' })
    doc.setFontSize(9)
    doc.setTextColor(200, 200, 210)
    const displayDatePDF = date
      ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        })
      : ''
    doc.text(`${theatreName}  ·  ${displayDatePDF}`, W / 2, 22, { align: 'center' })
    y = 38

    const rule = () => {
      doc.setDrawColor(60, 60, 80); doc.setLineWidth(0.3)
      doc.line(M, y, W - M, y); y += 5
    }
    const sectionHdr = (title: string) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.setTextColor(180, 120, 0); doc.text(title, M, y); y += 6
    }

    // Show summary
    sectionHdr('SHOW SUMMARY')
    const cols = [M, M + 10, M + 72, M + 96, M + 120, M + 144, M + 164]
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(90, 90, 110)
    ;['#', 'Movie', 'MC', 'Popcorn', 'CDs', 'Parking', 'Total'].forEach((h, i) => doc.text(h, cols[i], y))
    y += 5; rule()

    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 40)
    for (const s of showSummaries) {
      doc.text(String(s.showNumber), cols[0], y)
      doc.text(s.movieName.substring(0, 22), cols[1], y)
      doc.text('₹' + inrFmt.format(s.mcTotal), cols[2], y)
      doc.text('₹' + inrFmt.format(s.popcornTotal), cols[3], y)
      doc.text('₹' + inrFmt.format(s.cdTotal), cols[4], y)
      doc.text('₹' + inrFmt.format(s.parkingReported), cols[5], y)
      doc.text('₹' + inrFmt.format(s.showTotal), cols[6], y)
      y += 6
    }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 120, 0)
    doc.text('Total Sales', cols[5], y)
    doc.text('₹' + inrFmt.format(totalSales), cols[6], y)
    y += 10

    // Parking summary
    sectionHdr('PARKING SUMMARY')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 30, 40)
    for (const s of showSummaries) {
      doc.text(
        `Show ${s.showNumber}  Scooter:${s.scooterCount}  Auto:${s.autoCount}  Car:${s.carCount}  ` +
        `Expected:₹${inrFmt.format(s.parkingExpected)}  Reported:₹${inrFmt.format(s.parkingReported)}  Gap:₹${inrFmt.format(s.parkingGap)}`,
        M, y, { maxWidth: W - M * 2 }
      )
      y += 6
    }
    y += 4

    // Expenses
    sectionHdr('EXPENSES')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 30, 40)
    const expParts = [
      `Wages ₹${inrFmt.format(toNum(exp.wages))}`,
      `Staff Coffee ₹${inrFmt.format(toNum(exp.staffCoffee))}`,
      `Water Cans ₹${inrFmt.format(toNum(exp.waterCans))}`,
      `Lab Food ₹${inrFmt.format(toNum(exp.labFood))}`,
      `Wastage ₹${inrFmt.format(toNum(exp.wastage))}`,
      ...(othersDesc ? [`Others (${othersDesc}) ₹${inrFmt.format(toNum(exp.othersAmount))}`] : []),
    ]
    doc.text(expParts.join('  ·  '), M, y, { maxWidth: W - M * 2 })
    y += 10
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Expenses  ₹${inrFmt.format(totalExpenses)}`, M, y)
    y += 10

    // Staff wages
    const validStaff = staffRows.filter(r => r.name.trim())
    if (validStaff.length) {
      sectionHdr('STAFF WAGES')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 30, 40)
      doc.text(validStaff.map(r => `${r.name} ₹${inrFmt.format(toNum(r.amount))}`).join('  ·  '), M, y, { maxWidth: W - M * 2 })
      y += 10
    }

    // Footer
    rule()
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 40)
    doc.text('Total Sales:', M, y); doc.text('₹' + inrFmt.format(totalSales), M + 60, y); y += 7
    doc.text('Total Expenses:', M, y); doc.text('₹' + inrFmt.format(totalExpenses), M + 60, y); y += 7
    if (bCash > 0) doc.setTextColor(0, 150, 0)
    else if (bCash < 0) doc.setTextColor(200, 0, 0)
    else doc.setTextColor(180, 120, 0)
    doc.text('Balance Cash:', M, y); doc.text('₹' + inrFmt.format(bCash), M + 60, y)

    doc.save(`${theatreName.replace(/\s+/g, '_')}_${date}.pdf`)
  }

  const fmtTime = (t: string) => {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
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
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--green)', color: '#fff',
          padding: '10px 22px', borderRadius: 12, fontWeight: 600, fontSize: 14,
          zIndex: 200, boxShadow: '0 4px 20px rgba(34,197,94,0.4)', whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', borderBottom: '1px solid var(--card-border)',
        background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            onClick={() => navigate(`/theatre/${theatreId}/day/${date}`)}
            style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'var(--surface)', border: '1px solid var(--card-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
              {readOnly ? 'Day Report' : 'Close Day'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{theatreName} · {displayDate}</div>
          </div>
        </div>
        {readOnly && (
          <button
            onClick={() => navigate(`/theatre/${theatreId}/day/${date}`)}
            style={{
              height: 36, padding: '0 16px',
              background: 'transparent', border: '1.5px solid var(--accent)',
              borderRadius: 10, color: 'var(--accent)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Edit Day
          </button>
        )}
      </div>

      <div style={{ padding: '18px 18px 0' }}>

        {/* Section 1 — Show Summary */}
        <SectionHeader label="Show Summary" />
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-card)',
          border: '1px solid var(--card-border)', marginBottom: 20, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '24px 1fr 58px 56px 54px 58px 66px',
            gap: 4, padding: '9px 12px',
            background: 'var(--surface-2)', borderBottom: '1px solid var(--card-border)',
          }}>
            {['#', 'Movie', 'MC', 'Pop', 'CDs', 'Park', 'Total'].map((h, i) => (
              <div key={h} style={{
                fontSize: 10, color: 'var(--muted)', fontWeight: 700,
                textAlign: i >= 2 ? 'right' : 'left', textTransform: 'uppercase', letterSpacing: '.04em',
              }}>{h}</div>
            ))}
          </div>

          {showSummaries.length === 0 ? (
            <div style={{ padding: '20px 12px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
              No shows entered yet
            </div>
          ) : showSummaries.map(s => (
            <div key={s.showId}>
              <div style={{
                display: 'grid', gridTemplateColumns: '24px 1fr 58px 56px 54px 58px 66px',
                gap: 4, padding: '9px 12px',
                borderBottom: '1px solid var(--card-border)', alignItems: 'center',
              }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{s.showNumber}</div>
                <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.movieName}
                </div>
                {[s.mcTotal, s.popcornTotal, s.cdTotal, s.parkingReported, s.showTotal].map((v, i) => (
                  <div key={i} style={{
                    fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'right',
                    color: i === 4 ? 'var(--accent)' : 'var(--text)', fontWeight: i === 4 ? 700 : 400,
                  }}>
                    {v > 0 ? inrFmt.format(v) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </div>
                ))}
              </div>
              {!s.isComplete && (
                <button
                  onClick={() => navigate(`/theatre/${theatreId}/day/${date}/show/${s.showId}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    width: '100%', padding: '6px 12px',
                    background: 'rgba(245,158,11,0.07)', border: 'none',
                    borderBottom: '1px solid var(--card-border)',
                    color: 'var(--accent)', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Show {s.showNumber} incomplete — tap to complete
                </button>
              )}
            </div>
          ))}

          {/* Grand total */}
          <div style={{
            display: 'grid', gridTemplateColumns: '24px 1fr 58px 56px 54px 58px 66px',
            gap: 4, padding: '9px 12px', background: 'var(--surface-2)',
          }}>
            <div />
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Grand Total</div>
            {[null, null, null, null, totalSales].map((v, i) => (
              <div key={i} style={{
                fontFamily: 'var(--mono)', fontSize: 13, textAlign: 'right',
                color: 'var(--accent)', fontWeight: 700,
              }}>
                {v !== null ? '₹' + inrFmt.format(v) : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Section 2 — Parking Summary */}
        <SectionHeader label="Parking Summary" />
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-card)',
          border: '1px solid var(--card-border)', marginBottom: 20, overflow: 'hidden',
        }}>
          {showSummaries.length === 0 ? (
            <div style={{ padding: '20px 12px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
              No shows yet
            </div>
          ) : showSummaries.map((s, idx) => (
            <div key={s.showId} style={{
              padding: '11px 14px',
              borderBottom: idx < showSummaries.length - 1 ? '1px solid var(--card-border)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                  Show {s.showNumber} · {fmtTime(s.startTime)}
                </span>
                {s.parkingMissing ? (
                  <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>not entered</span>
                ) : (
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700,
                    color: s.parkingGap > 0 ? 'var(--red)' : 'var(--green)',
                  }}>
                    Gap {s.parkingGap > 0 ? '+' : ''}{inrFmt.format(s.parkingGap)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11, color: 'var(--muted)' }}>
                <span>Scooter: <b style={{ color: 'var(--text)' }}>{s.scooterCount}</b></span>
                <span>Auto: <b style={{ color: 'var(--text)' }}>{s.autoCount}</b></span>
                <span>Car: <b style={{ color: 'var(--text)' }}>{s.carCount}</b></span>
                <span style={{ marginLeft: 'auto' }}>
                  Exp ₹{inrFmt.format(s.parkingExpected)} · Rep ₹{inrFmt.format(s.parkingReported)}
                </span>
              </div>
            </div>
          ))}
          {showSummaries.length > 0 && (
            <div style={{
              padding: '9px 14px', background: 'var(--surface-2)',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Total Reported</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
                ₹{inrFmt.format(showSummaries.reduce((s, r) => s + r.parkingReported, 0))}
              </span>
            </div>
          )}
        </div>

        {/* Section 3 — UPI Breakdown */}
        <SectionHeader label="UPI Breakdown" />
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-card)',
          border: '1px solid var(--card-border)', marginBottom: 20, padding: '14px 14px 10px',
        }}>
          {([
            ['Popcorn UPI', upi.popcornUpi, 'popcornUpi'],
            ['Main Counter UPI', upi.mcUpi, 'mcUpi'],
            ['Cool Drink UPI', upi.cdUpi, 'cdUpi'],
            ['Live Counter UPI', upi.lcUpi, 'lcUpi'],
            ['BMS UPI', upi.bmsUpi, 'bmsUpi'],
          ] as const).map(([label, val, key]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
              <NumberInput value={val} onChange={v => setUpiField(key, v)} disabled={readOnly} />
            </div>
          ))}
          <div style={{
            marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--card-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Total UPI</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>
              ₹{inrFmt.format(totalUpi)}
            </span>
          </div>
        </div>

        {/* Section 4 — Expenses */}
        <SectionHeader label="Expenses" />
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-card)',
          border: '1px solid var(--card-border)', marginBottom: 20, padding: '14px 14px 12px',
        }}>
          {([
            ['Wages', exp.wages, 'wages'],
            ['Staff Coffee', exp.staffCoffee, 'staffCoffee'],
            ['Water Cans', exp.waterCans, 'waterCans'],
            ['Lab Food', exp.labFood, 'labFood'],
            ['Wastage', exp.wastage, 'wastage'],
          ] as const).map(([label, val, key]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>₹</span>
                <NumberInput value={val} onChange={v => setExpField(key, v)} disabled={readOnly} />
              </div>
            </div>
          ))}
          {/* Others row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
            <span style={{ fontSize: 13, color: 'var(--text)', flexShrink: 0, width: 48 }}>Others</span>
            <input
              value={othersDesc}
              onChange={e => setOthersDesc(e.target.value)}
              placeholder="Description"
              disabled={readOnly}
              style={{
                flex: 1, height: 38, padding: '0 10px', boxSizing: 'border-box',
                background: 'var(--input-bg)', border: '1.5px solid var(--input-border)',
                borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none',
                fontFamily: 'inherit', opacity: readOnly ? 0.6 : 1,
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>₹</span>
            <NumberInput value={exp.othersAmount} onChange={v => setExpField('othersAmount', v)} disabled={readOnly} width={72} />
          </div>
        </div>

        {/* Section 5 — Staff Wages (breakdown only — NOT included in B.Cash) */}
        <SectionHeader label="Staff Wages" />
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-card)',
          border: '1px solid var(--card-border)', marginBottom: 20, padding: '14px 14px 10px',
        }}>
          {staffRows.length === 0 && readOnly && (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '6px 0 10px' }}>
              No staff wages recorded
            </div>
          )}
          {staffRows.map(row => (
            <div key={row.tempId} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <input
                value={row.name}
                onChange={e => setStaffRows(rs => rs.map(r => r.tempId === row.tempId ? { ...r, name: e.target.value } : r))}
                placeholder="Name"
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
                onChange={v => setStaffRows(rs => rs.map(r => r.tempId === row.tempId ? { ...r, amount: v } : r))}
                disabled={readOnly}
                width={80}
                placeholder="0"
              />
              {!readOnly && (
                <button
                  onClick={() => setStaffRows(rs => rs.filter(r => r.tempId !== row.tempId))}
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
              onClick={() => setStaffRows(rs => [...rs, { tempId: crypto.randomUUID(), name: '', amount: '' }])}
              style={{
                width: '100%', height: 38, background: 'transparent',
                border: '1.5px dashed var(--input-border)', borderRadius: 8,
                color: 'var(--muted)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              + Add Staff
            </button>
          )}
          {staffRows.length > 0 && (
            <div style={{
              marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--card-border)',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Running Total</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>
                ₹{inrFmt.format(staffWagesTotal)}
              </span>
            </div>
          )}
        </div>

        {/* Section 7 — Actions */}
        {!readOnly ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <button
              onClick={handleSave} disabled={saving}
              style={{
                height: 52, width: '100%',
                background: saving ? 'rgba(245,158,11,0.6)' : 'var(--accent)',
                color: 'var(--accent-ink)', border: 'none', borderRadius: 14,
                fontWeight: 650, fontSize: 16, cursor: saving ? 'default' : 'pointer',
                fontFamily: 'inherit', boxShadow: '0 6px 22px -8px var(--accent-glow)',
              }}
            >
              {saving ? 'Saving…' : 'Save Day Close'}
            </button>
            <button
              onClick={downloadDayReport}
              style={{
                height: 52, width: '100%', background: 'transparent', color: 'var(--text)',
                border: '1.5px solid var(--card-border)', borderRadius: 14,
                fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Download Day Report
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={downloadDayReport}
              style={{
                height: 52, width: '100%', background: 'transparent', color: 'var(--text)',
                border: '1.5px solid var(--card-border)', borderRadius: 14,
                fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Download Day Report
            </button>
          </div>
        )}
      </div>

      {/* Section 6 — Sticky bottom bar (live B.Cash) */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--surface)', borderTop: '1px solid var(--card-border)',
        padding: '12px 18px 20px', zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total Sales</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
            ₹{inrFmt.format(totalSales)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total Expenses</span>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
            color: totalExpenses > totalSales ? 'var(--red)' : 'var(--text)',
          }}>
            ₹{inrFmt.format(totalExpenses)}
          </span>
        </div>
        <div style={{ height: 1, background: 'var(--card-border)', marginBottom: 8 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Balance Cash</span>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700,
            color: bCash > 0 ? 'var(--green)' : bCash < 0 ? 'var(--red)' : 'var(--accent)',
          }}>
            ₹{inrFmt.format(bCash)}
          </span>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
    </div>
  )
}

function NumberInput({
  value, onChange, disabled, width, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  width?: number
  placeholder?: string
}) {
  const [focus, setFocus] = useState(false)
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={e => onChange(e.target.value.replace(/[^\d]/g, ''))}
      disabled={disabled}
      placeholder={placeholder ?? '0'}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width: width ?? 82, height: 38, padding: '0 8px', boxSizing: 'border-box',
        background: focus ? 'var(--input-bg-focus)' : 'var(--input-bg)',
        border: `1.5px solid ${focus ? 'var(--accent)' : 'var(--input-border)'}`,
        borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none',
        fontFamily: 'var(--mono)', textAlign: 'right',
        opacity: disabled ? 0.6 : 1,
        boxShadow: focus ? '0 0 0 3px var(--accent-ring)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
      }}
    />
  )
}
