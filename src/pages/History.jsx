import { useState } from 'react'
import { Clock, CheckCircle, FileSpreadsheet } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useShoppingLists } from '@/hooks/useShoppingList'
import { formatDate } from '@/utils/formatters'
import { fetchExportRecords, exportShoppingHistory } from '@/services/googleSheets'
import toast from 'react-hot-toast'

export default function History() {
  const { data: lists, loading } = useShoppingLists()
  const [exporting, setExporting] = useState(false)

  const completedLists = lists?.filter((l) => l.status === 'completed') ?? []

  const handleExport = async () => {
    setExporting(true)
    try {
      const records = await fetchExportRecords()
      await exportShoppingHistory(records)
      toast.success('Exportado a Google Sheets')
    } catch {
      toast.error('Activa Google Sheets en Ajustes primero')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        back
        title="Historial de compras"
        actions={
          <Button size="sm" variant="ghost" onClick={handleExport} loading={exporting}>
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Exportar
          </Button>
        }
      />

      <div className="flex-1 px-4 py-4 pb-24 space-y-3">
        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : !completedLists.length ? (
          <EmptyState
            icon={Clock}
            title="Sin historial"
            description="Tus listas completadas aparecerán aquí"
          />
        ) : (
          completedLists.map((list) => (
            <Card key={list.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-50 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-secondary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{list.name}</p>
                <p className="text-xs text-gray-400">{formatDate(list.completed_at ?? list.updated_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-700">
                  {list.shopping_list_items?.[0]?.count ?? 0} ítems
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
