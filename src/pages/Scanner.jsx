import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, Package, Star, ExternalLink } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useScanner } from '@/hooks/useScanner'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const SCANNER_ELEMENT_ID = 'barcode-scanner-viewfinder'

export default function Scanner() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('listId')
  const { scanning, lastCode, lookupResult, lookingUp, start, stop } = useScanner()
  const startedRef = useRef(false)

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true
      start(SCANNER_ELEMENT_ID)
    }
    return () => { stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col min-h-full bg-black">
      <PageHeader
        back
        title="Escáner"
        className="bg-black/80 border-gray-800 text-white"
        actions={
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-white/10">
            <X className="w-5 h-5 text-white" />
          </button>
        }
      />

      {/* Camera viewfinder */}
      <div className="relative flex-1">
        <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />

        {/* Scan overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-72 h-44 relative">
            {/* Corner markers */}
            {['top-0 left-0 border-t-4 border-l-4', 'top-0 right-0 border-t-4 border-r-4',
              'bottom-0 left-0 border-b-4 border-l-4', 'bottom-0 right-0 border-b-4 border-r-4'].map((c, i) => (
              <div key={i} className={`absolute w-8 h-8 ${c} border-primary-400 rounded-sm`} />
            ))}
            {/* Scan line */}
            {scanning && (
              <div className="absolute left-1 right-1 h-0.5 bg-primary-400/80 top-1/2 animate-pulse-soft" />
            )}
          </div>
        </div>
      </div>

      {/* Result panel */}
      <div className="bg-white rounded-t-3xl px-4 pt-4 pb-6 space-y-4 min-h-[200px]">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

        {lookingUp ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <LoadingSpinner />
            <p className="text-sm text-gray-500">Buscando producto…</p>
          </div>
        ) : lastCode ? (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-gray-400 font-mono">{lastCode}</p>

            {lookupResult ? (
              <div className="flex gap-3">
                {lookupResult.imageUrl && (
                  <img src={lookupResult.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{lookupResult.name || 'Producto sin nombre'}</p>
                  {lookupResult.brand && <p className="text-sm text-gray-500">{lookupResult.brand}</p>}
                  <div className="flex gap-2 mt-1.5">
                    {lookupResult.category && <Badge variant="gray">{lookupResult.category}</Badge>}
                    {lookupResult.nutriScore && (
                      <Badge variant={lookupResult.nutriScore <= 'B' ? 'success' : 'warning'}>
                        Nutri-Score {lookupResult.nutriScore}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <Package className="w-8 h-8 text-gray-300" />
                <div>
                  <p className="font-medium text-gray-700">Producto no encontrado</p>
                  <p className="text-xs text-gray-400">Puedes agregarlo manualmente</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => navigate(`/products/${lastCode}`)}
              >
                Ver precios
              </Button>
              {listId && (
                <Button
                  className="flex-1"
                  onClick={() => navigate(`/lists/${listId}?barcode=${lastCode}`)}
                >
                  Agregar a lista
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 text-center gap-2">
            <p className="text-gray-600 font-medium">Apunta la cámara al código de barras</p>
            <p className="text-sm text-gray-400">Compatible con EAN-13, QR, Code128 y más</p>
          </div>
        )}
      </div>
    </div>
  )
}
