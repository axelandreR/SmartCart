# SmartCart

Aplicación PWA para gestión de listas de compras con historial de precios, escáner de códigos de barras e integración con Supabase y Google Sheets.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **PWA**: vite-plugin-pwa + Workbox
- **Escáner**: html5-qrcode + Open Food Facts API
- **Exportación**: Google Sheets API v4
- **Charts**: Recharts
- **State**: Zustand + custom hooks

## Colores

| Token      | Hex       |
|------------|-----------|
| Primary    | `#534AB7` |
| Secondary  | `#0F6E56` |
| Accent     | `#854F0B` |

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# 3. Base de datos
# Ejecutar supabase/migrations/001_initial_schema.sql en Supabase SQL Editor

# 4. Desarrollo
npm run dev

# 5. Build PWA
npm run build
```

## Páginas (13 interfaces)

| Ruta | Página |
|------|--------|
| `/` | Home / Dashboard |
| `/lists` | Mis listas |
| `/lists/new` | Nueva lista |
| `/lists/:id` | Detalle de lista |
| `/scanner` | Escáner de códigos |
| `/products` | Catálogo de productos |
| `/products/:id` | Detalle de producto |
| `/products/:id/prices` | Historial de precios |
| `/stores` | Tiendas |
| `/categories` | Categorías |
| `/history` | Historial de compras |
| `/budget` | Presupuesto |
| `/analytics` | Análisis y estadísticas |
| `/notifications` | Notificaciones |
| `/settings` | Ajustes |
| `/profile` | Perfil de usuario |
