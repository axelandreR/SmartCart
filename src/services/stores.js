import supabase from './supabase'

/**
 * CRUD service for the `stores` table.
 * Rows are user-scoped (RLS: auth.uid() = user_id).
 */
export const storesService = {
  /**
   * All stores for the current user, sorted by name.
   * @returns {Promise<Array<{ id, name, address, lat, lng, created_at }>>}
   */
  async getAll() {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, address, lat, lng, created_at')
      .order('name')
    if (error) throw error
    return data ?? []
  },

  /**
   * Create a new store.
   * @param {{ name: string, address?: string|null }} store
   * @returns {Promise<{ id, name, address }>}
   */
  async create({ name, address = null }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('stores')
      .insert({ user_id: user.id, name: name.trim(), address: address?.trim() || null })
      .select('id, name, address')
      .single()
    if (error) throw error
    return data
  },

  /**
   * Update store name and/or address.
   * @param {string} id
   * @param {{ name?: string, address?: string|null }} updates
   */
  async update(id, updates) {
    const patch = {}
    if (updates.name    !== undefined) patch.name    = updates.name.trim()
    if (updates.address !== undefined) patch.address = updates.address?.trim() || null

    const { data, error } = await supabase
      .from('stores')
      .update(patch)
      .eq('id', id)
      .select('id, name, address')
      .single()
    if (error) throw error
    return data
  },

  /**
   * Delete a store. Lists with this store get store_id set to null (ON DELETE SET NULL).
   * @param {string} id
   */
  async delete(id) {
    const { error } = await supabase.from('stores').delete().eq('id', id)
    if (error) throw error
  },
}
