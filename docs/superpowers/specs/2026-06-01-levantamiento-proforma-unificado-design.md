# Diseño: Levantamiento Proforma Unificado con Tipo de Cliente

**Fecha:** 2026-06-01  
**Estado:** Aprobado

---

## Contexto

El flujo actual de órdenes de trabajo tiene 3 estados pre-reparación separados en el panel lateral: `LEVANTAMIENTO_PROFORMA` → `GESTION_ASEGURADORA` → `COMPRA_REPUESTO`. El usuario debe navegar por 3 pasos distintos antes de poder planificar la reparación.

El objetivo es consolidar estos 3 pasos en un único estado `LEVANTAMIENTO_PROFORMA` con 3 pestañas internas, diferenciando el flujo según el tipo de cliente (Particular o Aseguradora) y registrando los tiempos de gestión relevantes para cada tipo.

---

## Cambios en el flujo de estados

### orderFlow (panel lateral)

**Antes:**
```
INGRESADA → LEVANTAMIENTO_PROFORMA → GESTION_ASEGURADORA → COMPRA_REPUESTO → PLANIFICACION_REPARACION → INICIO_REPARACION → CONTROL_CALIDAD → LISTO_ENTREGA → ENTREGADO
```

**Después:**
```
INGRESADA → LEVANTAMIENTO_PROFORMA → PLANIFICACION_REPARACION → INICIO_REPARACION → CONTROL_CALIDAD → LISTO_ENTREGA → ENTREGADO
```

`GESTION_ASEGURADORA` y `COMPRA_REPUESTO` se eliminan del array `orderFlow` en `mockData.ts` pero se conservan en el tipo `OrderStatus` para compatibilidad con órdenes existentes en base de datos. No se navega a ellos para órdenes nuevas.

---

## Modelo de datos

### `WorkshopOrder` (types.ts)

Se agrega el campo:
```typescript
tipo_cliente: 'PARTICULAR' | 'ASEGURADORA';
```

Derivado en `ordersService.ts` al cargar órdenes: si `aseguradora_id` es no-nulo → `'ASEGURADORA'`, si no → `'PARTICULAR'`.

### `OrderProcess.aseguradora` (reutilizado para ambos tipos)

La sección `aseguradora` existente en `OrderProcess` se reutiliza para registrar la aprobación tanto de clientes particulares como de aseguradoras. No se requieren cambios en el esquema de Supabase.

| Campo | Uso PARTICULAR | Uso ASEGURADORA |
|---|---|---|
| `fecha_envio` | Fecha envío proforma al cliente | Fecha envío a aseguradora |
| `fecha_aprobacion` | Fecha aprobación del cliente | Fecha aprobación aseguradora |
| `estado` | PENDIENTE_ENVIO / ENVIADO / APROBADO / RECHAZADO | PENDIENTE_ENVIO / ENVIADO / EN_REVISION / APROBADO / RECHAZADO / OBSERVADO |
| `observaciones` | Observaciones | Observaciones |
| `documento_url` | Oculto (no aplica) | URL documento adjunto |

La tabla `orden_gestion_aseguradora` en Supabase sirve para ambos tipos sin cambios de esquema.

---

## UI: Paso Levantamiento Proforma

### Selector de tipo (cabecera del formulario)

Radio group pre-cargado desde `order.tipo_cliente`, editable:
```
Tipo de cliente: ● Particular  ○ Aseguradora
```

Si la orden tiene `aseguradora_id` → pre-selecciona ASEGURADORA. Si no → pre-selecciona PARTICULAR.

### Pestañas con indicador de completitud

```
[ Piezas & Daños ✓ ] [ Aprobación ⚠ ] [ Repuestos ✓ ]
```

El indicador (✓ / ⚠) se calcula en tiempo real:
- **Piezas & Daños**: completo si `process.proforma.length > 0`
- **Aprobación**: completo si `process.aseguradora.estado === 'APROBADO'`
- **Repuestos**: completo si `process.repuestos.length > 0 && process.repuestos.every(r => r.estado === 'RECIBIDO')`

### Pestaña 1 — Piezas & Daños

