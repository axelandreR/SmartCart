/**
 * SmartCart — Edge Function: share-access
 * Public API for shared shopping lists. Bypasses RLS using the service role key.
 *
 * GET  ?token=xxx             → validate token, return list + items
 * PATCH ?token=xxx            → update item (toggle checked / set shopper_note)
 *
 * Deploy: supabase functions deploy share-access
 * No extra secrets required — uses built-in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url   = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) return json({ error: 'Token requerido' }, 400)

  // Service role client — bypasses RLS entirely
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── Validate token ─────────────────────────────────────────────────────────
  const { data: share, error: shareError } = await supabase
    .from('list_shares')
    .select('id, list_id, permission, max_uses, use_count, expires_at')
    .eq('token', token)
    .single()

  if (shareError || !share) return json({ error: 'Link no válido' }, 404)

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return json({ error: 'Este link ha expirado' }, 410)
  }

  if (share.max_uses !== null && share.use_count >= share.max_uses) {
    return json({ error: 'Este link ya no está disponible' }, 410)
  }

  // ── GET — return list data ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    // Increment use_count (fire-and-forget)
    supabase
      .from('list_shares')
      .update({ use_count: share.use_count + 1 })
      .eq('id', share.id)
      .then(() => {})

    const { data: list, error: listError } = await supabase
      .from('shopping_lists')
      .select(`
        id, name,
        stores(id, name),
        shopping_list_items(
          id, name, quantity, unit, price, checked, note,
          image_url, shopper_note, shopper_note_at,
          products(name, last_price, prev_price)
        )
      `)
      .eq('id', share.list_id)
      .single()

    if (listError) return json({ error: 'Lista no encontrada' }, 404)

    return json({ list, permission: share.permission })
  }

  // ── PATCH — update item ────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    if (share.permission !== 'shopper') {
      return json({ error: 'Sin permisos de escritura' }, 403)
    }

    const body = await req.json().catch(() => null)
    if (!body) return json({ error: 'Body inválido' }, 400)

    const { itemId, action, data } = body
    if (!itemId || !action) return json({ error: 'Parámetros inválidos' }, 400)

    // Verify item belongs to this list (security check)
    const { data: item, error: itemError } = await supabase
      .from('shopping_list_items')
      .select('id')
      .eq('id', itemId)
      .eq('list_id', share.list_id)
      .single()

    if (itemError || !item) return json({ error: 'Ítem no encontrado' }, 404)

    let updateData: Record<string, unknown> = {}

    if (action === 'toggle') {
      updateData = {
        checked:    data.checked,
        checked_at: data.checked ? new Date().toISOString() : null,
      }
    } else if (action === 'note') {
      updateData = {
        shopper_note:    data.note || null,
        shopper_note_at: data.note ? new Date().toISOString() : null,
      }
    } else {
      return json({ error: 'Acción inválida' }, 400)
    }

    const { error: updateError } = await supabase
      .from('shopping_list_items')
      .update(updateData)
      .eq('id', itemId)

    if (updateError) return json({ error: 'No se pudo actualizar' }, 500)

    return json({ ok: true })
  }

  return json({ error: 'Método no permitido' }, 405)
})
