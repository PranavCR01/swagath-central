export interface ShowSummary {
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
  boxTickets: number
  goldTickets: number
  silverTickets: number
  ticketCount: number
  occupancyPct: number
}

export interface StaffRow { tempId: string; name: string; amount: string }

export interface UpiState {
  popcornUpi: string; mcUpi: string; cdUpi: string; lcUpi: string; bmsUpi: string
}
export interface ExpState {
  wages: string; staffCoffee: string; waterCans: string
  labFood: string; wastage: string; othersAmount: string
}

export const emptyUpi: UpiState = { popcornUpi: '', mcUpi: '', cdUpi: '', lcUpi: '', bmsUpi: '' }
export const emptyExp: ExpState = { wages: '', staffCoffee: '', waterCans: '', labFood: '', wastage: '', othersAmount: '' }

export const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export const fmtTime = (t: string) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
