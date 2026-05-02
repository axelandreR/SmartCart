/**
 * Supabase Storage service — product images
 * Bucket: product-images (public read, authenticated write)
 * Max size: 5 MB. Accepted: jpeg, png, webp, heic.
 */
import supabase from './supabase'

const BUCKET   = 'product-images'
const MAX_PX   = 800   // longest side in pixels
const QUALITY  = 0.75  // WebP quality (75%)

/**
 * Compress and resize an image client-side using the Canvas API.
 * Output: WebP at 75% quality, longest side capped at 800px.
 * A 4 MB mobile photo typically becomes ~80–150 KB.
 * @param {File} file
 * @returns {Promise<File>}
 */
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const src = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(src)

      let { width, height } = img
      if (width > MAX_PX || height > MAX_PX) {
        if (width >= height) {
          height = Math.round(height * MAX_PX / width)
          width  = MAX_PX
        } else {
          width  = Math.round(width * MAX_PX / height)
          height = MAX_PX
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('compressImage: toBlob failed')); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }))
        },
        'image/webp',
        QUALITY,
      )
    }

    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('compressImage: load failed')) }
    img.src = src
  })
}

/**
 * Upload or replace a product image.
 * Returns the public URL of the uploaded image.
 * @param {string} productId
 * @param {File} file
 * @returns {Promise<string>} public URL
 */
export async function uploadProductImage(productId, file) {
  // Sanitise extension
  const ext = file.name.split('.').pop().toLowerCase().replace('heic', 'jpg')
  const path = `${productId}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  // Bust cache with timestamp so the <img> reloads
  return `${data.publicUrl}?t=${Date.now()}`
}

/**
 * Delete a product's image from storage.
 * @param {string} productId
 */
export async function deleteProductImage(productId) {
  // Try both common extensions
  const paths = [`${productId}.jpg`, `${productId}.png`, `${productId}.webp`]
  await supabase.storage.from(BUCKET).remove(paths)
}

/**
 * Compress and upload a shopping list item photo.
 * Compresses client-side to WebP ≤800px before uploading.
 * Uses a random UUID path — no item ID needed upfront.
 * @param {File} file
 * @returns {Promise<string>} public URL
 */
export async function uploadItemPhoto(file) {
  const compressed = await compressImage(file)
  const path = `items/${crypto.randomUUID()}.webp`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { upsert: false, contentType: 'image/webp' })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Delete a shopping list item photo from storage.
 * Safe to call with null/undefined — silently skips.
 * Only removes paths under items/ to prevent accidental product image deletion.
 * @param {string|null|undefined} imageUrl  — full public URL stored in the DB
 */
export async function deleteItemPhoto(imageUrl) {
  if (!imageUrl) return
  const marker = `/${BUCKET}/`
  const idx    = imageUrl.indexOf(marker)
  if (idx === -1) return
  const path = imageUrl.slice(idx + marker.length).split('?')[0]
  if (!path.startsWith('items/')) return  // safety guard
  await supabase.storage.from(BUCKET).remove([path])
}
