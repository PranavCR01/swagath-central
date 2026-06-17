export interface ShowSummary {
  showId: string
  showNumber: number
  startTime: string
  movieName: string
  mcTotal: number
  popcornTotal: number
  cdDrinksTotal: number
  cdLiveTotal: number
  parkingReported: number
  showTotal: number
  showProfit: number
  isComplete: boolean
  scooterCount: number
  autoCount: number
  carCount: number
  parkingExpected: number
  boxTickets: number
  goldTickets: number
  silverTickets: number
  ticketCount: number
  occupancyPct: number
}

export interface StaffRow { tempId: string; name: string; amount: string }
export interface OthersRow { tempId: string; description: string; amount: string }

export interface UpiState {
  popcornUpi: string; mcUpi: string; cdUpi: string; lcUpi: string; parkingUpi: string
}
export interface CashState {
  popcornCash: string; mcCash: string; cdCash: string; lcCash: string; parkingCash: string
}
export interface ExpState {
  wages: string; staffCoffee: string; waterCans: string
  labFood: string; wastage: string
}

export const emptyUpi: UpiState = { popcornUpi: '', mcUpi: '', cdUpi: '', lcUpi: '', parkingUpi: '' }
export const emptyCash: CashState = { popcornCash: '', mcCash: '', cdCash: '', lcCash: '', parkingCash: '' }
export const emptyExp: ExpState = { wages: '', staffCoffee: '', waterCans: '', labFood: '', wastage: '' }

export const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export const fmtTime = (t: string) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
