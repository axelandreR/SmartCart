import { User, LogOut, Edit2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useSupabase'
import { useShoppingLists } from '@/hooks/useShoppingList'
import { useQuery } from '@/hooks/useSupabase'
import { productsService } from '@/services/products'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { data: lists, loading: listsLoading } = useShoppingLists()
  const { data: productCount, loading: productsLoading } = useQuery(
    () => productsService.getCount(),
    []
  )

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  const listCount = lists?.length ?? 0
  const loading   = listsLoading || productsLoading

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader back title="Perfil" />

      <div className="flex-1 px-4 py-6 pb-24 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">{user?.user_metadata?.full_name ?? 'Usuario'}</p>
            <p className="text-sm text-gray-500">{user?.email ?? 'Sin sesión'}</p>
          </div>
          <Button size="sm" variant="ghost">
            <Edit2 className="w-4 h-4 mr-1" /> Editar perfil
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            <div className="col-span-2"><LoadingSpinner className="py-4" /></div>
          ) : (
            [
              { label: 'Listas',    value: String(listCount)         },
              { label: 'Productos', value: String(productCount ?? 0) },
            ].map((s) => (
              <Card key={s.label} className="text-center py-3">
                <p className="text-xl font-bold text-primary-600">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </Card>
            ))
          )}
        </div>

        {/* Account info */}
        <Card className="space-y-3">
          <h3 className="font-semibold text-gray-800">Cuenta</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            <span>{user?.email ?? 'No autenticado'}</span>
          </div>
        </Card>

        {user && (
          <Button variant="danger" className="w-full" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
          </Button>
        )}
      </div>
    </div>
  )
}
