import { useState, useCallback } from 'react'
import { listsService, listItemsService } from '@/services/shoppingLists'
import { priceMemoryService } from '@/services/products'
import { useQuery } from './useSupabase'
import toast from 'react-hot-toast'

export function useShoppingLists() {
  return useQuery(() => listsService.getAll())
}

export function useShoppingList(id) {
  const [saving, setSaving] = useState(false)
  const { data: list, loading, error, refetch } = useQuery(
    () => listsService.getById(id),
    [id]
  )

  const toggleItem = useCallback(async (itemId, checked) => {
    setSaving(true)
    try {
      await listItemsService.toggleChecked(itemId, checked)
      await refetch()
    } catch (err) {
      console.error('[useShoppingList] toggleItem:', err)
      toast.error('No se pudo actualizar el ítem')
    } finally {
      setSaving(false)
    }
  }, [refetch])

  const addItem = useCallback(async (item) => {
    setSaving(true)
    try {
      await listItemsService.addItem(id, item)
      await refetch()
      toast.success('Ítem agregado')
    } catch (err) {
      console.error('[useShoppingList] addItem:', err)
      toast.error('No se pudo agregar el ítem')
    } finally {
      setSaving(false)
    }
  }, [id, refetch])

  const removeItem = useCallback(async (itemId) => {
    setSaving(true)
    try {
      await listItemsService.removeItem(itemId)
      await refetch()
    } catch (err) {
      console.error('[useShoppingList] removeItem:', err)
      toast.error('No se pudo eliminar el ítem')
    } finally {
      setSaving(false)
    }
  }, [refetch])

  const updateItemPrice = useCallback(async (itemId, price) => {
    try {
      await listItemsService.updateItem(itemId, { price: price ?? null })
      await refetch()
    } catch (err) {
      console.error('[useShoppingList] updateItemPrice:', err)
      toast.error('No se pudo guardar el precio')
    }
  }, [refetch])

  const updateItemImage = useCallback(async (itemId, imageUrl) => {
    try {
      await listItemsService.updateItemImage(itemId, imageUrl)
      await refetch()
    } catch (err) {
      console.error('[useShoppingList] updateItemImage:', err)
      toast.error('No se pudo guardar la foto')
    }
  }, [refetch])

  const completeList = useCallback(async () => {
    try {
      const items = list?.shopping_list_items ?? []
      const { recorded } = await priceMemoryService.commitPriceMemory(
        { id, store_id: list?.store_id ?? null },
        items,
      )
      await listsService.markCompleted(id)
      const msg = recorded > 0
        ? `Lista completada · ${recorded} precio${recorded !== 1 ? 's' : ''} registrado${recorded !== 1 ? 's' : ''}`
        : 'Lista completada'
      toast.success(msg)
      await refetch()
    } catch (err) {
      console.error('[useShoppingList] completeList:', err)
      toast.error('Error al completar la lista')
    }
  }, [id, list, refetch])

  return { list, loading, error, saving, toggleItem, addItem, removeItem, updateItemPrice, updateItemImage, completeList }
}
