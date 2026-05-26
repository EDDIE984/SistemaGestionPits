# Guía de Estilos — OneWayEc Design System

> Referencia completa para replicar el look & feel de este proyecto en nuevos desarrollos.
> Stack: React 18 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + Radix UI

---

## 1. Setup de un Proyecto Nuevo

### 1.1 Crear proyecto base

```bash
npm create vite@latest nombre-proyecto -- --template react-ts
cd nombre-proyecto
```

### 1.2 Instalar dependencias de estilos y UI

```bash
# Tailwind CSS v4 (vía plugin Vite — NO instalar tailwindcss como plugin de PostCSS)
npm install -D tailwindcss@4.1.12 @tailwindcss/vite@4.1.12 @vitejs/plugin-react@4.7.0 vite@6.3.5

# Utilidades de clases
npm install class-variance-authority@0.7.1 clsx@2.1.1 tailwind-merge@3.2.0

# Animaciones extra para Tailwind
npm install tw-animate-css@1.3.8

# Iconos
npm install lucide-react@0.487.0

# Radix UI (todos los primitivos usados)
npm install \
  @radix-ui/react-accordion@1.2.3 \
  @radix-ui/react-alert-dialog@1.1.6 \
  @radix-ui/react-aspect-ratio@1.1.2 \
  @radix-ui/react-avatar@1.1.3 \
  @radix-ui/react-checkbox@1.1.4 \
  @radix-ui/react-collapsible@1.1.3 \
  @radix-ui/react-context-menu@2.2.6 \
  @radix-ui/react-dialog@1.1.6 \
  @radix-ui/react-dropdown-menu@2.1.6 \
  @radix-ui/react-hover-card@1.1.6 \
  @radix-ui/react-label@2.1.2 \
  @radix-ui/react-menubar@1.1.6 \
  @radix-ui/react-navigation-menu@1.2.5 \
  @radix-ui/react-popover@1.1.6 \
  @radix-ui/react-progress@1.1.2 \
  @radix-ui/react-radio-group@1.2.3 \
  @radix-ui/react-scroll-area@1.2.3 \
  @radix-ui/react-select@2.1.6 \
  @radix-ui/react-separator@1.1.2 \
  @radix-ui/react-slider@1.2.3 \
  @radix-ui/react-slot@1.1.2 \
  @radix-ui/react-switch@1.1.3 \
  @radix-ui/react-tabs@1.1.3 \
  @radix-ui/react-toggle@1.1.2 \
  @radix-ui/react-toggle-group@1.1.2 \
  @radix-ui/react-tooltip@1.1.8

# Extras de UI
npm install sonner@2.0.3 next-themes@0.4.6 vaul@1.1.2 cmdk@1.1.1 input-otp@1.4.2

# Formularios, fechas, routing, gráficas
npm install react-hook-form@7.55.0 date-fns@3.6.0 react-day-picker@8.10.1
npm install react-router@^7.12.0 react-router-dom@^7.12.0
npm install recharts@2.15.2

# Otros (opcionales según el proyecto)
npm install embla-carousel-react@8.6.0
npm install react-resizable-panels@2.1.7
npm install motion@12.23.24
npm install xlsx@^0.18.5
```

### 1.3 Copiar archivos obligatorios

Desde este proyecto copiar **completos** al nuevo:

| Origen | Destino | Descripción |
|--------|---------|-------------|
| `src/styles/` | `src/styles/` | Todo el sistema de estilos |
| `src/app/components/ui/` | `src/app/components/ui/` | Los 43 componentes shadcn/ui |
| `vite.config.ts` | `vite.config.ts` | Configuración build con alias `@` |
| `src/app/components/Layout.tsx` | `src/app/components/Layout.tsx` | Layout base con sidebar |

---

## 2. Configuración de Archivos Base

### 2.1 `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 2.2 `src/styles/index.css` (punto de entrada)

```css
@import './fonts.css';
@import './tailwind.css';
@import './theme.css';
```