Sin cambios respecto al formulario actual:
- Pieza afectada
- Categoría daño (K1–K5)
- Costo estimado
- Requiere reemplazo (checkbox)
- Observación
- URL foto
- Lista de piezas ya registradas con botón "Agregar pieza"

### Pestaña 2 — Aprobación

**Si tipo = PARTICULAR:**
- Estado: `PENDIENTE_ENVIO | ENVIADO | APROBADO | RECHAZADO`
- Fecha envío proforma al cliente (date)
- Fecha aprobación del cliente (date)
- Observaciones

**Si tipo = ASEGURADORA:**
- Estado: `PENDIENTE_ENVIO | ENVIADO | EN_REVISION | APROBADO | RECHAZADO | OBSERVADO`
- Fecha envío a aseguradora (date)
- Fecha aprobación aseguradora (date)
- URL documento adjunto
- Observaciones

### Pestaña 3 — Repuestos

Sin cambios respecto al formulario actual de COMPRA_REPUESTO:
- Descripción del repuesto
- Cantidad
- Proveedor
- Estado: `PENDIENTE | SOLICITADO | COMPRADO | EN_TRANSITO | RECIBIDO | CANCELADO`
- Fecha estimada llegada (date)
- Fecha real llegada (date)
- Costo
- Observaciones
- Lista de repuestos ya registrados con botón "Agregar repuesto"

---

## Condición de avance

El botón "Guardar y avanzar a Planificación Reparación" se habilita únicamente cuando:

1. `process.aseguradora.estado === 'APROBADO'`
2. `process.repuestos.length > 0 && process.repuestos.every(r => r.estado === 'RECIBIDO')`

Si alguna condición no se cumple, el botón muestra el motivo bloqueante:
- Solo falta aprobación → `"Requiere aprobación"`
- Solo faltan repuestos → `"Repuestos pendientes de recibir"`
- Ambas faltan → `"Requiere aprobación y repuestos"`

---

## Cambios en servicios

### `orderProcessService.ts` — `saveOrderStep`

El `case 'LEVANTAMIENTO_PROFORMA'` se expande para persistir las 3 secciones:

```
case 'LEVANTAMIENTO_PROFORMA':
  1. Guarda/actualiza última pieza en orden_piezas_danos (lógica existente)
  2. Guarda/actualiza aprobación en orden_gestion_aseguradora (movido desde case GESTION_ASEGURADORA)
  3. Guarda/actualiza último repuesto en orden_repuestos (movido desde case COMPRA_REPUESTO)
```

Los `case 'GESTION_ASEGURADORA'` y `case 'COMPRA_REPUESTO'` se conservan como fallback para órdenes antiguas que ya estén en esos estados.

### `getNextStatus` en `OrderDetailPage`

```typescript
if (status === 'LEVANTAMIENTO_PROFORMA') {
  const aprobada = process.aseguradora.estado === 'APROBADO';
  const repuestosListos = process.repuestos.length > 0
    && process.repuestos.every(r => r.estado === 'RECIBIDO');
  if (!aprobada || !repuestosListos) return null;
  return 'PLANIFICACION_REPARACION';
}
```

### `ordersService.ts`

Al mapear órdenes desde Supabase, derivar `tipo_cliente`:
```typescript
tipo_cliente: row.aseguradora_id ? 'ASEGURADORA' : 'PARTICULAR'
```

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/app/types.ts` | Agregar `tipo_cliente` a `WorkshopOrder` |
| `src/app/data/mockData.ts` | Actualizar `orderFlow` (eliminar 2 estados) |
| `src/app/services/ordersService.ts` | Derivar `tipo_cliente` al mapear órdenes |
| `src/app/services/orderProcessService.ts` | Expandir `case LEVANTAMIENTO_PROFORMA`, conservar fallbacks |
| `src/app/pages/OrderDetailPage.tsx` | Nuevo UI con tabs, nuevo `getNextStatus`, nuevo `StepFields` para el paso |

**Sin cambios en:** Supabase schema, `NewOrderPage.tsx`, `mockOrders.ts`, otros estados del flujo.

---

## No incluido en este alcance

- Reportes o KPIs sobre tiempos de gestión (fecha envío vs aprobación)
- Notificaciones automáticas al cliente o aseguradora
- Cambios en la pantalla de creación de orden (`NewOrderPage`)
