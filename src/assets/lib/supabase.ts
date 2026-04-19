import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ampmdurjvpjattomdtpe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtcG1kdXJqdnBqYXR0b21kdHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDQ1NTEsImV4cCI6MjA5MTI4MDU1MX0.6_3CuhnDfuTmI6v6VWgT0a271so0yfqwerMB6F4_3I0'

export const supabase = createClient(supabaseUrl, supabaseKey)