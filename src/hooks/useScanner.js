import { useState, useCallback, useRef } from 'react'
import { startScanner, stopScanner, isCameraSupported, lookupBarcode, searchProductsByName, toggleTorch as serviceTorch } from '@/services/barcodeScanner'
import { productsService } from '@/services/products'
import { useLocale } from '@/hooks/useLocale'
import toast from 'react-hot-toast'

export function useScanner() {
  const { offTag } = useLocale()
  const [scanning, setScanning]       = useState(false)
  const [lastCode, setLastCode]       = useState(null)
  const [lookupResult, setLookupResult] = useState(null)
  const [lookingUp, setLookingUp]     = useState(false)
  const [torchOn, setTorchOn]         = useState(false)
  const cooldownRef = useRef(false)

  /** Perform a full product lookup: local DB first, then Open Food Facts */
  const lookup = useCallback(async (barcode) => {
    setLastCode(barcode)
    setLookingUp(true)

    let localProduct = null
    try {
      localProduct = await productsService.getByBarcode(barcode)
    } catch (err) {
      console.error('[Scanner] Error en búsqueda local:', err)
    }

    const offProduct = await lookupBarcode(barcode)

    let result = null
    if (localProduct || offProduct) {
      result = {
        barcode,
        name:       localProduct?.name      || offProduct?.name      || '',
        brand:      localProduct?.brand     || offProduct?.brand     || '',
        category:   localProduct?.category  || offProduct?.category  || '',
        imageUrl:   localProduct?.image_url || offProduct?.imageUrl  || '',
        nutriScore: offProduct?.nutriScore  || null,
        ingredients: offProduct?.ingredients || '',
        quantity:   offProduct?.quantity    || '',
        isLocal:    !!localProduct,
        localId:    localProduct?.id        || null,
      }
    }

    setLookupResult(result)
    setLookingUp(false)
    return result
  }, [])

  const start = useCallback(async (elementId, onResult) => {
    if (!isCameraSupported()) {
      toast.error('Tu navegador no soporta acceso a la cámara')
      return
    }

    setScanning(true)
    setLastCode(null)
    setLookupResult(null)

    try {
      await startScanner(
        elementId,
        async (barcode) => {
          if (cooldownRef.current) return
          cooldownRef.current = true
          setTimeout(() => { cooldownRef.current = false }, 2500)

          const productInfo = await lookup(barcode)
          onResult?.({ barcode, productInfo })
        },
        (err) => console.warn('[Scanner]', err)
      )
    } catch (err) {
      setScanning(false)
      if (err.name === 'NotAllowedError') {
        toast.error('Permiso de cámara denegado')
      } else {
        toast.error('No se pudo iniciar el escáner')
      }
    }
  }, [lookup])

  const stop = useCallback(async () => {
    await stopScanner()
    setScanning(false)
    setTorchOn(false)
  }, [])

  const toggleTorch = useCallback(async (on) => {
    const supported = await serviceTorch(on)
    if (supported) setTorchOn(on)
    return supported
  }, [])

  return { scanning, lastCode, lookupResult, lookingUp, torchOn, start, stop, toggleTorch, lookup }
}
