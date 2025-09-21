import { createClient } from '@supabase/supabase-js'

// The URL and anon key are provided by the user to ensure connection.
const supabaseUrl = "https://flvfekjzccbgxpdphezq.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdmZla2p6Y2NiZ3hwZHBoZXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODI3MjYsImV4cCI6MjA3NDA1ODcyNn0.tiNgvwsJYmWG0e3t-VoL5ShVvvYpam4-TLh2-aA_0QQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);