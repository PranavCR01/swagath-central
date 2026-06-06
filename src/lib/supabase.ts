import { createClient } from '@supabase/supabase-js'

// Strip any trailing path segments — .env.local may include /rest/v1/
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL.replace(/\/rest\/v1\/?$/, '')

export const supabase = createClient(
  supabaseUrl,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
