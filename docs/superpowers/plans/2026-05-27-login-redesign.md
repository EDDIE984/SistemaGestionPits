# Login Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar `Login.tsx` con identidad visual PITS (logo real, color teal `#4DBFB8`), layout dos columnas, sin tocar la lógica de autenticación.

**Architecture:** Reemplazo completo del JSX de `Login.tsx`. La lógica (`login`, `navigate`, `isAuthenticated`, estados) permanece exactamente igual. Solo cambian los imports de iconos/componentes UI y el bloque `return`.

**Tech Stack:** React, Tailwind CSS v4, shadcn/ui (Alert, Input, Label), Lucide React.

---

## File Map

| Archivo | Acción |
|---|---|
| `src/app/pages/Login.tsx` | Modificar — reemplazar JSX completo, ajustar imports |

Asset ya existente: `public/images/Logo_Pits.webp` — no requiere cambios.

---

### Task 1: Actualizar imports de `Login.tsx`

**Files:**
- Modify: `src/app/pages/Login.tsx:1-10`

Los imports actuales traen `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `LockKeyhole` y `Wrench` que ya no se usarán. Se agrega `Loader2` para el spinner del botón.

- [ ] **Step 1: Reemplazar bloque de imports**

Abrir `src/app/pages/Login.tsx` y reemplazar las líneas 1–10 con:

```tsx
import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/auth/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
```

> Nota: `Button` de shadcn solo se usa como fallback — el botón principal de submit usa un `<button>` nativo con clases teal para control total del color.

- [ ] **Step 2: Verificar que no queden imports sin usar**

Revisar que ningún símbolo importado quede sin referencia en el JSX que se escribirá en Task 2. Lista esperada de uso:
- `FormEvent`, `useState` → lógica existente
- `Navigate`, `useLocation`, `useNavigate` → lógica existente
- `AlertCircle`, `Loader2` → JSX nuevo
- `useAuth` → lógica existente
- `Alert`, `AlertDescription`, `AlertTitle` → JSX nuevo
- `Button` → puede eliminarse si no se usa en el JSX final (ver Task 2)
- `Input`, `Label` → JSX nuevo

---

### Task 2: Reemplazar el bloque `return` con el nuevo diseño

**Files:**
- Modify: `src/app/pages/Login.tsx:44-137`

- [ ] **Step 1: Reemplazar todo el bloque `return (...)` con el siguiente JSX**

```tsx
  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo — marca */}
      <section className="hidden lg:flex lg:w-[55%] flex-col justify-between bg-white border-r border-gray-100 p-12">
        <div>
          <img
            src="/images/Logo_Pits.webp"
            alt="PITS Latonería y Pintura Express"
            className="w-[200px]"
          />
          <hr className="mt-6 border-0 h-[3px] bg-[#4DBFB8]" />
        </div>

        <div className="max-w-lg">
          <p className="text-xs font-medium uppercase tracking-widest text-[#4DBFB8]">
            Gestión de Taller
          </p>
          <h2 className="mt-4 text-4xl font-medium leading-tight text-gray-900">
            Ordenes, islas y tiempos reales en una sola pantalla de trabajo.
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-500">
            Sistema conectado a Supabase para controlar estados y proyectar el avance del taller.
          </p>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '4', label: 'islas base' },
              { value: '10', label: 'estados' },
              { value: 'Flat', label: 'rate listo' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-[#4DBFB8]/20 bg-[#E8F7F6] p-4"
              >
                <p className="text-2xl font-semibold text-[#4DBFB8]">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-gray-400">© OneWayEc</p>
        </div>
      </section>

      {/* Panel derecho — formulario */}
      <main className="flex w-full lg:w-[45%] items-center justify-center bg-[#f8fafc] p-8">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <img
            src="/images/Logo_Pits.webp"
            alt="PITS"
            className="mb-6 w-[120px] lg:hidden"
          />

          <h1 className="text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
          <p className="mt-1 mb-6 text-sm text-gray-500">
            Ingresa tus credenciales para acceder al sistema.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No se pudo ingresar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                disabled={isLoading}
                className="focus-visible:ring-[#4DBFB8]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
                className="focus-visible:ring-[#4DBFB8]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#4DBFB8] text-sm font-medium text-white transition-colors hover:bg-[#3DAFA8] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
```

---

### Task 3: Build y verificación

**Files:**
- No new files

- [ ] **Step 1: Ejecutar build de TypeScript/Vite**

```bash
npm run build
```

Salida esperada: sin errores de TypeScript. Si hay error de tipo `unused import`, eliminar el import correspondiente.

- [ ] **Step 2: Levantar dev server y verificar visualmente**

```bash
npm run dev
```

Abrir `http://localhost:5173` y verificar:
- [ ] En desktop (≥1024px): dos columnas visibles, logo grande a la izquierda, línea teal, stats con fondo `#E8F7F6`
- [ ] En mobile (<1024px): solo panel derecho, logo pequeño visible arriba del formulario
- [ ] Botón teal, hover más oscuro
- [ ] Focus ring teal en los inputs
- [ ] Login con credenciales válidas funciona y redirige correctamente
- [ ] Login con credenciales inválidas muestra el alert de error

- [ ] **Step 3: Commit**

```bash
git add src/app/pages/Login.tsx
git commit -m "Rediseña login con identidad visual PITS teal y logo oficial"
```

---

## Notas de implementación

- `border-[#4DBFB8]/20` usa la sintaxis de opacidad de Tailwind v4 con color arbitrario — funciona sin configuración adicional.
- `focus-visible:ring-[#4DBFB8]` sobreescribe el ring por defecto de shadcn Input. Si el resultado visual no es suficiente (el ring de shadcn tiene múltiples capas), agregar también `focus-visible:ring-offset-0` o ajustar según lo que se vea en el browser.
- La lógica completa (líneas 11–43 del archivo original) no se toca en ningún task.
