import supabase from './supabase'

export const listsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*, stores(id, name), shopping_list_items(count)')
      .order('updated_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*, stores(id, name), shopping_list_items(*, products(*))')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(list) {
    const { data: { user } } = await supabase.auth.getUser()
    // Accepts store_id (uuid FK) — store_name column was removed in migration 006
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert({ ...list, user_id: user?.id })
      .select('*, stores(id, name)')
      .single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('shopping_lists')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase.from('shopping_lists').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Fetch completed lists with all their items (for budget analysis).
   * @param {number} limit
   */
  async getCompleted(limit = 30) {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('id, name, store_id, stores(id, name), budget, created_at, shopping_list_items(id, name, price, quantity, checked, checked_at)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  async archive(id) {
    return this.update(id, { status: 'archived' })
  },

  async markCompleted(id) {
    return this.update(id, { status: 'completed', completed_at: new Date().toISOString() })
  },
}

export const listItemsService = {
  async addItem(listId, item) {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert({ ...item, list_id: listId })
      .select('*, products(*)')
      .single()
    if (error) throw error
    return data
  },

  async updateItem(itemId, updates) {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .update(updates)
      .eq('id', itemId)
      .select('*, products(*)')
      .single()
    if (error) throw error
    return data
  },

  async toggleChecked(itemId, checked) {
    return this.updateItem(itemId, {
      checked,
      checked_at: checked ? new Date().toISOString() : null,
    })
  },

  async removeItem(itemId) {
    const { error } = await supabase.from('shopping_list_items').delete().eq('id', itemId)
    if (error) throw error
  },

  async updateItemImage(itemId, imageUrl) {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .update({ image_url: imageUrl })
      .eq('id', itemId)
      .select('*, products(*)')
      .single()
    if (error) throw error
    return data
  },

  async reorderItems(items) {
    const updates = items.map((item, index) => ({ id: item.id, sort_order: index }))
    const { error } = await supabase.from('shopping_list_items').upsert(updates)
    if (error) throw error
  },

  /**
   * Sum of (price × quantity) for all checked items since the start of the current month.
   * Returns 0 when there are no checked items or prices are null.
   * @returns {Promise<number>}
   */
  async getMonthlySpending() {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('price, quantity')
      .eq('checked', true)
      .gte('checked_at', startOfMonth.toISOString())
      .not('price', 'is', null)

    if (error) throw error

    return data.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0)
  },

  /**
   * Raw checked items for the last N months (price, quantity, checked_at, product category).
   * The hook processes these into monthly totals and category breakdowns.
   * @param {number} months
   * @returns {Promise<Array<{ price: number, quantity: number, checked_at: string, products: { category: string } | null }>>}
   */
  async getCheckedItemsForAnalytics(months = 6) {
    const since = new Date()
    since.setMonth(since.getMonth() - months)
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('price, quantity, checked_at, products ( category )')
      .eq('checked', true)
      .not('price', 'is', null)
      .not('checked_at', 'is', null)
      .gte('checked_at', since.toISOString())
      .order('checked_at', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  /**
   * Count of completed shopping lists.
   * @returns {Promise<number>}
   */
  async getCompletedCount() {
    const { count, error } = await supabase
      .from('shopping_lists')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')

    if (error) throw error
    return count ?? 0
  },
}
