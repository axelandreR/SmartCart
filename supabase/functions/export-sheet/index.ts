/**
 * SmartCart — Edge Function: export-sheet
 * Exports shopping history to Google Sheets using the OAuth Client Secret.
 * The secret never touches the browser — it lives only here.
 *
 * Deploy: supabase functions deploy export-sheet
 * Env vars required in Supabase dashboard (Functions → Secrets):
 *   GOOGLE_SHEETS_CLIENT_SECRET
 *   GOOGLE_SHEETS_CLIENT_ID  (same value as VITE_GOOGLE_CLIENT_ID in .env)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientSecret = Deno.env.get('GOOGLE_SHEETS_CLIENT_SECRET')
    const clientId     = Deno.env.get('GOOGLE_SHEETS_CLIENT_ID')
    const sheetId      = Deno.env.get('VITE_GOOGLE_SHEET_ID')

    if (!clientSecret || !clientId) {
      return new Response(
        JSON.stringify({ error: 'Missing Google OAuth secrets in Edge Function env' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { accessToken, rows } = await req.json()

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'accessToken required in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Append rows to Google Sheets via REST API
    const range = 'Historial!A1'
    const sheetsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: rows }),
      }
    )

    if (!sheetsRes.ok) {
      const err = await sheetsRes.text()
      return new Response(
        JSON.stringify({ error: 'Google Sheets API error', detail: err }),
        { status: sheetsRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await sheetsRes.json()
    return new Response(
      JSON.stringify({ success: true, updatedRange: result.updates?.updatedRange }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