### 2.3 `src/styles/tailwind.css`

```css
@import 'tailwindcss' source(none);
@source '../**/*.{js,ts,jsx,tsx}';

@import 'tw-animate-css';
```

### 2.4 `src/main.tsx`

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## 3. Sistema de Colores

### 3.1 `src/styles/theme.css` — copiar completo

```css
@custom-variant dark (&:is(.dark *));

/* ===== LIGHT MODE ===== */
:root {
  --font-size: 16px;

  /* Superficies */
  --background: #ffffff;
  --foreground: oklch(0.145 0 0);         /* texto principal ~negro */
  --card: #ffffff;
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* Colores de marca */
  --primary: #030213;                      /* botón principal, negro azulado */
  --primary-foreground: oklch(1 0 0);      /* texto sobre primary = blanco */
  --secondary: oklch(0.95 0.0058 264.53);  /* gris lavanda muy claro */
  --secondary-foreground: #030213;

  /* Estados */
  --muted: #ececf0;                        /* gris claro — disabled, fondos secundarios */
  --muted-foreground: #717182;             /* texto sobre muted */
  --accent: #e9ebef;                       /* hover background */
  --accent-foreground: #030213;
  --destructive: #d4183d;                  /* rojo — eliminar, errores */
  --destructive-foreground: #ffffff;

  /* Bordes e inputs */
  --border: rgba(0, 0, 0, 0.1);
  --input: transparent;
  --input-background: #f3f3f5;             /* fondo de inputs */
  --switch-background: #cbced4;
  --ring: oklch(0.708 0 0);               /* focus ring */

  /* Tipografía */
  --font-weight-medium: 500;
  --font-weight-normal: 400;

  /* Colores de gráficas */
  --chart-1: oklch(0.646 0.222 41.116);   /* naranja */
  --chart-2: oklch(0.6 0.118 184.704);    /* cyan */
  --chart-3: oklch(0.398 0.07 227.392);   /* azul */
  --chart-4: oklch(0.828 0.189 84.429);   /* amarillo-verde */
  --chart-5: oklch(0.769 0.188 70.08);    /* naranja cálido */

  /* Border radius */
  --radius: 0.625rem;                      /* 10px — base */

  /* Sidebar */
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: #030213;
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

/* ===== DARK MODE ===== */
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
  --font-weight-medium: 500;
  --font-weight-normal: 400;
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.439 0 0);
}

/* ===== MAPEO A TAILWIND v4 ===== */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-input-background: var(--input-background);
  --color-switch-background: var(--switch-background);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);   /* 6px */
  --radius-md: calc(var(--radius) - 2px);   /* 8px */
  --radius-lg: var(--radius);               /* 10px */
  --radius-xl: calc(var(--radius) + 4px);   /* 14px */
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

/* ===== BASE STYLES ===== */
@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
  }

  html { font-size: var(--font-size); }

  h1 { font-size: var(--text-2xl); font-weight: var(--font-weight-medium); line-height: 1.5; }
  h2 { font-size: var(--text-xl);  font-weight: var(--font-weight-medium); line-height: 1.5; }
  h3 { font-size: var(--text-lg);  font-weight: var(--font-weight-medium); line-height: 1.5; }
  h4 { font-size: var(--text-base); font-weight: var(--font-weight-medium); line-height: 1.5; }
  label  { font-size: var(--text-base); font-weight: var(--font-weight-medium); line-height: 1.5; }
  button { font-size: var(--text-base); font-weight: var(--font-weight-medium); line-height: 1.5; }
  input  { font-size: var(--text-base); font-weight: var(--font-weight-normal);  line-height: 1.5; }
}
```

### 3.2 Tabla de colores de referencia rápida

