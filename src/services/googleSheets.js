/**
 * Google Sheets API integration
 * Uses gapi (Google API client) loaded via script tag in index.html.
 *
 * Required env vars:
 *   VITE_GOOGLE_API_KEY     – Google Cloud API key (Sheets read access)
 *   VITE_GOOGLE_CLIENT_ID   – OAuth 2.0 client ID
 *   VITE_GOOGLE_SHEET_ID    – Target spreadsheet ID (optional; creates rows via append)
 */

import supabase from './supabase'

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4'
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'

let tokenClient = null
let gapiInited = false
let gisInited = false

/** Call once on app boot after gapi script loads */
export async function initGoogleAPI() {
  await new Promise((resolve) => {
    window.gapi.load('client', resolve)
  })
  await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: [DISCOVERY_DOC] })
  gapiInited = true

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '',
  })
  gisInited = true
}

/** Request user consent and get access token */
export function authorizeGoogleSheets() {
  return new Promise((resolve, reject) => {
    if (!gapiInited || !gisInited) {
      reject(new Error('Google API not initialized'))
      return
    }
    tokenClient.callback = (resp) => {
      if (resp.error) reject(resp)
      else resolve(resp)
    }
    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' })
    } else {
      tokenClient.requestAccessToken({ prompt: '' })
    }
  })
}

/** Read a range from the configured spreadsheet */
export async function readRange(range) {
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  })
  return response.result.values ?? []
}

/** Append rows to a sheet */
export async function appendRows(range, values) {
  const response = await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  })
  return response.result
}

/** Update a specific range */
export async function updateRange(range, values) {
  const response = await window.gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  })
  return response.result
}

/** Export SmartCart data to Google Sheets */
export async function exportShoppingHistory(records) {
  const headers = [['Fecha', 'Lista', 'Producto', 'Barcode', 'Precio', 'Cantidad', 'Tienda', 'Categoría']]
  const rows = records.map((r) => [
    r.date,
    r.list   ?? '',
    r.name,
    r.barcode ?? '',
    r.price,
    r.quantity,
    r.store   ?? '',
    r.category ?? '',
  ])
  await appendRows('Historial!A1', [...headers, ...rows])
}

/**
 * Check whether the Google API env vars are configured.
 * Used to show/hide the Sheets export option in the UI.
 * @returns {boolean}
 */
export function isGoogleConfigured() {
  return !!(
    import.meta.env.VITE_GOOGLE_API_KEY &&
    import.meta.env.VITE_GOOGLE_CLIENT_ID
  )
}

/**
 * Fetch all priced shopping-list items from Supabase,
 * normalized into the flat record shape expected by exportShoppingHistory / downloadCSV.
 *
 * @returns {Promise<Array<{
 *   date: string,
 *   list: string,
 *   name: string,
 *   barcode: string,
 *   price: number,
 *   quantity: number,
 *   store: string,
 *   category: string,
 * }>>}
 */
export async function fetchExportRecords() {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select(`
      name,
      price,
      quantity,
      barcode,
      created_at,
      shopping_lists ( name, completed_at, stores ( name ) ),
      products ( barcode, category, brand )
    `)
    .not('price', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((item) => ({
    date:     formatExportDate(item.shopping_lists?.completed_at ?? item.created_at),
    list:     item.shopping_lists?.name           ?? '',
    name:     item.name                           ?? '',
    barcode:  item.barcode ?? item.products?.barcode ?? '',
    price:    item.price,
    quantity: item.quantity ?? 1,
    store:    item.shopping_lists?.stores?.name   ?? '',
    category: item.products?.category             ?? '',
  }))
}

/**
 * Generate a CSV file from export records and trigger a browser download.
 * Includes a UTF-8 BOM so Excel opens it correctly without encoding issues.
 *
 * @param {Array} records – output of fetchExportRecords()
 */
export function downloadCSV(records) {
  const headers = ['Fecha', 'Lista', 'Producto', 'Barcode', 'Precio', 'Cantidad', 'Tienda', 'Categoría']
  const rows = records.map((r) => [
    r.date,
    r.list,
    r.name,
    r.barcode,
    r.price,
    r.quantity,
    r.store,
    r.category,
  ])

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    )
    .join('\n')

  // UTF-8 BOM (﻿) ensures Excel on Windows reads accents correctly
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `smartcart_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function formatExportDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric',
    })
  } catch {
    return dateStr
  }
}
