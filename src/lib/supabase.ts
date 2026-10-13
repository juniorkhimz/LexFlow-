import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and set your Supabase project URL/publishable key.`,
    );
  }
  return value;
}

const supabaseUrl = requireEnv("VITE_SUPABASE_URL");
const supabasePublishableKey = requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

// Single shared client. Uses the publishable (anon) key only — this file must
// never import or reference a service-role key. RLS policies (see
// supabase/migrations) are what actually enforce firm/client data isolation;
// this client is not a trust boundary by itself.
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
