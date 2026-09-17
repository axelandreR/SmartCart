import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, CheckCircle, Circle, ScanLine, MoreVertical } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useShoppingList } from '@/hooks/useShoppingList'
import { formatPrice } from '@/utils/formatters'
import { cn } from '@/utils/cn'

export default function ListDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { list, loading, saving, toggleItem, addItem, removeItem, completeList } = useShoppingList(id)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, price: '' })

  const items = list?.shopping_list_items ?? []
  const checked = items.filter((i) => i.checked).length
  const progress = items.length ? (checked / items.length) * 100 : 0
  const total = items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0)

  const handleAdd = async () => {
    if (!newItem.name.trim()) return
    await addItem({ name: newItem.name, quantity: Number(newItem.quantity), price: newItem.price ? Number(newItem.price) : null })
    setNewItem({ name: '', quantity: 1, price: '' })
    setShowAddModal(false)
  }

  if (loading) return <LoadingSpinner className="min-h-screen" />

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        back
        title={list?.name ?? 'Lista'}
        subtitle={`${checked}/${items.length} ítems`}
        actions={
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => navigate(`/scanner?listId=${id}`)}>
              <ScanLine className="w-5 h-5" />
            </Button>
            <Button size="icon" onClick={() => setShowAddModal(true)}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        }
      />

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="px-4 py-2 bg-white border-b border-gray-100">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 px-4 py-4 pb-32 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <p className="text-gray-500 text-sm">Lista vacía. Agrega ítems para empezar.</p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Agregar ítem
            </Button>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-card transition-all',
                item.checked && 'opacity-60'
              )}
            >
              <button
                onClick={() => toggleItem(item.id, !item.checked)}
                className="shrink-0 text-secondary-500"
                disabled={saving}
              >
                {item.checked
                  ? <CheckCircle className="w-5 h-5" />
                  : <Circle className="w-5 h-5 text-gray-300" />
                }
              </button>

              <div className="flex-1 min-w-0">
                <p className={cn('font-medium text-gray-900 truncate', item.checked && 'line-through text-gray-400')}>
                  {item.name ?? item.products?.name}
                </p>
                <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
                  <span>x{item.quantity ?? 1}</span>
                  {item.price && <span>{formatPrice(item.price)}</span>}
                </div>
              </div>

              <button
                onClick={() => removeItem(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom total + complete */}
      {items.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Total estimado</p>
            <p className="text-lg font-bold text-primary-600">{formatPrice(total)}</p>
          </div>
          {progress === 100 && (
            <Button variant="secondary" onClick={completeList} loading={saving}>
              Completar lista
            </Button>
          )}
        </div>
      )}

      {/* Add item modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Agregar ítem">
        <div className="space-y-3">
          <Input
            label="Nombre del producto"
            placeholder="Ej: Leche entera"
            value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            required
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cantidad"
              type="number"
              min="1"
              value={newItem.quantity}
              onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
            />
            <Input
              label="Precio (opcional)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={newItem.price}
              onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleAdd} loading={saving}>
              Agregar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
