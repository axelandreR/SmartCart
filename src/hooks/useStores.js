import { useState, useCallback } from 'react'
import { storesService } from '@/services/stores'
import { useQuery } from './useSupabase'
import toast from 'react-hot-toast'

/**
 * Read hook — returns all stores for the current user.
 * @returns {{ stores: Array, loading: boolean, refetch: function }}
 */
export function useStores() {
  const { data: stores, loading, error, refetch } = useQuery(
    () => storesService.getAll()
  )
  return { stores: stores ?? [], loading, error, refetch }
}

/**
 * Mutation hook — create / delete stores.
 * Exposes `refetch` so callers can refresh after mutations.
 */
export function useStoreMutations(refetch) {
  const [saving, setSaving] = useState(false)

  const createStore = useCallback(async ({ name, address }) => {
    if (!name?.trim()) {
      toast.error('El nombre de la tienda es obligatorio.')
      return null
    }
    setSaving(true)
    try {
      const store = await storesService.create({ name, address })
      toast.success('Tienda agregada')
      await refetch()
      return store
    } catch (err) {
      console.error('[useStoreMutations] createStore:', err)
      toast.error('No se pudo agregar la tienda')
      return null
    } finally {
      setSaving(false)
    }
  }, [refetch])

  const deleteStore = useCallback(async (id) => {
    setSaving(true)
    try {
      await storesService.delete(id)
      toast.success('Tienda eliminada')
      await refetch()
    } catch (err) {
      console.error('[useStoreMutations] deleteStore:', err)
      toast.error('No se pudo eliminar la tienda')
    } finally {
      setSaving(false)
    }
  }, [refetch])

  return { createStore, deleteStore, saving }
}
