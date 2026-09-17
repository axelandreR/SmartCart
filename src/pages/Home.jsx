import { useNavigate } from 'react-router-dom'
import { Plus, ScanLine, TrendingDown, ShoppingCart, Clock } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useShoppingLists } from '@/hooks/useShoppingList'
import { formatDate, formatPrice } from '@/utils/formatters'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function Home() {
  const navigate = useNavigate()
  const { data: lists, loading } = useShoppingLists()

  const activeLists = lists?.filter((l) => l.status === 'active') ?? []
  const recentLists = lists?.slice(0, 3) ?? []

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="SmartCart"
        subtitle="Tu asistente de compras"
        actions={
          <button
            onClick={() => navigate('/profile')}
            className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center"
          >
            <span className="text-sm font-bold text-primary-600">U</span>
          </button>
        }
      />

      <div className="flex-1 px-4 py-4 pb-24 space-y-5">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="primary"
            className="flex items-center justify-center gap-2 py-4 rounded-2xl"
            onClick={() => navigate('/lists/new')}
          >
            <Plus className="w-5 h-5" />
            Nueva Lista
          </Button>
          <Button
            variant="secondary"
            className="flex items-center justify-center gap-2 py-4 rounded-2xl"
            onClick={() => navigate('/scanner')}
          >
            <ScanLine className="w-5 h-5" />
            Escanear
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Listas activas', value: activeLists.length, color: 'text-primary-600' },
            { label: 'Productos', value: '—', color: 'text-secondary-600' },
            { label: 'Ahorro est.', value: formatPrice(0), color: 'text-accent-600' },
          ].map((stat) => (
            <Card key={stat.label} className="flex flex-col items-center py-3 px-2 text-center">
              <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
              <span className="text-xs text-gray-500 mt-0.5">{stat.label}</span>
            </Card>
          ))}
        </div>

        {/* Active lists */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-primary-500" />
              Listas activas
            </h2>
            <button onClick={() => navigate('/lists')} className="text-xs text-primary-500 font-medium">
              Ver todas
            </button>
          </div>

          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : activeLists.length === 0 ? (
            <Card className="flex flex-col items-center py-8 text-center gap-2">
              <ShoppingCart className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">No tienes listas activas</p>
              <Button size="sm" onClick={() => navigate('/lists/new')}>Crear lista</Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {activeLists.map((list) => (
                <Card
                  key={list.id}
                  onClick={() => navigate(`/lists/${list.id}`)}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{list.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(list.updated_at)}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {list.shopping_list_items?.[0]?.count ?? 0} ítems
                  </span>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
            <Clock className="w-4 h-4 text-secondary-500" />
            Actividad reciente
          </h2>
          <Card className="flex items-center justify-center py-8">
            <p className="text-sm text-gray-400">Sin actividad reciente</p>
          </Card>
        </section>

        {/* Savings tip */}
        <Card className="bg-gradient-to-br from-secondary-500 to-secondary-700 text-white">
          <div className="flex items-start gap-3">
            <TrendingDown className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Consejo de ahorro</p>
              <p className="text-xs text-secondary-100 mt-0.5">
                Escanea productos para ver su historial de precios y compara entre tiendas.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
