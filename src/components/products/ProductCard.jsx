import { Package, TrendingDown, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatPrice, priceVariance, formatPercent } from '@/utils/formatters'
import { cn } from '@/utils/cn'

export default function ProductCard({ product }) {
  const navigate = useNavigate()
  const variance = product.last_price && product.prev_price
    ? priceVariance(product.last_price, product.prev_price)
    : null

  return (
    <Card onClick={() => navigate(`/products/${product.id}`)} className="flex gap-3">
      {/* Image / placeholder */}
      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-6 h-6 text-gray-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{product.name}</p>
        {product.brand && <p className="text-xs text-gray-500 truncate">{product.brand}</p>}

        <div className="flex items-center gap-2 mt-1.5">
          {product.last_price != null && (
            <span className="text-sm font-semibold text-primary-600">
              {formatPrice(product.last_price)}
            </span>
          )}
          {variance && (
            <span className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              variance.increased ? 'text-red-500' : 'text-secondary-600'
            )}>
              {variance.increased
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {formatPercent(variance.value)}
            </span>
          )}
        </div>
      </div>

      {product.category && (
        <Badge variant="gray" className="self-start shrink-0 capitalize">
          {product.category}
        </Badge>
      )}
    </Card>
  )
}
