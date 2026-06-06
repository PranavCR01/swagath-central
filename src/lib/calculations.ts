// sale = ob + rec - cb
export function calcSale(ob: number, rec: number, cb: number): number {
  return Math.max(0, ob + rec - cb)
}

// amount = sale × unit price
export function calcAmount(sale: number, price: number): number {
  return sale * price
}

// OB for next show = what's physically left after the show
export function calcClosingStock(ob: number, rec: number, cb: number, sale: number): number {
  return Math.max(0, ob + rec - cb - sale)
}

// Parking expected revenue
export function calcParkingExpected(
  scooterCount: number,
  autoCount: number,
  carCount: number
): number {
  return scooterCount * 20 + autoCount * 40 + carCount * 80
}

// Parking gap: positive = staff owe money, negative = overpaid
export function calcParkingGap(expected: number, reported: number): number {
  return expected - reported
}

// Show total = main counter + popcorn + cool drinks + parking reported
export function calcShowTotal(
  mainCounterTotal: number,
  popcornTotal: number,
  coolDrinksTotal: number,
  parkingReported: number
): number {
  return mainCounterTotal + popcornTotal + coolDrinksTotal + parkingReported
}

// Day B.Cash = total sales - total expenses
export function calcBCash(totalSales: number, totalExpenses: number): number {
  return totalSales - totalExpenses
}

export function computeSlipTotal(upiAmount: number, cashAmount: number): number {
  return upiAmount + cashAmount
}

export function computeShowTotal(mc: number, popcorn: number, cd: number, parking: number): number {
  return mc + popcorn + cd + parking
}

export function computeDayTotal(showTotals: number[]): number {
  return showTotals.reduce((s, t) => s + t, 0)
}

// B.Cash = total sales minus all expense fields.
// theatre_expenses.wages is the sole wages figure — do NOT add theatre_staff_wages
// totals separately; that would double-count the same money.
export function computeBCash(
  totalSales: number,
  expenses: {
    wages: number; staff_coffee: number; water_cans: number;
    lab_food: number; wastage: number; others_amount: number
  }
): number {
  return totalSales - (
    expenses.wages + expenses.staff_coffee + expenses.water_cans +
    expenses.lab_food + expenses.wastage + expenses.others_amount
  )
}
