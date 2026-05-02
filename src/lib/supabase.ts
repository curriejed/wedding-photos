import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill them in.'
  );
}

export const supabase = createClient(url, anon, {
  realtime: { params: { eventsPerSecond: 5 } },
});

export const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? 'wedding-photos';
