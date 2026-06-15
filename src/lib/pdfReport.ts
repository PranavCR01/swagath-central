import jsPDF from 'jspdf'
import { MC_PRICE, MC_COST, MC_NAME, PC_PRICE, PC_COST, PC_NAME, CD_PRICE, CD_COST, CD_NAME, getWastageItems } from './insightsQueries'
import { loadSlipDataForShows } from './loadSlipData'
import { toNum } from './utils'
import { fmtTime, inrFmt, type ExpState, type OthersRow, type ShowSummary, type StaffRow } from '@/components/dayclose/types'

const ITEM_MAPS = [
  { price: MC_PRICE as Record<string, number>, cost: MC_COST as Record<string, number>, name: MC_NAME as Record<string, string> },
  { price: PC_PRICE as Record<string, number>, cost: PC_COST as Record<string, number>, name: PC_NAME as Record<string, string> },
  { price: CD_PRICE as Record<string, number>, cost: CD_COST as Record<string, number>, name: CD_NAME as Record<string, string> },
]

interface ItemSaleRow { name: string; units: number; wst: number; revenue: number; cost: number }

function itemRowsForShow(rows: (Record<string, unknown> | null)[]): ItemSaleRow[] {
  const out: ItemSaleRow[] = []
  ITEM_MAPS.forEach(({ price, cost, name }, i) => {
    const row = rows[i]
    if (!row) return
    for (const item in price) {
      const units = Number(row[`${item}_sale`]) || 0
      const wst = Number(row[`${item}_wst`]) || 0
      if (units <= 0 && wst <= 0) continue
      out.push({ name: name[item], units, wst, revenue: units * price[item], cost: (units + wst) * (cost[item] ?? 0) })
    }
  })
  return out.sort((a, b) => b.revenue - a.revenue)
}

