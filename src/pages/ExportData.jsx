import { useState, useEffect } from 'react'
import {
  Download, FileSpreadsheet, FileText,
  CheckCircle, Crown, Loader, AlertCircle, Database,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import {
  initGoogleAPI,
  authorizeGoogleSheets,
  exportShoppingHistory,
  fetchExportRecords,
  downloadCSV,
  isGoogleConfigured,
} from '@/services/googleSheets'

// ─── Export option card ───────────────────────────────────────────────────────
function ExportOption({ icon: Icon, title, description, badge, onExport, loading, disabled, disabledReason }) {
  return (
    <Card className={cn('flex items-start gap-4', (loading || disabled) && 'opacity-60')}>
      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {badge && (
            <span className="text-[10px] font-bold text-accent-600 bg-accent-50 px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{description}</p>
        {disabledReason ? (
          <p className="mt-2 text-[11px] text-amber-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {disabledReason}
          </p>
        ) : (
          <button
            type="button"
            onClick={onExport}
            disabled={loading || disabled}
            className="mt-3 btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5 disabled:pointer-events-none"
            aria-label={`Exportar ${title}`}
          >
            {loading ? (
              <Loader className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {loading ? 'Exportando…' : 'Exportar'}
          </button>
        )}
      </div>
    </Card>
  )
}

// ─── Success card ─────────────────────────────────────────────────────────────
function SuccessCard({ title, subtitle }) {
  return (
    <Card className="flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-secondary-500 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ExportData() {
  // 'idle' | 'loading' | 'done'
  const [sheetsState, setSheetsState] = useState('idle')
  const [csvState,    setCsvState]    = useState('idle')
  const [recordCount, setRecordCount] = useState(null)
  const [googleReady, setGoogleReady] = useState(false)

  const googleConfigured = isGoogleConfigured()

  // ── Init Google API once on mount (only if env vars are present) ──────────
  useEffect(() => {
    if (!googleConfigured) return

    // gapi loads async via <script async defer> in index.html.
    // Poll until it's available, then initialise.
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      if (window.gapi) {
        clearInterval(interval)
        try {
          await initGoogleAPI()
          setGoogleReady(true)
        } catch (err) {
          console.error('[ExportData] Google API init failed', err)
        }
      }
      if (attempts > 20) clearInterval(interval) // give up after ~10 s
    }, 500)

    return () => clearInterval(interval)
  }, [googleConfigured])

  // ── Pre-fetch record count for the info section ───────────────────────────
  useEffect(() => {
    fetchExportRecords()
      .then((records) => setRecordCount(records.length))
      .catch(() => {})
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSheetsExport = async () => {
    setSheetsState('loading')
    try {
      await authorizeGoogleSheets()
      const records = await fetchExportRecords()
      await exportShoppingHistory(records)
      setSheetsState('done')
      toast.success(`${records.length} registros exportados a Google Sheets`)
    } catch (err) {
      setSheetsState('idle')
      console.error('[ExportData] Sheets export error', err)
      toast.error('No se pudo exportar. Verificá los permisos de Google.')
    }
  }

  const handleCSVExport = async () => {
    setCsvState('loading')
    try {
      const records = await fetchExportRecords()
      if (records.length === 0) {
        setCsvState('idle')
        toast('No hay datos con precio para exportar.', { icon: '📭' })
        return
      }
      downloadCSV(records)
      setCsvState('done')
      toast.success(`${records.length} registros descargados`)
    } catch (err) {
      setCsvState('idle')
      console.error('[ExportData] CSV export error', err)
      toast.error('No se pudo generar el archivo CSV.')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      <PageHeader back title="Exportar datos" />

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">

        {/* Premium badge */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-accent-50 to-primary-50 border border-accent-100 rounded-2xl px-4 py-3">
          <Crown className="w-4 h-4 text-accent-500 shrink-0" />
          <p className="text-xs text-gray-600 leading-snug">
            <strong className="text-accent-600">Plan Premium activo.</strong>{' '}
            Exportá tus datos en cualquier formato cuando quieras.
          </p>
        </div>

        {/* Export options */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Formatos disponibles
          </h2>
          <div className="space-y-3">

            {sheetsState === 'done' ? (
              <SuccessCard
                title="Google Sheets"
                subtitle="Datos enviados correctamente a tu hoja de cálculo"
              />
            ) : (
              <ExportOption
                icon={FileSpreadsheet}
                title="Google Sheets"
                description="Exportá el historial completo de precios y compras directamente a tu hoja de cálculo de Google."
                badge="Recomendado"
                loading={sheetsState === 'loading'}
                disabled={!googleConfigured || (!googleReady && googleConfigured)}
                disabledReason={
                  !googleConfigured
                    ? 'Requiere configurar VITE_GOOGLE_CLIENT_ID en el .env'
                    : (!googleReady && googleConfigured)
                    ? 'Cargando Google API…'
                    : undefined
                }
                onExport={handleSheetsExport}
              />
            )}

            {csvState === 'done' ? (
              <SuccessCard
                title="CSV"
                subtitle="Archivo descargado correctamente en tu dispositivo"
              />
            ) : (
              <ExportOption
                icon={FileText}
                title="CSV"
                description="Descargá un archivo .csv con todas tus listas, ítems y precios. Compatible con Excel, Google Sheets y LibreOffice."
                loading={csvState === 'loading'}
                onExport={handleCSVExport}
              />
            )}

          </div>
        </section>

        {/* Data scope info */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            ¿Qué incluye la exportación?
          </h2>
          <Card className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Registros disponibles</span>
              <span className="flex items-center gap-1 text-xs font-semibold text-primary-600">
                <Database className="w-3 h-3" />
                {recordCount === null ? '…' : recordCount}
              </span>
            </div>
            {[
              'Ítems con precio de todas tus listas',
              'Fecha, tienda y cantidad por ítem',
              'Código de barras y categoría del producto',
              'Nombre de la lista de origen',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                {item}
              </div>
            ))}
          </Card>
        </section>

      </div>
    </div>
  )
}
