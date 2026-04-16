import { createClient } from "@supabase/supabase-js";

// TODO: Replace these with your actual Supabase URL and public anonymous key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
