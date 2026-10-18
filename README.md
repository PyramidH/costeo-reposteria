# Costeo de Repostería

App local-first (PWA) para que reposteras y pequeños negocios de comida por encargo
sepan **cuánto les cuesta de verdad cada producto y cuánto cobrar**.

Pensada para Guatemala primero (libras/onzas, quetzales, insumos locales), diseñada
para extenderse a Centroamérica y Latinoamérica.

## Estado

Fase 1 — v1 usable en local: recetas con sub-recetas, costeo en vivo, precio con margen, escalones por volumen y calculadora inversa. Sin cuenta ni sincronización.

## Decisiones de producto

- **Una sola cosa bien:** costeo y precio. Pedidos, agenda y catálogo quedan fuera de v1.
- **Gratis sin cuenta y sin límite:** todo el costeo corre en el dispositivo (IndexedDB).
  Lo de pago es lo que cuesta servidor o convierte el hobby en negocio: respaldo y
  sincronización, cotizaciones con marca, historial de precios, promedios de mercado.
- **Educativo sin fricción:** mano de obra, gas/luz y merma vienen apagados; cada uno con
  un tip de una frase y el costo subiendo en vivo al activarlo.
- **Unidades reales:** libras y onzas (la libra de mercado es 460 g, configurable),
  fracciones (`1½`, `¼`), huevo por pieza o por peso, "al gusto" con costo estimado.
- **Sub-recetas desde el día uno:** masa + relleno + decoración es la estructura normal.
- **Catálogo global + local:** cada negocio enlaza sus ingredientes a un canónico, lo que
  permite más adelante agregar precios de mercado de forma anónima.

## Arquitectura

- SvelteKit 3 + TypeScript, SPA estática (`adapter-static`, `ssr = false`).
- `src/lib/catalog/` — catálogo global de ingredientes (GT) con precios de referencia editables.
- `src/lib/costing/` — motor puro, sin dependencias, con pruebas (`npm test`).
  Dinero en centavos enteros; cantidades convertidas a g/ml/pza.
- `src/lib/db/` — Dexie (IndexedDB) con campos de sincronización (`updatedAt`,
  `deletedAt`, `businessId`) para un sync last-write-wins futuro contra Supabase.
- Service worker: pendiente (ver `docs/service-worker.pending.ts`); `$service-worker`
  aún no resuelve con SvelteKit 3 / Vite 8.

## Desarrollo

```bash
npm install
npm test          # pruebas del motor
npm run dev       # servidor local
npm run build     # build estático en ./build
```

## Sugerencias

El botón "Sugerencias" abre WhatsApp con un mensaje prellenado (incluye versión y
pantalla). El número va en `VITE_SUGGEST_WHATSAPP` (ver `.env.example`); sin él,
cae a `mailto:`.

## Despliegue

`main` se publica en GitHub Pages con `.github/workflows/pages.yml`
(https://pyramidh.github.io/costeo-reposteria/). El build recibe `BASE_PATH=/<repo>`
y copia `index.html` a `404.html` para que la SPA resuelva rutas internas.
El número de WhatsApp sale de la variable de repositorio `SUGGEST_WHATSAPP`.
Para Cloudflare Pages o Vercel basta no definir `BASE_PATH`.
