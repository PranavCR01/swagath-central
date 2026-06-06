// Slip item state shape (strings so inputs stay controlled even when empty)
export type ItemRow = { ob: string; rec: string; cb: string }
export type TabRows = Record<string, ItemRow>

// Supabase table shapes — flat columns (no JSONB items)
export interface MainCounterRow {
  id: string
  show_id: string
  upi_amount: number
  cash_amount: number
  [key: string]: number | string | null
}

export interface PopcornRow {
  id: string
  show_id: string
  bms_combo_amount: number
  upi_amount: number
  cash_amount: number
  [key: string]: number | string | null
}

export interface CoolDrinksRow {
  id: string
  show_id: string
  upi_amount: number
  cash_amount: number
  [key: string]: number | string | null
}

export interface ParkingRow {
  id: string
  show_id: string
  scooter_count: number
  auto_count: number
  car_count: number
  reported_amount: number | null
}

export interface Theatre {
  id: string
  name: string
  created_at: string
}

export interface Day {
  id: string
  theatre_id: string
  date: string
  created_at: string
}

export interface Show {
  id: string
  day_id: string
  show_number: number
  start_time: string
  movie_name: string
  language: string
  is_fan_show: boolean
  ticket_count: number | null
  occupancy_pct: number | null
  created_at: string
  is_complete: boolean
}