export async function generateDayReportPdf({
  theatreName, date, showSummaries, totalSales, totalExpenses, bCash, exp, othersRows, staffRows,
}: {
  theatreName: string
  date: string
  showSummaries: ShowSummary[]
  totalSales: number
  totalExpenses: number
  bCash: number
  exp: ExpState
  othersRows: OthersRow[]
  staffRows: StaffRow[]
}) {
  const showIds = showSummaries.map(s => s.showId)
  const { mc: mcRows, pc: pcRows, cd: cdRows, parking: pkRows } = await loadSlipDataForShows(showIds)
  const mcMap = new Map(mcRows.map(r => [(r as Record<string, unknown>).show_id as string, r as Record<string, unknown>]))
  const pcMap = new Map(pcRows.map(r => [(r as Record<string, unknown>).show_id as string, r as Record<string, unknown>]))
  const cdMap = new Map(cdRows.map(r => [(r as Record<string, unknown>).show_id as string, r as Record<string, unknown>]))
  const pkMap = new Map(pkRows.map(r => [(r as Record<string, unknown>).show_id as string, r as Record<string, unknown>]))

  // gross profit / cost of goods across all of today's shows
  let costOfGoods = 0
  for (const s of showSummaries) {
    const rows = itemRowsForShow([mcMap.get(s.showId) ?? null, pcMap.get(s.showId) ?? null, cdMap.get(s.showId) ?? null])
    costOfGoods += rows.reduce((sum, r) => sum + r.cost, 0)
  }
  const grossProfit = totalSales - costOfGoods
  const profitMarginPct = totalSales > 0 ? Math.round((grossProfit / totalSales) * 100) : 0

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
  const checkPage = (needed = 10) => {
    if (y + needed > 285) { doc.addPage(); y = 20 }
  }
  const sectionHdr = (title: string) => {
    checkPage(12)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.setTextColor(180, 120, 0); doc.text(title, M, y); y += 6
  }

  // Show summary
  sectionHdr('SHOW SUMMARY')
  const cols = [M, M + 10, M + 56, M + 76, M + 94, M + 112, M + 130, M + 148, M + 168]
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(90, 90, 110)
  ;['#', 'Movie', 'MC', 'Popcorn', 'CDs', 'Live', 'BMS', 'Parking', 'Total'].forEach((h, i) => doc.text(h, cols[i], y))
  y += 5; rule()

  doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 40)
  for (const s of showSummaries) {
    const bmsAmount = Number(pcMap.get(s.showId)?.bms_combo_amount) || 0
    doc.text(String(s.showNumber), cols[0], y)
    doc.text(s.movieName.substring(0, 20), cols[1], y)
    doc.text('Rs.' + inrFmt.format(s.mcTotal), cols[2], y)
    doc.text('Rs.' + inrFmt.format(s.popcornTotal), cols[3], y)
    doc.text('Rs.' + inrFmt.format(s.cdDrinksTotal), cols[4], y)
    doc.text('Rs.' + inrFmt.format(s.cdLiveTotal), cols[5], y)
    doc.text('Rs.' + inrFmt.format(bmsAmount), cols[6], y)
    doc.text('Rs.' + inrFmt.format(s.parkingExpected), cols[7], y)
    doc.text('Rs.' + inrFmt.format(s.showTotal), cols[8], y)
    y += 6
  }
  doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 120, 0)
  doc.text('Total Sales', cols[7], y)
  doc.text('Rs.' + inrFmt.format(totalSales), cols[8], y)
  y += 10

  // Ticket breakdown
  sectionHdr('TICKET BREAKDOWN')
  const tCols = [M, M + 10, M + 62, M + 86, M + 108, M + 130, M + 152, M + 172]
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(90, 90, 110)
  ;['#', 'Movie', 'Time', 'Box', 'Gold', 'Silver', 'Total', 'Occ%'].forEach((h, i) => doc.text(h, tCols[i], y))
  y += 5; rule()

  doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 40)
  for (const s of showSummaries) {
    checkPage()
    const total = s.ticketCount || (s.boxTickets + s.goldTickets + s.silverTickets)
    doc.text(String(s.showNumber), tCols[0], y)
    doc.text(s.movieName.substring(0, 20), tCols[1], y)
    doc.text(fmtTime(s.startTime), tCols[2], y)
    doc.text(String(s.boxTickets), tCols[3], y)
    doc.text(String(s.goldTickets), tCols[4], y)
    doc.text(String(s.silverTickets), tCols[5], y)
    doc.text(String(total), tCols[6], y)
    doc.text(`${s.occupancyPct}%`, tCols[7], y)
    y += 6
  }
  y += 4

  // Parking summary
  sectionHdr('PARKING SUMMARY')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 30, 40)
  for (const s of showSummaries) {
    checkPage()
    doc.text(
      `Show ${s.showNumber}  Scooter:${s.scooterCount}  Auto:${s.autoCount}  Car:${s.carCount}  ` +
      `Total:Rs.${inrFmt.format(s.parkingExpected)}`,
      M, y, { maxWidth: W - M * 2 }
    )
    y += 6
  }
  y += 4

  // Item sales
  sectionHdr('ITEM SALES')
  const iCols = [M, M + 60, M + 90, M + 122, M + 152, M + 178]
  for (const s of showSummaries) {
    const itemRows = itemRowsForShow([mcMap.get(s.showId) ?? null, pcMap.get(s.showId) ?? null, cdMap.get(s.showId) ?? null])
    if (!itemRows.length) continue
    checkPage(16)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 40)
    doc.text(`Show ${s.showNumber} · ${s.movieName.substring(0, 30)}`, M, y)
    y += 5
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(90, 90, 110)
    ;['Item', 'Units', 'Revenue', 'Cost', 'Profit', 'Margin'].forEach((h, i) => doc.text(h, iCols[i], y, i > 0 ? { align: 'right' } : undefined))
    y += 4.5; rule()
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 40)
    for (const r of itemRows) {
      checkPage()
      const profit = r.revenue - r.cost
      const margin = r.revenue > 0 ? Math.round((profit / r.revenue) * 100) : 0
      doc.text(r.name.substring(0, 22), iCols[0], y)
      doc.text(String(r.units), iCols[1], y, { align: 'right' })
      doc.text('Rs.' + inrFmt.format(r.revenue), iCols[2], y, { align: 'right' })
      doc.text('Rs.' + inrFmt.format(r.cost), iCols[3], y, { align: 'right' })
      doc.text('Rs.' + inrFmt.format(profit), iCols[4], y, { align: 'right' })
      doc.text(`${margin}%`, iCols[5], y, { align: 'right' })
      y += 5.5
    }
    y += 4
  }

  // Wastage
  sectionHdr('WASTAGE')
  const mcRowsForWastage = showSummaries.map(s => mcMap.get(s.showId) ?? null)
  const pcRowsForWastage = showSummaries.map(s => pcMap.get(s.showId) ?? null)
  const cdRowsForWastage = showSummaries.map(s => cdMap.get(s.showId) ?? null)
  const wastageItems = [
    ...getWastageItems(mcRowsForWastage, MC_COST, MC_NAME, 'Main Counter'),
    ...getWastageItems(pcRowsForWastage, PC_COST, PC_NAME, 'Popcorn'),
    ...getWastageItems(cdRowsForWastage, CD_COST, CD_NAME, 'Cool Drinks'),
  ]
  if (wastageItems.length) {
    const wCols = [M, M + 100, M + 140]
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(90, 90, 110)
    ;['Item', 'Qty', 'Cost Loss'].forEach((h, i) => doc.text(h, wCols[i], y, i > 0 ? { align: 'right' } : undefined))
    y += 4.5; rule()
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 40)
    let totalWastageCost = 0
    let currentSection = ''
    for (const item of wastageItems) {
      checkPage()
      if (item.section !== currentSection) {
        currentSection = item.section
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(120, 120, 140)
        doc.text(currentSection, M, y)
        y += 5
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 30, 40)
      }
      doc.text(item.name.substring(0, 22), wCols[0], y)
      doc.text(String(item.qty), wCols[1], y, { align: 'right' })
      doc.text('Rs.' + inrFmt.format(item.cost), wCols[2], y, { align: 'right' })
      totalWastageCost += item.cost
      y += 5.5
    }
    y += 1
    doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 120, 0)
    doc.text('Total Cost Loss', wCols[0], y)
    doc.text('Rs.' + inrFmt.format(totalWastageCost), wCols[2], y, { align: 'right' })
    y += 10
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 30, 40)
    doc.text('No wastage recorded', M, y)
    y += 10
  }

  // Expenses
  sectionHdr('EXPENSES')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 30, 40)
  const expParts = [
    `Wages Rs.${inrFmt.format(toNum(exp.wages))}`,
    `Staff Coffee Rs.${inrFmt.format(toNum(exp.staffCoffee))}`,
    `Water Cans Rs.${inrFmt.format(toNum(exp.waterCans))}`,
    `Lab Food Rs.${inrFmt.format(toNum(exp.labFood))}`,
    `Wastage Rs.${inrFmt.format(toNum(exp.wastage))}`,
    ...othersRows.filter(r => r.description.trim() || Number(r.amount)).map(r => `Others (${r.description || '—'}) Rs.${inrFmt.format(Number(r.amount) || 0)}`),
  ]
  doc.text(expParts.join('  ·  '), M, y, { maxWidth: W - M * 2 })
  y += 10
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Expenses  Rs.${inrFmt.format(totalExpenses)}`, M, y)
  y += 10

  // UPI & Cash breakdown
  sectionHdr('UPI & CASH BREAKDOWN')
  let bMcUpi = 0, bMcCash = 0, bPcUpi = 0, bPcCash = 0, bCdUpi = 0, bCdCash = 0
  let bLcUpi = 0, bLcCash = 0, bBms = 0, bPkUpi = 0, bPkCash = 0
  for (const s of showSummaries) {
    const mc = mcMap.get(s.showId), pc = pcMap.get(s.showId), cd = cdMap.get(s.showId), pk = pkMap.get(s.showId)
    bMcUpi += Number(mc?.upi_amount) || 0
    bMcCash += Number(mc?.cash_amount) || 0
    bPcUpi += Number(pc?.upi_amount) || 0
    bPcCash += Number(pc?.cash_amount) || 0
    bCdUpi += Number(cd?.upi_amount) || 0
    bCdCash += Number(cd?.cash_amount) || 0
    bLcUpi += Number(cd?.live_upi_amount) || 0
    bLcCash += Number(cd?.live_cash_amount) || 0
    bBms += Number(pc?.bms_combo_amount) || 0
    bPkUpi += Number(pk?.upi_amount) || 0
    bPkCash += Number(pk?.cash_amount) || 0
  }
  const breakdownRows: [string, number, number][] = [
    ['Main Counter', bMcUpi, bMcCash],
    ['Popcorn', bPcUpi, bPcCash],
    ['Cool Drinks', bCdUpi, bCdCash],
    ['Live Counter', bLcUpi, bLcCash],
    ['BMS', bBms, 0],
    ['Parking', bPkUpi, bPkCash],
  ]
  const bCols = [M, M + 100, M + 140]
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(90, 90, 110)
  ;['Category', 'UPI', 'Cash'].forEach((h, i) => doc.text(h, bCols[i], y, i > 0 ? { align: 'right' } : undefined))
  y += 4.5; rule()
  doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 40)
  let totalUpi = 0, totalCash = 0
  for (const [label, upi, cash] of breakdownRows) {
    checkPage()
    doc.text(label, bCols[0], y)
    doc.text('Rs.' + inrFmt.format(upi), bCols[1], y, { align: 'right' })
    doc.text('Rs.' + inrFmt.format(cash), bCols[2], y, { align: 'right' })
    totalUpi += upi; totalCash += cash
    y += 5.5
  }
  y += 1
  doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 120, 0)
  doc.text('Total', bCols[0], y)
  doc.text('Rs.' + inrFmt.format(totalUpi), bCols[1], y, { align: 'right' })
  doc.text('Rs.' + inrFmt.format(totalCash), bCols[2], y, { align: 'right' })
  y += 10

  // Staff wages
  const validStaff = staffRows.filter(r => r.name.trim())
  if (validStaff.length) {
    sectionHdr('STAFF WAGES')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 30, 40)
    doc.text(validStaff.map(r => `${r.name} Rs.${inrFmt.format(toNum(r.amount))}`).join('  ·  '), M, y, { maxWidth: W - M * 2 })
    y += 10
  }

  // Footer
  checkPage(40)
  rule()
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 40)
  doc.text('Total Sales:', M, y); doc.text('Rs.' + inrFmt.format(totalSales), M + 60, y); y += 7
  doc.text('Cost of Goods:', M, y); doc.text('Rs.' + inrFmt.format(costOfGoods), M + 60, y); y += 7
  doc.setTextColor(0, 150, 0)
  doc.text('Gross Profit:', M, y); doc.text(`Rs.${inrFmt.format(grossProfit)}  (${profitMarginPct}%)`, M + 60, y); y += 7
  doc.setTextColor(30, 30, 40)
  doc.text('Total Expenses:', M, y); doc.text('Rs.' + inrFmt.format(totalExpenses), M + 60, y); y += 7
  if (bCash > 0) doc.setTextColor(0, 150, 0)
  else if (bCash < 0) doc.setTextColor(200, 0, 0)
  else doc.setTextColor(180, 120, 0)
  doc.text('Net Balance Cash:', M, y); doc.text('Rs.' + inrFmt.format(bCash), M + 60, y)

  doc.save(`${theatreName.replace(/\s+/g, '_')}_${date}.pdf`)
}
