/**
 * List sharing service.
 *
 * Owner-side operations (require auth):
 *   listSharesService.create()  — create a new share link
 *   listSharesService.getAll()  — list all links for a list
 *   listSharesService.revoke()  — delete a share link
 *
 * Public-side operations (no auth, via Edge Function):
 *   sharedListService.getList()   — fetch list + items by token
 *   sharedListService.toggleItem() — shopper marks item checked/unchecked
 *   sharedListService.setNote()   — shopper adds a note to an item
 */
import supabase from './supabase'

// Edge Function URL — same host as the Supabase project
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-access`

// ─── Owner-side (authenticated) ──────────────────────────────────────────────

export const listSharesService = {
  /**
   * Create a new share link for a list.
   * Free plan: maximum 1 active link per list — enforced in the UI.
   * @param {string} listId
   * @param {{ label?: string, permission?: 'viewer'|'shopper', maxUses?: number, expiresAt?: string }} opts
   * @returns {Promise<{ id: string, token: string, permission: string, label: string|null, use_count: number, created_at: string }>}
   */
  async create(listId, { label = null, permission = 'shopper', maxUses = null, expiresAt = null } = {}) {
    const { data, error } = await supabase
      .from('list_shares')
      .insert({
        list_id:    listId,
        label,
        permission,
        max_uses:   maxUses,
        expires_at: expiresAt,
      })
      .select('id, token, permission, label, use_count, created_at')
      .single()

    if (error) throw error
    return data
  },

  /**
   * List all active share links for a list (owner only).
   * @param {string} listId
   * @returns {Promise<Array>}
   */
  async getAll(listId) {
    const { data, error } = await supabase
      .from('list_shares')
      .select('id, token, permission, label, use_count, max_uses, expires_at, created_at')
      .eq('list_id', listId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  /**
   * Revoke (delete) a share link.
   * @param {string} shareId
   */
  async revoke(shareId) {
    const { error } = await supabase
      .from('list_shares')
      .delete()
      .eq('id', shareId)

    if (error) throw error
  },
}

// ─── Public-side (unauthenticated, via Edge Function) ─────────────────────────

export const sharedListService = {
  /**
   * Fetch the shared list data by token.
   * Called from SharedList.jsx — no auth required.
   * @param {string} token
   * @returns {Promise<{ list: object, permission: string }>}
   */
  async getList(token) {
    const res = await fetch(`${EDGE_URL}?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const body = await res.json()
    if (!res.ok) throw new Error(body.error ?? 'Error al cargar la lista')
    return body   // { list, permission }
  },

  /**
   * Shopper toggles an item as checked/unchecked.
   * @param {string} token
   * @param {string} itemId
   * @param {boolean} checked
   */
  async toggleItem(token, itemId, checked) {
    const res = await fetch(`${EDGE_URL}?token=${encodeURIComponent(token)}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemId, action: 'toggle', data: { checked } }),
    })

    const body = await res.json()
    if (!res.ok) throw new Error(body.error ?? 'No se pudo actualizar el ítem')
  },

  /**
   * Shopper adds or clears a note on an item.
   * @param {string} token
   * @param {string} itemId
   * @param {string|null} note
   */
  async setNote(token, itemId, note) {
    const res = await fetch(`${EDGE_URL}?token=${encodeURIComponent(token)}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemId, action: 'note', data: { note } }),
    })

    const body = await res.json()
    if (!res.ok) throw new Error(body.error ?? 'No se pudo guardar la nota')
  },
}
