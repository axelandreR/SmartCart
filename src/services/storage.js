/**
 * Supabase Storage service — product images
 * Bucket: product-images (public read, authenticated write)
 * Max size: 5 MB. Accepted: jpeg, png, webp, heic.
 */
import supabase from './supabase'

const BUCKET = 'product-images'

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
 * Upload a shopping list item photo.
 * Uses a random UUID as the path so no item ID is needed upfront.
 * Returns the public URL of the uploaded image.
 * @param {File} file
 * @returns {Promise<string>} public URL
 */
export async function uploadItemPhoto(file) {
  const id  = crypto.randomUUID()
  const ext = file.name.split('.').pop().toLowerCase().replace('heic', 'jpg')
  const path = `items/${id}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
