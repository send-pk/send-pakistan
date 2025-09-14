import { createClient } from '@supabase/supabase-js'

// The URL and anon key are provided by the user to ensure connection.
const supabaseUrl = "https://nddflonynvestvhiogez.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZGZsb255bnZlc3R2aGlvZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMjExODUsImV4cCI6MjA3Mjg5NzE4NX0.NYyBrPoM6KjdPQAOmpIFVLxMCgzzmXGy_g0TQRXm4p8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
