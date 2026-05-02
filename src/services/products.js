import supabase from './supabase'

export const productsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*, price_history(*, stores(id, name))')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async getByBarcode(barcode) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async create(product) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
  },

  async search(query) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(20)
    if (error) throw error
    return data
  },

  /**
   * Count of all products registered by the user.
   * @returns {Promise<number>}
   */
  async getCount() {
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })

    if (error) throw error
    return count ?? 0
  },

  async updateImage(id, imageUrl) {
    const { data, error } = await supabase
      .from('products')
      .update({ image_url: imageUrl })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getPriceMovers() {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, last_price, prev_price')
      .not('last_price', 'is', null)
      .not('prev_price', 'is', null)
      .order('name')

    if (error) throw error
    return data ?? []
  },
}

/**
 * Price-memory pipeline — connects shopping list items to the product catalog
 * and price history when a list is finalized.
 *
 * Flow for each priced item:
 *   1. Find-or-create a product (by barcode → by name → insert)
 *   2. Insert a price_history row  (DB trigger keeps last_price / prev_price in sync)
 *   3. Link shopping_list_items.product_id back to the product
 *
 * Since migration 006 the list already carries store_id (FK) — no store lookup needed.
 * Errors per item are swallowed so list completion is never blocked.
 */
export const priceMemoryService = {
  /**
   * Find or create a product for a shopping list item.
   * Priority: existing product_id → barcode match → name match → insert.
   * @param {{ product_id?: string|null, barcode?: string|null, name: string,
   *           brand?: string|null, category?: string|null }} item
   * @returns {Promise<string>} product UUID
   */
  async upsertProduct(item) {
    // Already linked — reuse without hitting the DB
    if (item.product_id) return item.product_id

    const { data: { user } } = await supabase.auth.getUser()

    // 1. Match by barcode
    if (item.barcode?.trim()) {
      const { data: byBarcode } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id)
        .eq('barcode', item.barcode.trim())
        .maybeSingle()
      if (byBarcode) return byBarcode.id
    }

    // 2. Match by exact name (case-insensitive)
    const { data: byName } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', item.name.trim())
      .maybeSingle()
    if (byName) return byName.id

    // 3. Create new product
    const { data: created, error } = await supabase
      .from('products')
      .insert({
        user_id:  user.id,
        name:     item.name.trim(),
        barcode:  item.barcode?.trim() || null,
        brand:    item.brand    || null,
        category: item.category || null,
      })
      .select('id')
      .single()
    if (error) throw error
    return created.id
  },

  /**
   * Commit price memory for all priced items in a completed shopping list.
   *
   * @param {{ id: string, store_id: string|null }} list
   * @param {Array<{ id: string, name: string, barcode?: string|null, product_id?: string|null,
   *                 price: number|null, quantity: number, unit: string }>} items
   * @returns {Promise<{ recorded: number }>}
   */
  async commitPriceMemory(list, items) {
    const priced = items.filter((i) => i.price != null && i.name?.trim())
    if (priced.length === 0) return { recorded: 0 }

    // store_id is now a direct FK on the list — no lookup needed
    const storeId = list.store_id ?? null

    let recorded = 0
    for (const item of priced) {
      try {
        const productId = await this.upsertProduct(item)

        // Propagate item photo to product catalog if product has none yet
        if (item.image_url) {
          const { data: prod } = await supabase
            .from('products').select('image_url').eq('id', productId).single()
          if (!prod?.image_url) {
            await supabase.from('products')
              .update({ image_url: item.image_url }).eq('id', productId)
          }
        }

        // Insert price history — DB trigger keeps last_price / prev_price in sync
        const { error: phErr } = await supabase
          .from('price_history')
          .insert({
            product_id: productId,
            store_id:   storeId,
            price:      item.price,
            quantity:   item.quantity ?? 1,
            unit:       item.unit     ?? 'unid',
          })
        if (phErr) throw phErr

        // Back-link the list item to the product
        const { error: itemErr } = await supabase
          .from('shopping_list_items')
          .update({ product_id: productId })
          .eq('id', item.id)
        if (itemErr) throw itemErr

        recorded++
      } catch (err) {
        console.error('[priceMemory] Item skipped:', item.name, err)
      }
    }

    return { recorded }
  },
}

export const priceHistoryService = {
  async add(entry) {
    const { data, error } = await supabase
      .from('price_history')
      .insert(entry)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getForProduct(productId) {
    const { data, error } = await supabase
      .from('price_history')
      .select('*, stores(name)')
      .eq('product_id', productId)
      .order('recorded_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data
  },

  /**
   * Recent price entries with store names — used for day/time pattern analysis.
   * @param {number} limit
   */
  async getRecent(limit = 300) {
    const { data, error } = await supabase
      .from('price_history')
      .select('price, recorded_at, stores(id, name)')
      .order('recorded_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  async getLowestPrice(productId) {
    const { data, error } = await supabase
      .from('price_history')
      .select('price, stores(name), recorded_at')
      .eq('product_id', productId)
      .order('price')
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  },
}
