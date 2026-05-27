# Login Redesign — Spec

**Date:** 2026-05-27
**File a modificar:** `src/app/pages/Login.tsx`
**Asset:** `public/images/Logo_Pits.webp`

---

## Objetivo

Rediseñar la página de login tomando como referencia visual el sitio pitscorp.com, usando el logo oficial de PITS y la paleta de color teal del logotipo. Mantener toda la lógica de autenticación existente intacta.

---

## Layout

Dos columnas en desktop, una sola columna en mobile:

| Columna | Ancho | Fondo |
|---|---|---|
| Izquierda (marca) | 55% (`lg:w-[55%]`) | Blanco `#ffffff` |
| Derecha (formulario) | 45% (`lg:w-[45%]`) | Gris suave `#f8fafc` |

En mobile (`< lg`): solo se renderiza el panel derecho.

---

## Paleta de color

| Token | Valor | Uso |
|---|---|---|
| `teal-brand` | `#4DBFB8` | Botón, línea separadora, números de stats, iconos de campos |
| `teal-hover` | `#3DAFA8` | Hover del botón |
| `teal-light` | `#E8F7F6` | Fondo suave de stat-cards |
| `gray-50` | `#f8fafc` | Fondo panel derecho |
| `gray-900` | `#111827` | Texto principal |
| `gray-500` | `#6b7280` | Texto secundario |

---

## Panel izquierdo (marca)

Estructura vertical con `justify-between`, altura completa:

1. **Logo** — `<img src="/images/Logo_Pits.webp">`, ancho `200px`, alineado a la izquierda.
2. **Línea separadora teal** — `<hr>` de 3px de alto, color `#4DBFB8`, ancho completo, margin vertical `24px`.
3. **Bloque central:**
   - Etiqueta superior: `"GESTIÓN DE TALLER"` — uppercase, tracking wide, `#4DBFB8`, `text-xs`.
   - Titular: `"Ordenes, islas y tiempos reales en una sola pantalla de trabajo."` — `text-4xl`, `font-medium`, `text-gray-900`.
   - Subtexto: `"Sistema conectado a Supabase para controlar estados y proyectar el avance del taller."` — `text-base`, `text-gray-500`.
4. **Stats (3 cards)** en grid de 3 columnas:
   - Número grande en `#4DBFB8` (`text-2xl font-semibold`)
   - Label en `text-gray-500 text-sm`
   - Fondo `#E8F7F6`, borde `#4DBFB8/20`, `rounded-lg p-4`
   - Contenido: `4 / islas base`, `10 / estados`, `Flat rate / listo`
5. **Footer:** `© OneWayEc` — `text-xs text-gray-400`.

---

## Panel derecho (formulario)

- Fondo `#f8fafc`, centrado con `flex items-center justify-center`, padding `p-8`.
- **Card** blanca, `rounded-2xl`, sombra `shadow-sm`, borde `border border-gray-100`, `max-w-md w-full`, `p-8`.

Contenido de la card (de arriba a abajo):

1. **Logo pequeño** — mismo `Logo_Pits.webp`, ancho `120px`, `mb-6`. Solo visible cuando el panel izquierdo está oculto (`lg:hidden`).
2. **Título** — `"Iniciar sesión"`, `text-2xl font-semibold text-gray-900`.
3. **Subtítulo** — `"Ingresa tus credenciales para acceder al sistema."`, `text-sm text-gray-500 mt-1 mb-6`.
4. **Alert de error** — igual al actual, solo visible si hay error.
5. **Campo Usuario** — label + input, sin cambios funcionales. Focus ring en teal.
6. **Campo Contraseña** — label + input type password. Focus ring en teal.
7. **Botón "Entrar"** — ancho completo, fondo `#4DBFB8`, texto blanco, hover `#3DAFA8`, `rounded-lg`, `h-11`. Estado loading: `"Verificando..."` con `Loader2` spinner.

**Focus ring personalizado:** reemplazar el ring azul de shadcn con teal via clase Tailwind `focus-visible:ring-[#4DBFB8]` en los inputs.

---

## Comportamiento

- Toda la lógica de autenticación (`login`, `navigate`, `isAuthenticated`) permanece sin cambios.
- El redirect a `from` después del login permanece sin cambios.
- El estado `isLoading` sigue bloqueando los campos y el botón mientras se verifica.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/app/pages/Login.tsx` | Reemplazo completo del JSX; lógica intacta |

No se requieren nuevos componentes ni dependencias.
