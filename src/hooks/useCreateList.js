import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { listsService } from '@/services/shoppingLists'

/**
 * Mutation hook for creating a new shopping list.
 *
 * Encapsulates validation, Supabase write, success navigation, and error
 * surfacing so CreateNewList.jsx stays presentation-only.
 *
 * Future extension points:
 *   - seedItems: pass an array of { name, quantity } to pre-populate the list
 *     from a template (call listItemsService.addItem in a loop after creation).
 *   - priceApiHook: after creation, trigger a price-lookup job via Edge Function.
 *
 * @returns {{ createList: function, saving: boolean }}
 */
export function useCreateList() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  /**
   * Creates the list and navigates to its detail page on success.
   *
   * @param {{
   *   name: string,
   *   budget?: number|null,
   *   storeId?: string|null,   — UUID from the stores table (migration 006)
   * }} payload
   */
  const createList = useCallback(async ({ name, budget, storeId }) => {
    const trimmed = name?.trim()
    if (!trimmed) {
      toast.error('El nombre de la lista es obligatorio.')
      return
    }

    setSaving(true)
    try {
      const list = await listsService.create({
        name:     trimmed,
        status:   'active',
        budget:   budget > 0 ? Number(budget) : null,
        store_id: storeId || null,
      })
      toast.success('Lista creada')
      navigate(`/shopping/${list.id}`, { replace: true })
    } catch (err) {
      console.error('[useCreateList]', err)
      toast.error('No se pudo crear la lista. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }, [navigate])

  return { createList, saving }
}
