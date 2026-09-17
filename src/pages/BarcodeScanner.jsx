import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, Zap, ZapOff, Keyboard, BookOpen, Package, CheckCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useScanner } from '@/hooks/useScanner'

const SCANNER_ID = 'barcode-scanner-fullscreen'

// ─── Nutri-Score badge variant ────────────────────────────────────────────────
function nutriVariant(grade) {
  if (!grade) return 'gray'
  return ['A', 'B'].includes(grade) ? 'success' : grade === 'C' ? 'warning' : 'danger'
}

// ─── Product result card ──────────────────────────────────────────────────────
function ProductCard({ result, lastCode, listId, onViewPrices, onAddToList }) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex gap-3 items-start">
        {result.imageUrl ? (
          <img
            src={result.imageUrl}
            alt={result.name}
            className="w-16 h-16 rounded-xl object-cover bg-gray-100 flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center">
            <Package className="w-7 h-7 text-gray-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 leading-tight">
            {result.name || 'Producto sin nombre'}
          </p>
          {result.brand && (
            <p className="text-sm text-gray-500 truncate">{result.brand}</p>
          )}
          {result.quantity && (
            <p className="text-xs text-gray-400">{result.quantity}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {result.isLocal && (
              <Badge variant="success">
                <CheckCircle className="w-3 h-3 mr-1 inline" />
                En biblioteca
              </Badge>
            )}
            {result.category && (
              <Badge variant="gray">{result.category}</Badge>
            )}
            {result.nutriScore && (
              <Badge variant={nutriVariant(result.nutriScore)}>
                Nutri-Score {result.nutriScore}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1" onClick={onViewPrices}>
          Ver precios
        </Button>
        {listId && (
          <Button size="sm" className="flex-1" onClick={onAddToList}>
            Agregar a lista
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── BarcodeScanner page ──────────────────────────────────────────────────────
export default function BarcodeScanner() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('listId')

  const { scanning, lastCode, lookupResult, lookingUp, torchOn, start, stop, toggleTorch } =
    useScanner()

  const startedRef    = useRef(false)
  const [manualMode, setManualMode]       = useState(false)
  const [manualCode, setManualCode]       = useState('')
  const [torchSupported, setTorchSupported] = useState(true)

  // Start scanner on mount, stop on unmount
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true
      start(SCANNER_ID)
    }
    return () => { stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFlash = async () => {
    const supported = await toggleTorch(!torchOn)
    if (!supported) setTorchSupported(false)
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const code = manualCode.trim()
    if (!code) return
    navigate(`/products/${code}${listId ? `?listId=${listId}` : ''}`)
  }

  const handleViewPrices = () => navigate(`/products/${lastCode}`)
  const handleAddToList  = () => navigate(`/lists/${listId}?barcode=${lastCode}`)

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">

      {/* ── Camera viewfinder (html5-qrcode renders here) ── */}
      <div
        id={SCANNER_ID}
        className={cn(
          'absolute inset-0 overflow-hidden',
          // Suppress html5-qrcode default shaded overlay & header
          '[&_#qr-shaded-region]:!hidden',
          '[&_video]:!absolute [&_video]:!inset-0 [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover',
          '[&>div]:!border-none [&>div]:!p-0',
        )}
      />

      {/* ── UI overlay ── */}
      <div className="absolute inset-0 flex flex-col">

        {/* Top controls with gradient */}
        <div className="bg-gradient-to-b from-black/75 to-transparent px-5 pt-12 pb-10 flex items-center justify-between flex-shrink-0">
          {/* Flash */}
          <button
            onClick={handleFlash}
            disabled={!torchSupported}
            className={cn(
              'p-3 rounded-full backdrop-blur-sm transition-colors',
              torchOn
                ? 'bg-yellow-400 text-black'
                : 'bg-white/20 text-white hover:bg-white/30',
              !torchSupported && 'opacity-30 pointer-events-none'
            )}
            aria-label={torchOn ? 'Apagar flash' : 'Encender flash'}
          >
            {torchOn
              ? <Zap className="w-5 h-5 fill-current" />
              : <ZapOff className="w-5 h-5" />
            }
          </button>

          {/* Close */}
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
            aria-label="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan frame — centered, cutout effect via box-shadow */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-72 h-44 relative rounded-sm"
              style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.52)' }}
            >
              {/* Purple corner markers */}
              {[
                'top-0 left-0 border-t-4 border-l-4 rounded-tl-sm',
                'top-0 right-0 border-t-4 border-r-4 rounded-tr-sm',
                'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-sm',
                'bottom-0 right-0 border-b-4 border-r-4 rounded-br-sm',
              ].map((cls, i) => (
                <div
                  key={i}
                  className={cn('absolute w-8 h-8 border-[#534AB7]', cls)}
                />
              ))}

              {/* Animated scan line */}
              {scanning && !lastCode && (
                <div className="absolute left-2 right-2 h-0.5 bg-[#534AB7]/80 animate-pulse top-1/2" />
              )}

              {/* Success border */}
              {lastCode && (
                <div className="absolute inset-0 border-2 border-green-400 rounded-sm bg-green-400/10 transition-all" />
              )}
            </div>

            {/* Hint */}
            {!lastCode && !lookingUp && (
              <p className="text-white/60 text-sm text-center px-6">
                {scanning
                  ? 'Apuntá la cámara al código de barras'
                  : 'Iniciando cámara…'}
              </p>
            )}
          </div>
        </div>

        {/* Spacer so camera stays visible behind the panel */}
        <div className="h-64 flex-shrink-0" />
      </div>

      {/* ── Bottom result panel ── */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-4 pt-3 pb-8 space-y-3 shadow-2xl">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />

        {/* States */}
        {lookingUp ? (
          <div className="flex items-center justify-center gap-3 py-4">
            <LoadingSpinner />
            <p className="text-sm text-gray-500">Buscando producto…</p>
          </div>
        ) : lastCode && lookupResult ? (
          <ProductCard
            result={lookupResult}
            lastCode={lastCode}
            listId={listId}
            onViewPrices={handleViewPrices}
            onAddToList={handleAddToList}
          />
        ) : lastCode && !lookupResult ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <Package className="w-8 h-8 text-gray-300 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700 text-sm">Producto no encontrado</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{lastCode}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/products/${lastCode}`)}
            >
              Crear producto con este código
            </Button>
          </div>
        ) : null}

        {/* Manual entry / Library search */}
        {!manualMode ? (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setManualMode(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <Keyboard className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Ingresar código</span>
            </button>
            <button
              onClick={() => navigate('/products')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Buscar en biblioteca</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="flex gap-2 pt-1">
            <input
              type="text"
              inputMode="numeric"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ej: 7790040004831"
              autoFocus
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
            <Button type="submit" size="sm" disabled={!manualCode.trim()}>
              Buscar
            </Button>
            <button
              type="button"
              onClick={() => { setManualMode(false); setManualCode('') }}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              aria-label="Cancelar"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