| Variable | Valor Light | Uso |
|----------|-------------|-----|
| `--primary` | `#030213` | Botón primario, ítem activo de sidebar |
| `--primary-foreground` | `#ffffff` | Texto sobre botón primario |
| `--secondary` | gris lavanda muy claro | Botón secundario |
| `--muted` | `#ececf0` | Fondos secundarios, disabled |
| `--muted-foreground` | `#717182` | Texto de placeholders, descripciones |
| `--accent` | `#e9ebef` | Hover background de menú/botón ghost |
| `--destructive` | `#d4183d` | Eliminar, errores, estados críticos |
| `--border` | `rgba(0,0,0,0.1)` | Bordes de tarjetas e inputs |
| `--input-background` | `#f3f3f5` | Fondo de campos de formulario |
| `--background` | `#ffffff` | Fondo general de página |
| `--card` | `#ffffff` | Fondo de tarjetas |

### 3.3 Colores semánticos extra (Tailwind directo)

Usados en páginas para estados y elementos visuales:

```
Sidebar activo:    bg-blue-50 text-blue-600
Sidebar hover:     hover:bg-gray-100 text-gray-700
Config cards hover: hover:border-blue-400 hover:shadow-lg
Config icon bg:    bg-blue-50 (normal) → bg-blue-100 (hover)
Config icon:       text-blue-600
Estado Activo:     bg-green-100 text-green-800
Estado Inactivo:   bg-gray-100 text-gray-800
Página bg:         bg-gray-50 (fondo de páginas internas)
```

### 3.4 Colores de gráficas Recharts (hex directos)

```js
const COLORS = ['#06b6d4', '#3b82f6', '#d946ef', '#f97316', '#10b981', '#eab308'];
//               cyan        azul       magenta    naranja     verde      amarillo
```

---

## 4. Tipografía

| Elemento | Tamaño Tailwind | Peso | Uso |
|----------|----------------|------|-----|
| `h1` | `text-2xl` / `text-3xl` | 500 (medium) | Título de página |
| `h2` | `text-xl` | 500 | Sección |
| `h3` | `text-lg` | 500 | Sub-sección, títulos de cards |
| `h4` | `text-base` | 500 | Ítem, subtítulo de card |
| `label` | `text-base` / `text-sm` | 500 | Etiquetas de formulario |
| `button` | `text-sm` | 500 | Todos los botones |
| `input` | `text-base` / `text-sm` | 400 | Campos de texto |
| Descripción | `text-sm` | 400 | Texto secundario, subtítulos |
| Badge | `text-xs` | 500 | Chips de estado |

**Sin tipografía custom instalada** — se usan las system fonts por defecto heredadas de Tailwind.

---

## 5. Tokens de Espaciado y Bordes

### Border Radius

| Token Tailwind | Valor | Uso |
|---------------|-------|-----|
| `rounded-sm` | 6px | Badges pequeños |
| `rounded-md` | 8px | Botones, inputs |
| `rounded-lg` | 10px (**base**) | Cards, diálogos, paneles |
| `rounded-xl` | 14px | Cards especiales |
| `rounded-full` | 9999px | Avatares, badges circulares, estado activo |

### Espaciado frecuente

```
Padding de página:        p-8
Gap entre secciones:      gap-6
Gap entre cards:          gap-4 / gap-6
Padding de card:          px-6 pt-6 pb-6
Padding de botón:         px-4 py-2 (default) | px-3 (sm) | px-6 (lg)
Altura de botón:          h-9 (default) | h-8 (sm) | h-10 (lg)
Altura de input:          h-9
Ancho del sidebar:        w-64 (abierto) | w-20 (colapsado)
Altura del header sidebar: h-16
```

---

## 6. Componentes UI

> Todos los componentes viven en `src/app/components/ui/`. Son archivos `.tsx` independientes que usan Radix UI + Tailwind + CVA.

### 6.1 Utilidad `cn()` — `src/app/components/ui/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### 6.2 Botón (`button.tsx`)

**6 variantes × 4 tamaños:**

