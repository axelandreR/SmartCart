import { useParams } from 'react-router-dom'
import { Store, Clock } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { useQuery } from '@/hooks/useSupabase'
import { priceHistoryService } from '@/services/products'
import { formatPrice, formatDate, formatRelative } from '@/utils/formatters'

export default function PriceHistory() {
  const { id } = useParams()
  const { data: history, loading } = useQuery(
    () => priceHistoryService.getForProduct(id),
    [id]
  )

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader back title="Historial de precios" />

      <div className="flex-1 px-4 py-4 pb-24 space-y-3">
        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : !history?.length ? (
          <EmptyState icon={Store} title="Sin registros de precios" description="Registra el precio al escanear un producto en una tienda" />
        ) : (
          history.map((h) => (
            <Card key={h.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{h.stores?.name ?? 'Tienda desconocida'}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {formatRelative(h.recorded_at)} · {formatDate(h.recorded_at)}
                </p>
              </div>
              <p className="text-lg font-bold text-primary-600 shrink-0">{formatPrice(h.price)}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
