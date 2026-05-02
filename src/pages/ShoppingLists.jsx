import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, List, Archive, CheckCircle } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useShoppingLists } from '@/hooks/useShoppingList'
import { formatDate } from '@/utils/formatters'

const TABS = [
  { id: 'active',    label: 'Activas',    status: 'active'    },
  { id: 'completed', label: 'Completadas',status: 'completed' },
  { id: 'archived',  label: 'Archivadas', status: 'archived'  },
]

export default function ShoppingLists() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('active')
  const { data: lists, loading } = useShoppingLists()

  const filtered = lists?.filter((l) => l.status === tab) ?? []

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Mis Listas"
        actions={
          <Button size="icon" onClick={() => navigate('/lists/new')}>
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white px-4 gap-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-4 pb-24 space-y-3">
        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={List}
            title={tab === 'active' ? 'Sin listas activas' : 'Sin listas aquí'}
            description={tab === 'active' ? 'Crea tu primera lista de compras' : undefined}
            action={tab === 'active' && (
              <Button onClick={() => navigate('/lists/new')}>
                <Plus className="w-4 h-4 mr-1" /> Crear lista
              </Button>
            )}
          />
        ) : (
          filtered.map((list) => (
            <Card
              key={list.id}
              onClick={() => navigate(
                list.status === 'active' ? `/shopping/${list.id}` : `/lists/${list.id}`
              )}
              className="flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                list.status === 'completed' ? 'bg-secondary-50' :
                list.status === 'archived' ? 'bg-gray-100' : 'bg-primary-50'
              }`}>
                {list.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-secondary-500" />
                ) : list.status === 'archived' ? (
                  <Archive className="w-5 h-5 text-gray-400" />
                ) : (
                  <List className="w-5 h-5 text-primary-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">{list.name}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(list.updated_at)}</p>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={list.status === 'completed' ? 'success' : list.status === 'archived' ? 'gray' : 'primary'}>
                  {list.shopping_list_items?.[0]?.count ?? 0} ítems
                </Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