```tsx
import { Button } from '@/app/components/ui/button';

// Variantes
<Button variant="default">Primario</Button>       // bg-primary (#030213), texto blanco
<Button variant="destructive">Eliminar</Button>   // bg-destructive (#d4183d), texto blanco
<Button variant="outline">Secundario</Button>      // borde, bg transparente, hover gris
<Button variant="secondary">Secundario</Button>    // bg gris lavanda
<Button variant="ghost">Ghost</Button>             // sin borde, hover gris
<Button variant="link">Enlace</Button>             // texto azul con underline

// Tamaños
<Button size="default">Normal</Button>   // h-9 px-4
<Button size="sm">Pequeño</Button>       // h-8 px-3
<Button size="lg">Grande</Button>        // h-10 px-6
<Button size="icon"><IconX /></Button>   // 36×36px cuadrado
```

**Clases base del botón:**
```
inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium
transition-all disabled:pointer-events-none disabled:opacity-50
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
```

---

### 6.3 Badge (`badge.tsx`)

**4 variantes:**

```tsx
import { Badge } from '@/app/components/ui/badge';

<Badge variant="default">Activo</Badge>         // bg-primary (#030213)
<Badge variant="secondary">En Proceso</Badge>   // bg gris lavanda
<Badge variant="destructive">Cerrado</Badge>    // bg-destructive (#d4183d)
<Badge variant="outline">Pendiente</Badge>      // solo borde

// Estado de registro (custom inline)
<span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Activo</span>
<span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">Inactivo</span>
```

**Clases base del badge:**
```
inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit
```

---

### 6.4 Card (`card.tsx`)

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter }
  from '@/app/components/ui/card';

// Card estándar
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Texto de apoyo</CardDescription>
    <CardAction>  {/* botón de acción esquina superior derecha */}
      <Button size="icon" variant="ghost"><IconDots /></Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    Contenido principal
  </CardContent>
  <CardFooter>
    Pie de tarjeta
  </CardFooter>
</Card>

// Card KPI con gradiente (dashboard)
<Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
      <IconReceipt className="w-4 h-4 text-purple-600" />
      Ticket Promedio
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold text-purple-600">$350.00</div>
  </CardContent>
</Card>
```

**Clases base de Card:**
```
bg-card text-card-foreground flex flex-col gap-6 rounded-xl border
```

---

### 6.5 Input (`input.tsx`)

```tsx
import { Input } from '@/app/components/ui/input';

<Input type="text" placeholder="Escribe aquí..." />
<Input type="email" placeholder="correo@ejemplo.com" />
<Input type="password" placeholder="Contraseña" />
```

**Clases del input:**
```
flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base
bg-input-background border-input
placeholder:text-muted-foreground
transition-[color,box-shadow] outline-none
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
aria-invalid:ring-destructive/20 aria-invalid:border-destructive
disabled:opacity-50
```

---

### 6.6 Label (`label.tsx`)

```tsx
import { Label } from '@/app/components/ui/label';

<Label htmlFor="nombre">Nombre completo</Label>
```

**Clases:**
```
flex items-center gap-2 text-sm leading-none font-medium select-none
peer-disabled:cursor-not-allowed peer-disabled:opacity-50
```

---

### 6.7 Alert — mensajes de sistema (`alert.tsx`)

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/app/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Info / default
<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Información</AlertTitle>
  <AlertDescription>Operación completada con éxito.</AlertDescription>
</Alert>

// Error / destructive
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>No se pudo completar la operación.</AlertDescription>
</Alert>
```

---

### 6.8 Select (`select.tsx`)

```tsx
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/app/components/ui/select';

<Select value={valor} onValueChange={setValor}>
  <SelectTrigger>
    <SelectValue placeholder="Selecciona una opción" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Opción 1</SelectItem>
    <SelectItem value="2">Opción 2</SelectItem>
  </SelectContent>
</Select>
```

---

### 6.9 Switch (`switch.tsx`)

