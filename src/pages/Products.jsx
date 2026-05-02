import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, CameraOff, Package } from 'lucide-react'
import PageHeader  from '@/components/layout/PageHeader'
import Button      from '@/components/ui/Button'
import EmptyState  from '@/components/ui/EmptyState'
import ProductCard from '@/components/products/ProductCard'
import { useQuery } from '@/hooks/useSupabase'
import { productsService } from '@/services/products'
import { SCANNER_DISABLED } from '@/utils/constants'
import { cn } from '@/utils/cn'

export default function Products() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')

  // Sync URL param → input on mount
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearch(q)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: products, loading } = useQuery(
    () => search.length >= 2 ? productsService.search(search) : productsService.getAll(),
    [search]
  )

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Productos"
        actions={
          <button
            type="button"
            title={SCANNER_DISABLED ? 'Disponible solo en dispositivos móviles' : 'Abrir escáner'}
            onClick={SCANNER_DISABLED ? undefined : () => navigate('/scanner')}
            aria-disabled={SCANNER_DISABLED}
            className={cn(
              'p-2 rounded-xl transition-colors',
              SCANNER_DISABLED
                ? 'text-gray-300 cursor-not-allowed opacity-50'
                : 'hover:bg-gray-100 text-gray-500'
            )}
          >
            <CameraOff className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar en tu biblioteca…"
            className="input-field pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 px-4 py-4 pb-24 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !products?.length ? (
          <EmptyState
            icon={Package}
            title={search ? `Sin resultados para "${search}"` : 'Sin productos'}
            description={search ? 'Probá con otro término' : 'Los productos escaneados aparecerán aquí'}
            action={
              <Button onClick={() => navigate('/product-search')}>
                Buscar en catálogo global
              </Button>
            }
          />
        ) : (
          products.map((p) => <ProductCard key={p.id} product={p} />)
        )}
      </div>
    </div>
  )
}

