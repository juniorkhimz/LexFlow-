// Shared CORS headers for all Edge Functions. Restrict origin in production
// by replacing "*" with your deployed app's exact origin(s).
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