```tsx
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';

<div className="flex items-center gap-2">
  <Switch
    id="activo"
    defaultChecked={item?.activo ?? true}
    onCheckedChange={(checked) => onChange('activo', checked)}
  />
  <Label htmlFor="activo">Activo</Label>
</div>
```

---

### 6.10 Tabla (`table.tsx`)

```tsx
import { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell }
  from '@/app/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nombre</TableHead>
      <TableHead>Estado</TableHead>
      <TableHead className="text-right">Acciones</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell className="font-medium">{item.nombre}</TableCell>
        <TableCell>
          <span className={`px-2 py-1 rounded-full text-xs ${
            item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {item.activo ? 'Activo' : 'Inactivo'}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="icon" onClick={() => editar(item)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
            onClick={() => eliminar(item.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### 6.11 Dialog / Modal (`dialog.tsx`)

```tsx
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/app/components/ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Agregar registro</DialogTitle>
      <DialogDescription>Complete los campos para continuar.</DialogDescription>
    </DialogHeader>
    {/* Formulario */}
    <div className="space-y-4">
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" placeholder="Nombre" />
      </div>
    </div>
    <div className="flex justify-end gap-2 mt-4">
      <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
      <Button onClick={guardar}>Guardar</Button>
    </div>
  </DialogContent>
</Dialog>
```

---

### 6.12 AlertDialog — confirmación de eliminar

```tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';

<AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acción no se puede deshacer.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-white hover:bg-destructive/90"
        onClick={confirmarEliminar}
      >
        Eliminar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### 6.13 Tabs (`tabs.tsx`)

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';

<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="avanzado">Avanzado</TabsTrigger>
  </TabsList>
  <TabsContent value="general">Contenido general</TabsContent>
  <TabsContent value="avanzado">Opciones avanzadas</TabsContent>
</Tabs>
```

**Clases base de TabsList:**
```
bg-muted text-muted-foreground inline-flex h-9 rounded-xl p-[3px]
```

---

### 6.14 Toast / Notificaciones (`sonner.tsx`)

```tsx
import { Toaster } from '@/app/components/ui/sonner';
import { toast } from 'sonner';

// En App.tsx o Layout, agregar una sola vez:
<Toaster />

// Uso en cualquier componente:
toast.success('Guardado correctamente');
toast.error('Error al procesar');
toast.info('Recuerda completar el formulario');
toast.warning('Cambios sin guardar');
```

---

## 7. Layout Principal con Sidebar

### `src/app/components/Layout.tsx`

```tsx
import { Link, Outlet, useLocation } from 'react-router';
import { Settings, BarChart3, Menu, ClipboardList, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export function Layout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/configuracion', label: 'Configuración', icon: Settings },
    { path: '/registro',      label: 'Registro',       icon: ClipboardList },
    { path: '/reporteria',    label: 'Reportería',      icon: BarChart3 },
    { path: '/trafico',       label: 'Tráfico',         icon: TrendingUp },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Header del sidebar */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          <h1 className={`font-semibold text-xl text-gray-800 ${!isSidebarOpen && 'hidden'}`}>
            Nombre App
          </h1>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Menú */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className={`${!isSidebarOpen && 'hidden'}`}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

---

## 8. Patrones de Página

### 8.1 Página genérica con encabezado

```tsx
export function MiPagina() {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl mb-2 text-gray-900">Título de Página</h1>
        <p className="text-gray-600">Descripción breve de esta sección.</p>
      </div>

      {/* Contenido */}
    </div>
  );
}
```

### 8.2 Grid de tarjetas de configuración (ConfigDashboard)

```tsx
// Tarjeta de config con hover azul
<div
  onClick={() => navigate(path)}
  className="bg-white p-6 rounded-lg border border-gray-200
             hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
>
  <div className="flex items-start gap-4">
    <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
      <IconComponent className="w-6 h-6 text-blue-600" />
    </div>
    <div className="flex-1">
      <h3 className="text-lg mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
        Título
      </h3>
      <p className="text-sm text-gray-600">Descripción breve.</p>
    </div>
  </div>
</div>

// Grid contenedor
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Tarjetas */}
</div>
```

### 8.3 Dashboard con KPIs + Filtros (Reportería)

```tsx
<div className="grid grid-cols-12 gap-6">
  {/* Panel filtros — 3 columnas */}
  <div className="col-span-12 lg:col-span-3 space-y-4">
    {/* Select de campaña */}
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Campaña
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select>...</Select>
      </CardContent>
    </Card>

    {/* Botones de mes/día */}
    <Card>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {meses.map((mes) => (
            <Button
              key={mes.valor}
              variant={seleccionado ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              {mes.nombre}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>

    <Button variant="outline" className="w-full">Limpiar Filtros</Button>
  </div>

  {/* Panel dashboard — 9 columnas */}
  <div className="col-span-12 lg:col-span-9 space-y-6">
    {/* KPIs */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-purple-600" /> Ticket Promedio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600">$350.00</div>
        </CardContent>
      </Card>

      {/* Compradores: from-blue-50, text-blue-600 */}
      {/* Facturas:    from-orange-50, text-orange-600 */}
      {/* Canje:       from-emerald-50, text-emerald-600 */}
    </div>

    {/* Gráficas lado a lado */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Canje por Local</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="nombre" width={80} />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Canje por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={datos} cx="50%" cy="50%" outerRadius={100} dataKey="value">
                {datos.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  </div>
</div>
```

### 8.4 Página CRUD estándar (`CRUDTemplate`)

La aplicación tiene un componente genérico reutilizable. Para usarlo:

```tsx
import { CRUDTemplate } from '@/app/components/CRUDTemplate';

// Definir columnas
const columns = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'activo', label: 'Estado', render: (item) => (
    <span className={`px-2 py-1 rounded-full text-xs ${
      item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
    }`}>
      {item.activo ? 'Activo' : 'Inactivo'}
    </span>
  )},
];

// Formulario del item
const renderForm = (item, onChange) => (
  <div className="space-y-4">
    <div>
      <Label>Nombre</Label>
      <Input value={item?.nombre ?? ''} onChange={(e) => onChange('nombre', e.target.value)} />
    </div>
    <div className="flex items-center gap-2">
      <Switch defaultChecked={item?.activo ?? true}
        onCheckedChange={(v) => onChange('activo', v)} />
      <Label>Activo</Label>
    </div>
  </div>
);

// Render de la página
<CRUDTemplate
  title="Categorías"
  description="Gestión de categorías"
  data={data}
  columns={columns}
  onAdd={handleAdd}
  onEdit={handleEdit}
  onDelete={handleDelete}
  renderForm={renderForm}
  getItemId={(item) => item.id}
/>
```

---

## 9. Iconografía

**Librería:** `lucide-react@0.487.0`

```tsx
import { Settings, BarChart3, Menu, ClipboardList, TrendingUp } from 'lucide-react'; // Navegación
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';                        // Acciones CRUD
import { Users, Tag, Store, Ticket, Package, CreditCard, Calendar } from 'lucide-react'; // Secciones
import { Receipt, ShoppingCart, TrendingUp } from 'lucide-react';                     // Reportería
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';                      // UI general

// Tamaño estándar en sidebar: w-5 h-5
// Tamaño en cards/botones:    w-4 h-4
// Tamaño en titles de card:   w-5 h-5
```

---

## 10. Animaciones

```tsx
// Transiciones en hover (Tailwind)
className="transition-all duration-300"
className="transition-colors"
className="transition-[color,box-shadow]"

// Sidebar (colapso)
className="transition-all duration-300"

// Animaciones de componentes Radix (incluidas en los componentes ui/)
// Fade in/out: data-[state=open]:animate-in data-[state=closed]:animate-out
// Slide:       data-[state=open]:slide-in-from-top-2
// Zoom:        data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95
```

---

## 11. Formulario completo de ejemplo

```tsx
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
  from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { Textarea } from '@/app/components/ui/textarea';

<form className="space-y-4">
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="nombre">Nombre</Label>
      <Input id="nombre" placeholder="Ingresa nombre" />
    </div>

    <div className="space-y-2">
      <Label htmlFor="tipo">Tipo</Label>
      <Select>
        <SelectTrigger id="tipo">
          <SelectValue placeholder="Selecciona tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Tipo A</SelectItem>
          <SelectItem value="b">Tipo B</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>

  <div className="space-y-2">
    <Label htmlFor="descripcion">Descripción</Label>
    <Textarea id="descripcion" placeholder="Escribe aquí..." rows={3} />
  </div>

  <div className="flex items-center gap-2">
    <Switch id="activo" defaultChecked />
    <Label htmlFor="activo">Activo</Label>
  </div>

  <div className="flex justify-end gap-2 pt-2">
    <Button type="button" variant="outline">Cancelar</Button>
    <Button type="submit">Guardar</Button>
  </div>
</form>
```

---

## 12. Resumen de dependencias `package.json`

```json
{
  "dependencies": {
    "@radix-ui/react-accordion": "1.2.3",
    "@radix-ui/react-alert-dialog": "1.1.6",
    "@radix-ui/react-avatar": "1.1.3",
    "@radix-ui/react-checkbox": "1.1.4",
    "@radix-ui/react-dialog": "1.1.6",
    "@radix-ui/react-dropdown-menu": "2.1.6",
    "@radix-ui/react-label": "2.1.2",
    "@radix-ui/react-popover": "1.1.6",
    "@radix-ui/react-progress": "1.1.2",
    "@radix-ui/react-radio-group": "1.2.3",
    "@radix-ui/react-scroll-area": "1.2.3",
    "@radix-ui/react-select": "2.1.6",
    "@radix-ui/react-separator": "1.1.2",
    "@radix-ui/react-slider": "1.2.3",
    "@radix-ui/react-slot": "1.1.2",
    "@radix-ui/react-switch": "1.1.3",
    "@radix-ui/react-tabs": "1.1.3",
    "@radix-ui/react-toggle": "1.1.2",
    "@radix-ui/react-toggle-group": "1.1.2",
    "@radix-ui/react-tooltip": "1.1.8",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "cmdk": "1.1.1",
    "date-fns": "3.6.0",
    "embla-carousel-react": "8.6.0",
    "input-otp": "1.4.2",
    "lucide-react": "0.487.0",
    "motion": "12.23.24",
    "next-themes": "0.4.6",
    "react-day-picker": "8.10.1",
    "react-hook-form": "7.55.0",
    "react-resizable-panels": "2.1.7",
    "react-router": "^7.12.0",
    "react-router-dom": "^7.12.0",
    "recharts": "2.15.2",
    "sonner": "2.0.3",
    "tailwind-merge": "3.2.0",
    "tw-animate-css": "1.3.8",
    "vaul": "1.1.2",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@tailwindcss/vite": "4.1.12",
    "@vitejs/plugin-react": "4.7.0",
    "tailwindcss": "4.1.12",
    "vite": "6.3.5"
  },
  "peerDependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
```

---

## 13. Checklist para nuevo proyecto

- [ ] Crear proyecto con Vite + React + TypeScript
- [ ] Copiar `vite.config.ts` (alias `@` y plugin Tailwind)
- [ ] Copiar `src/styles/` completo (4 archivos)
- [ ] Copiar `src/app/components/ui/` completo (43 componentes)
- [ ] Copiar `src/app/components/Layout.tsx`
- [ ] Instalar todas las dependencias (sección 1.2)
- [ ] Importar `./styles/index.css` en `src/main.tsx`
- [ ] Verificar que `bg-primary`, `text-muted-foreground`, `border-destructive` funcionen correctamente
- [ ] Ajustar nombre de la app en `Layout.tsx` y rutas del menú
- [ ] Agregar `<Toaster />` en el componente raíz para toasts
