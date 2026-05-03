import { useState, useCallback } from 'react'
import { listSharesService } from '@/services/listShares'
import { useQuery } from './useSupabase'
import toast from 'react-hot-toast'

/**
 * Owner-side hook for managing share links on a list.
 *
 * @param {string} listId
 * @returns {{
 *   shares: Array,
 *   loading: boolean,
 *   creating: boolean,
 *   createShare: (opts?: object) => Promise<object|null>,
 *   revokeShare: (shareId: string) => Promise<void>,
 *   refetch: () => void,
 * }}
 */
export function useListShares(listId) {
  const [creating, setCreating] = useState(false)

  const { data: shares, loading, refetch } = useQuery(
    () => listSharesService.getAll(listId),
    [listId],
  )

  /**
   * Create a new share link.
   * Returns the created share object (with token) or null on error.
   */
  const createShare = useCallback(async (opts = {}) => {
    setCreating(true)
    try {
      const share = await listSharesService.create(listId, opts)
      await refetch()
      return share
    } catch (err) {
      console.error('[useListShares] createShare:', err)
      toast.error('No se pudo crear el link')
      return null
    } finally {
      setCreating(false)
    }
  }, [listId, refetch])

  /**
   * Revoke (delete) a share link by its ID.
   */
  const revokeShare = useCallback(async (shareId) => {
    try {
      await listSharesService.revoke(shareId)
      await refetch()
      toast.success('Link revocado')
    } catch (err) {
      console.error('[useListShares] revokeShare:', err)
      toast.error('No se pudo revocar el link')
    }
  }, [refetch])

  return {
    shares:      shares ?? [],
    loading,
    creating,
    createShare,
    revokeShare,
    refetch,
  }
}
