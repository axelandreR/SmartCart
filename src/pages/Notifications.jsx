import { Bell, BellOff, TrendingDown, ShoppingCart, AlertCircle } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatRelative } from '@/utils/formatters'

// In a real app, notifications come from Supabase or a push notification service
const MOCK_NOTIFICATIONS = []

export default function Notifications() {
  return (
    <div className="flex flex-col min-h-full">
      <PageHeader back title="Notificaciones" />

      <div className="flex-1 px-4 py-4 pb-24 space-y-3">
        {MOCK_NOTIFICATIONS.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Sin notificaciones"
            description="Te avisaremos cuando haya bajas de precios o listas pendientes"
          />
        ) : (
          MOCK_NOTIFICATIONS.map((n, i) => (
            <Card key={i} className={`flex items-start gap-3 ${!n.read ? 'border-l-4 border-primary-500' : ''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                n.type === 'price_drop' ? 'bg-secondary-50' :
                n.type === 'list_reminder' ? 'bg-primary-50' : 'bg-accent-50'
              }`}>
                {n.type === 'price_drop' ? <TrendingDown className="w-4 h-4 text-secondary-500" /> :
                 n.type === 'list_reminder' ? <ShoppingCart className="w-4 h-4 text-primary-500" /> :
                 <AlertCircle className="w-4 h-4 text-accent-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{formatRelative(n.createdAt)}</p>
              </div>
              {!n.read && <Badge variant="primary" className="shrink-0">Nueva</Badge>}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
