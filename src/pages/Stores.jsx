import { useState } from 'react'
import { Plus, Store, MapPin, Trash2 } from 'lucide-react'
import PageHeader    from '@/components/layout/PageHeader'
import Card          from '@/components/ui/Card'
import Button        from '@/components/ui/Button'
import Input         from '@/components/ui/Input'
import Modal         from '@/components/ui/Modal'
import EmptyState    from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useStores, useStoreMutations } from '@/hooks/useStores'

export default function Stores() {
  const { stores, loading, refetch } = useStores()
  const { createStore, deleteStore, saving } = useStoreMutations(refetch)

  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ name: '', address: '' })

  const handleCreate = async () => {
    const created = await createStore({ name: form.name, address: form.address })
    if (created) {
      setForm({ name: '', address: '' })
      setShowModal(false)
    }
  }

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta tienda? Las listas vinculadas quedarán sin tienda asignada.')) {
      deleteStore(id)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        back
        title="Tiendas"
        actions={
          <Button size="icon" onClick={() => setShowModal(true)} aria-label="Agregar tienda">
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      <div className="flex-1 px-4 py-4 pb-24 space-y-3">
        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : !stores.length ? (
          <EmptyState
            icon={Store}
            title="Sin tiendas registradas"
            description="Agregá los supermercados donde solés comprar para registrar precios por tienda"
            action={<Button onClick={() => setShowModal(true)}>Agregar tienda</Button>}
          />
        ) : (
          stores.map((s) => (
            <Card key={s.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-50 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-secondary-500" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{s.name}</p>
                {s.address && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {s.address}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                disabled={saving}
                className="p-2 rounded-xl text-gray-200 hover:text-red-400 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                aria-label={`Eliminar ${s.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva tienda">
        <div className="space-y-3">
          <Input
            label="Nombre"
            placeholder="Ej: Wong San Isidro"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Input
            label="Dirección (opcional)"
            placeholder="Ej: Av. Santa Cruz 771"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              loading={saving}
              disabled={!form.name.trim()}
            >
              Agregar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
