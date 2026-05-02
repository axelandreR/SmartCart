import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { CATEGORIES } from '@/utils/constants'

export default function Categories() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader back title="Categorías" />

      <div className="px-4 py-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => (
            <Card
              key={cat.id}
              onClick={() => navigate(`/products?category=${cat.id}`)}
              className="flex items-center gap-3 py-4"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="font-medium text-gray-800 text-sm">{cat.label}</span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
