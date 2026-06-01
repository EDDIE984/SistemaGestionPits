# Levantamiento Proforma Unificado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar los estados LEVANTAMIENTO_PROFORMA, GESTION_ASEGURADORA y COMPRA_REPUESTO en un solo paso con 3 pestañas internas, diferenciando el flujo por tipo de cliente (Particular vs Aseguradora).

**Architecture:** Se elimina GESTION_ASEGURADORA y COMPRA_REPUESTO del `orderFlow` visual, se expande el case de LEVANTAMIENTO_PROFORMA en `saveOrderStep` para persistir las 3 secciones, y se reconstruye el `StepFields` de ese estado usando el componente `Tabs` ya existente en el proyecto.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui (`Tabs`, `Select`, `Input`, `Textarea`, `Checkbox`), Supabase (sin cambios de schema)

---

## File Map

| Archivo | Rol del cambio |
|---|---|
| `src/app/types.ts` | Agregar `tipo_cliente` a `WorkshopOrder` |
| `src/app/data/mockData.ts` | Eliminar 2 estados del `orderFlow` |
| `src/app/services/ordersService.ts` | Derivar `tipo_cliente` al mapear órdenes desde Supabase |
| `src/app/services/orderProcessService.ts` | Expandir `case LEVANTAMIENTO_PROFORMA` para guardar las 3 secciones |
| `src/app/pages/OrderDetailPage.tsx` | Nuevo `initialForms`, `formFromProcess`, `applyStepData`, `getNextStatus`, `nextBlockedLabel`, `StepFields` con tabs |

---

## Task 1: Tipos y constantes de flujo

**Files:**
- Modify: `src/app/types.ts`
- Modify: `src/app/data/mockData.ts`

- [ ] **Step 1: Agregar `tipo_cliente` a `WorkshopOrder` en `src/app/types.ts`**

Localizar la interfaz `WorkshopOrder` (línea 46) y agregar el nuevo campo:

```typescript
export interface WorkshopOrder {
  id: string;
  numero_orden: string;
  estado: OrderStatus;
  tipo_cliente: 'PARTICULAR' | 'ASEGURADORA';   // ← agregar esta línea
  sucursal_id: string;
  sucursal: string;
  placa: string;
  marca: string;
  modelo: string;
  cliente: string;
  asesor: string;
  aseguradora?: string;
  fecha_ingreso: string;
  fecha_entrega_estimada?: string;
  progreso: number;
}
```

- [ ] **Step 2: Eliminar GESTION_ASEGURADORA y COMPRA_REPUESTO del `orderFlow` en `src/app/data/mockData.ts`**

Reemplazar el array completo:

```typescript
export const orderFlow: OrderStatus[] = [
  'INGRESADA',
  'LEVANTAMIENTO_PROFORMA',
  'PLANIFICACION_REPARACION',
  'INICIO_REPARACION',
  'CONTROL_CALIDAD',
  'LISTO_ENTREGA',
  'ENTREGADO',
];
```

- [ ] **Step 3: Verificar que TypeScript no reporta errores**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS" && npx tsc --noEmit 2>&1 | head -40
```

Se esperan errores en `ordersService.ts` y `OrderDetailPage.tsx` porque `WorkshopOrder` ahora requiere `tipo_cliente`. Son errores esperados — se corrigen en tareas siguientes.

- [ ] **Step 4: Commit**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS"
git add src/app/types.ts src/app/data/mockData.ts
git commit -m "feat: agrega tipo_cliente a WorkshopOrder y actualiza orderFlow"
```

---

## Task 2: Derivar `tipo_cliente` en `ordersService.ts`

**Files:**
- Modify: `src/app/services/ordersService.ts:52-68`

- [ ] **Step 1: Agregar `tipo_cliente` al objeto retornado en el `map` de `fetchOrders`**

Localizar el bloque `return { ... } satisfies WorkshopOrder;` (líneas 52–67) y agregar el campo derivado. El campo `seg` (aseguradora) es no-nulo cuando la orden tiene aseguradora:

```typescript
    return {
      id: r['id'] as string,
      numero_orden: r['numero_orden'] as string,
      estado,
      tipo_cliente: seg !== null ? 'ASEGURADORA' : 'PARTICULAR',   // ← agregar
      sucursal_id: r['sucursal_id'] as string,
      sucursal: suc?.nombre ?? '',
      placa: veh?.placa ?? '',
      marca: veh?.marca ?? '',
      modelo: veh?.modelo ?? '',
      cliente: cli?.nombre ?? '',
      asesor: ase?.nombre ?? '',
      aseguradora: seg?.nombre ?? undefined,
      fecha_ingreso: r['fecha_ingreso'] as string,
      fecha_entrega_estimada: (r['fecha_entrega_estimada'] as string | null) ?? undefined,
      progreso: progressByStatus[estado] ?? 0,
    } satisfies WorkshopOrder;
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS" && npx tsc --noEmit 2>&1 | head -40
```

Los errores de `ordersService.ts` deben desaparecer. Solo quedan errores en `OrderDetailPage.tsx`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS"
git add src/app/services/ordersService.ts
git commit -m "feat: deriva tipo_cliente desde aseguradora_id en fetchOrders"
```

---

## Task 3: Expandir `saveOrderStep` para LEVANTAMIENTO_PROFORMA

**Files:**
- Modify: `src/app/services/orderProcessService.ts:232-255`

- [ ] **Step 1: Reemplazar el `case 'LEVANTAMIENTO_PROFORMA'` completo**

Localizar el bloque `case 'LEVANTAMIENTO_PROFORMA': {` (línea 232) y reemplazarlo con la versión expandida que también persiste la aprobación y el último repuesto:

```typescript
    case 'LEVANTAMIENTO_PROFORMA': {
      // 1. Guardar última pieza (lógica existente)
      const last = process.proforma.at(-1);
      if (last?.pieza) {
        if (last.id) {
          await supabase.from('orden_piezas_danos').update({
            pieza: last.pieza,
            categoria_dano: last.categoria_dano,
            observacion: last.observacion || null,
            requiere_reemplazo: last.requiere_reemplazo,
            costo_estimado: last.costo_estimado || null,
          }).eq('id', last.id);
        } else {
          const { data } = await supabase.from('orden_piezas_danos').insert({
            orden_id: orderId,
            pieza: last.pieza,
            categoria_dano: last.categoria_dano,
            observacion: last.observacion || null,
            requiere_reemplazo: last.requiere_reemplazo,
            costo_estimado: last.costo_estimado || null,
          }).select('id').single();
          if (data) last.id = (data as { id: string }).id;
        }
      }

      // 2. Guardar aprobación (movido desde GESTION_ASEGURADORA)
      if (session) {
        const a = process.aseguradora;
        if (a.id) {
          await supabase.from('orden_gestion_aseguradora').update({
            aplica_aseguradora: a.aplica_aseguradora,
            estado: a.estado,
            fecha_envio: a.fecha_envio || null,
            fecha_aprobacion: a.fecha_aprobacion || null,
            observaciones: a.observaciones || null,
          }).eq('id', a.id);
        } else {
          const { data } = await supabase.from('orden_gestion_aseguradora').insert({
            orden_id: orderId,
            usuario_id: session.id,
            aplica_aseguradora: a.aplica_aseguradora,
            estado: a.estado,
            fecha_envio: a.fecha_envio || null,
            fecha_aprobacion: a.fecha_aprobacion || null,
            observaciones: a.observaciones || null,
          }).select('id').single();
          if (data) a.id = (data as { id: string }).id;
        }
      }

      // 3. Guardar último repuesto (movido desde COMPRA_REPUESTO)
      const lastRep = process.repuestos.at(-1);
      if (lastRep && (lastRep.descripcion || lastRep.proveedor || lastRep.costo > 0)) {
        if (lastRep.id) {
          await supabase.from('orden_repuestos').update({
            descripcion_libre: lastRep.descripcion || null,
            cantidad: lastRep.cantidad,
            estado: lastRep.estado,
            proveedor: lastRep.proveedor || null,
            fecha_estimada_llegada: lastRep.fecha_estimada_llegada || null,
            fecha_real_llegada: lastRep.fecha_real_llegada || null,
            costo: lastRep.costo || null,
            observaciones: lastRep.observaciones || null,
          }).eq('id', lastRep.id);
        } else {
          const { data } = await supabase.from('orden_repuestos').insert({
            orden_id: orderId,
            descripcion_libre: lastRep.descripcion || null,
            cantidad: lastRep.cantidad,
            estado: lastRep.estado,
            proveedor: lastRep.proveedor || null,
            fecha_estimada_llegada: lastRep.fecha_estimada_llegada || null,
            fecha_real_llegada: lastRep.fecha_real_llegada || null,
            costo: lastRep.costo || null,
            observaciones: lastRep.observaciones || null,
          }).select('id').single();
          if (data) lastRep.id = (data as { id: string }).id;
        }
      }
      break;
    }
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS" && npx tsc --noEmit 2>&1 | head -40
```

No debe haber errores nuevos en `orderProcessService.ts`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS"
git add src/app/services/orderProcessService.ts
git commit -m "feat: expande saveOrderStep para guardar aprobacion y repuestos en LEVANTAMIENTO_PROFORMA"
```

---

## Task 4: Actualizar lógica de formulario en `OrderDetailPage.tsx`

**Files:**
- Modify: `src/app/pages/OrderDetailPage.tsx`

Este task actualiza solo la lógica de datos (sin tocar la UI renderizada). Cambia: `initialForms`, `formFromProcess`, `applyStepData`, `getNextStatus`, `nextBlockedLabel`, `statusObservation`, `historyDataForStatus`.

- [ ] **Step 1: Actualizar `initialForms.LEVANTAMIENTO_PROFORMA`**

Reemplazar la entrada `LEVANTAMIENTO_PROFORMA` en el objeto `initialForms` (actualmente líneas 32–40):

```typescript
  LEVANTAMIENTO_PROFORMA: {
    // Metadata de control
    tipo_cliente: 'PARTICULAR',
    // Pestaña Piezas
    pieza: '',
    categoria_dano: 'K3',
    observacion_pieza: '',
    requiere_reemplazo: false,
    costo_estimado: '',
    foto_url_pieza: '',
    // Pestaña Aprobación
    estado_aprobacion: 'PENDIENTE_ENVIO',
    fecha_envio: '',
    fecha_aprobacion: '',
    observaciones_aprobacion: '',
    documento_url: '',
    // Pestaña Repuestos
    descripcion_repuesto: '',
    cantidad_repuesto: '1',
    estado_repuesto: 'PENDIENTE',
    proveedor: '',
    fecha_estimada_llegada: '',
    fecha_real_llegada: '',
    costo_repuesto: '',
    observaciones_repuesto: '',
  },
```

**No eliminar** las entradas `GESTION_ASEGURADORA` y `COMPRA_REPUESTO` del objeto `initialForms` — el tipo `Record<OrderStatus, StepForm>` las requiere para compilar. Dejarlas tal como están; no se usarán en navegación nueva.

- [ ] **Step 2: Actualizar la firma de `formFromProcess` para recibir `tipo_cliente`**

Cambiar la función:

```typescript
function formFromProcess(status: OrderStatus, process: MockOrderProcess, tipo_cliente: 'PARTICULAR' | 'ASEGURADORA'): StepForm {
```

Y actualizar el único lugar donde se llama (dentro del `useEffect`, línea ~123):

```typescript
  useEffect(() => {
    if (order && process) {
      setForm(formFromProcess(order.estado, process, order.tipo_cliente));
    }
  }, [order?.id, order?.estado, process]);
```

- [ ] **Step 3: Agregar el bloque LEVANTAMIENTO_PROFORMA en `formFromProcess`**

Agregar antes del `return initialForms[status]` final (actualmente línea ~462):

```typescript
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const lastPieza = process.proforma.at(-1);
    const lastRepuesto = process.repuestos.at(-1);
    return {
      ...initialForms.LEVANTAMIENTO_PROFORMA,
      tipo_cliente,
      // Piezas
      pieza: lastPieza?.pieza ?? '',
      categoria_dano: lastPieza?.categoria_dano ?? 'K3',
      observacion_pieza: lastPieza?.observacion ?? '',
      requiere_reemplazo: lastPieza?.requiere_reemplazo ?? false,
      costo_estimado: String(lastPieza?.costo_estimado ?? ''),
      foto_url_pieza: lastPieza?.foto_url ?? '',
      // Aprobación (convertir NO_APLICA/vacío al valor inicial del selector)
      estado_aprobacion: ['NO_APLICA', '', undefined].includes(process.aseguradora.estado)
        ? 'PENDIENTE_ENVIO'
        : process.aseguradora.estado,
      fecha_envio: process.aseguradora.fecha_envio ?? '',
      fecha_aprobacion: process.aseguradora.fecha_aprobacion ?? '',
      observaciones_aprobacion: process.aseguradora.observaciones ?? '',
      documento_url: process.aseguradora.documento_url ?? '',
      // Repuestos
      descripcion_repuesto: lastRepuesto?.descripcion ?? '',
      cantidad_repuesto: String(lastRepuesto?.cantidad ?? 1),
      estado_repuesto: lastRepuesto?.estado ?? 'PENDIENTE',
      proveedor: lastRepuesto?.proveedor ?? '',
      fecha_estimada_llegada: lastRepuesto?.fecha_estimada_llegada ?? '',
      fecha_real_llegada: lastRepuesto?.fecha_real_llegada ?? '',
      costo_repuesto: String(lastRepuesto?.costo ?? ''),
      observaciones_repuesto: lastRepuesto?.observaciones ?? '',
    };
  }
```

Eliminar los bloques `if (status === 'GESTION_ASEGURADORA')` y `if (status === 'COMPRA_REPUESTO')` de la función (ya no se usan para navegación).

- [ ] **Step 4: Actualizar `applyStepData` para LEVANTAMIENTO_PROFORMA**

Reemplazar el bloque `if (status === 'LEVANTAMIENTO_PROFORMA')` completo:

```typescript
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const pieza = String(form.pieza || '').trim();
    const updatedPieza = {
      pieza,
      categoria_dano: String(form.categoria_dano || 'K3'),
      observacion: String(form.observacion_pieza || ''),
      requiere_reemplazo: Boolean(form.requiere_reemplazo),
      costo_estimado: Number(form.costo_estimado || 0),
      foto_url: String(form.foto_url_pieza || ''),
    };

    const updatedAseguradora = {
      ...process.aseguradora,
      aplica_aseguradora: form.tipo_cliente === 'ASEGURADORA',
      estado: String(form.estado_aprobacion || 'PENDIENTE_ENVIO'),
      fecha_envio: String(form.fecha_envio || ''),
      fecha_aprobacion: String(form.fecha_aprobacion || ''),
      observaciones: String(form.observaciones_aprobacion || ''),
      documento_url: String(form.documento_url || ''),
    };

    const descripcion = String(form.descripcion_repuesto || '').trim();
    const hasRepuestoData = descripcion
      || String(form.proveedor || '').trim()
      || String(form.fecha_estimada_llegada || '').trim()
      || Number(form.costo_repuesto || 0) > 0;
    const updatedRepuesto = {
      descripcion: descripcion || 'Repuesto por definir',
      cantidad: Number(form.cantidad_repuesto || 1),
      estado: String(form.estado_repuesto || 'PENDIENTE'),
      proveedor: String(form.proveedor || ''),
      fecha_estimada_llegada: String(form.fecha_estimada_llegada || ''),
      fecha_real_llegada: String(form.fecha_real_llegada || ''),
      costo: Number(form.costo_repuesto || 0),
      observaciones: String(form.observaciones_repuesto || ''),
    };

    return {
      ...process,
      proforma: pieza ? upsertLast(process.proforma, updatedPieza) : process.proforma,
      aseguradora: updatedAseguradora,
      repuestos: hasRepuestoData ? upsertLast(process.repuestos, updatedRepuesto) : process.repuestos,
    };
  }
```

Eliminar también los bloques `if (status === 'GESTION_ASEGURADORA')` y `if (status === 'COMPRA_REPUESTO')` de `applyStepData`.

- [ ] **Step 5: Actualizar `getNextStatus`**

La función actualmente solo recibe `(status, form)`. Agregar `process` como tercer parámetro y actualizar su lógica:

Cambiar la firma:
```typescript
function getNextStatus(status: OrderStatus, form: StepForm, process: MockOrderProcess) {
```

Reemplazar el bloque de lógica inicial:

```typescript
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    // Verificar aprobación contra el formulario actual (igual que el comportamiento existente de GESTION_ASEGURADORA)
    const aprobada = String(form.estado_aprobacion || '') === 'APROBADO';
    // Verificar repuestos contra el proceso guardado (hay múltiples repuestos, se necesitan todos RECIBIDO)
    const repuestosListos = process.repuestos.length > 0
      && process.repuestos.every((r) => r.estado === 'RECIBIDO');
    if (!aprobada || !repuestosListos) return null;
    return 'PLANIFICACION_REPARACION' as OrderStatus;
  }

  if (status === 'GESTION_ASEGURADORA') {
    const insuranceStatus = String(form.estado || '');
    if (insuranceStatus !== 'APROBADO' && insuranceStatus !== 'NO_APLICA') {
      return null;
    }
  }

  if (status === 'COMPRA_REPUESTO' && String(form.estado || '') !== 'RECIBIDO') {
    return null;
  }

  if (status === 'ENTREGADO') return null;

  const currentIndex = orderFlow.indexOf(status);
  if (currentIndex === -1) return null;
  return currentIndex < orderFlow.length - 1 ? orderFlow[currentIndex + 1] : null;
```

Actualizar la llamada en el cuerpo del componente (línea ~148):

```typescript
  const nextStatus = getNextStatus(order.estado, form, process);
```

- [ ] **Step 6: Actualizar `nextBlockedLabel` para recibir `process`**

```typescript
function nextBlockedLabel(status: OrderStatus, form: StepForm, process: MockOrderProcess) {
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const aprobada = String(form.estado_aprobacion || '') === 'APROBADO';
    const repuestosListos = process.repuestos.length > 0
      && process.repuestos.every((r) => r.estado === 'RECIBIDO');
    if (!aprobada && !repuestosListos) return 'Requiere aprobación y repuestos';
    if (!aprobada) return 'Requiere aprobación';
    return 'Repuestos pendientes de recibir';
  }
  if (status === 'ENTREGADO') return 'Orden cerrada';
  return 'No puede avanzar';
}
```

Actualizar la llamada en el JSX:

```tsx
<Button type="submit" disabled={!nextStatus}>
  {nextStatus ? `Guardar y avanzar a ${orderStatusLabel(nextStatus)}` : nextBlockedLabel(order.estado, form, process)}
</Button>
```

- [ ] **Step 7: Actualizar `statusObservation` y `historyDataForStatus`**

En `statusObservation`, reemplazar el caso de `LEVANTAMIENTO_PROFORMA`:

```typescript
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const tipo = String(form.tipo_cliente || 'PARTICULAR');
    return `Proforma registrada (${tipo}): ${String(form.pieza || 'sin pieza')}. Aprobación: ${String(form.estado_aprobacion || 'PENDIENTE_ENVIO')}.`;
  }
```

En `historyDataForStatus`, reemplazar el caso de `LEVANTAMIENTO_PROFORMA`:

```typescript
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    return {
      tipo_cliente: form.tipo_cliente,
      pieza: form.pieza,
      categoria_dano: form.categoria_dano,
      requiere_reemplazo: form.requiere_reemplazo,
      costo_estimado: form.costo_estimado,
      estado_aprobacion: form.estado_aprobacion,
      fecha_envio: form.fecha_envio,
      fecha_aprobacion: form.fecha_aprobacion,
      descripcion_repuesto: form.descripcion_repuesto,
      estado_repuesto: form.estado_repuesto,
    };
  }
```

- [ ] **Step 8: Verificar TypeScript**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS" && npx tsc --noEmit 2>&1 | head -60
```

Debe compilar sin errores salvo los que involucren el bloque `StepFields` para LEVANTAMIENTO_PROFORMA (si aún no se ha actualizado).

- [ ] **Step 9: Commit**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS"
git add src/app/pages/OrderDetailPage.tsx
git commit -m "feat: actualiza logica de formulario para LEVANTAMIENTO_PROFORMA unificado"
```

---

## Task 5: Construir UI con pestañas para LEVANTAMIENTO_PROFORMA

**Files:**
- Modify: `src/app/pages/OrderDetailPage.tsx`

- [ ] **Step 1: Agregar import de `Tabs` y `useState` activo de pestaña**

En la sección de imports de `OrderDetailPage.tsx`, agregar:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
```

En el cuerpo del componente `OrderDetailPage`, junto a los otros `useState`, agregar:

```typescript
const [activeProformaTab, setActiveProformaTab] = useState<'piezas' | 'aprobacion' | 'repuestos'>('piezas');
```

- [ ] **Step 2: Actualizar `StepFieldsProps` para incluir `process` y `activeTab`**

```typescript
interface StepFieldsProps {
  status: OrderStatus;
  form: StepForm;
  onChange: (field: string, value: string | boolean) => void;
  process: MockOrderProcess;
  activeProformaTab: 'piezas' | 'aprobacion' | 'repuestos';
  onProformaTabChange: (tab: 'piezas' | 'aprobacion' | 'repuestos') => void;
}
```

Actualizar la llamada a `<StepFields>` en el JSX:

```tsx
<StepFields
  status={order.estado}
  form={form}
  onChange={updateField}
  process={process}
  activeProformaTab={activeProformaTab}
  onProformaTabChange={setActiveProformaTab}
/>
```

- [ ] **Step 3: Reemplazar el bloque `if (status === 'LEVANTAMIENTO_PROFORMA')` en `StepFields`**

Reemplazar el bloque actual (líneas ~671–689) por el nuevo con tabs:

```tsx
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const tipoCliente = String(form.tipo_cliente || 'PARTICULAR') as 'PARTICULAR' | 'ASEGURADORA';
    const aprobada = process.aseguradora.estado === 'APROBADO';
    const repuestosListos = process.repuestos.length > 0
      && process.repuestos.every((r) => r.estado === 'RECIBIDO');

    return (
      <div className="space-y-4">
        {/* Selector tipo de cliente */}
        <div className="flex items-center gap-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <span className="text-sm font-medium text-gray-700">Tipo de cliente:</span>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipo_cliente"
              value="PARTICULAR"
              checked={tipoCliente === 'PARTICULAR'}
              onChange={() => onChange('tipo_cliente', 'PARTICULAR')}
            />
            Particular
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipo_cliente"
              value="ASEGURADORA"
              checked={tipoCliente === 'ASEGURADORA'}
              onChange={() => onChange('tipo_cliente', 'ASEGURADORA')}
            />
            Aseguradora
          </label>
        </div>

        {/* Pestañas */}
        <Tabs value={activeProformaTab} onValueChange={(v) => onProformaTabChange(v as 'piezas' | 'aprobacion' | 'repuestos')}>
          <TabsList className="w-full">
            <TabsTrigger value="piezas" className="flex-1">
              Piezas & Daños
              {process.proforma.length > 0 ? <span className="ml-1 text-green-600">✓</span> : null}
            </TabsTrigger>
            <TabsTrigger value="aprobacion" className="flex-1">
              Aprobación
              {aprobada ? <span className="ml-1 text-green-600">✓</span> : <span className="ml-1 text-amber-500">⚠</span>}
            </TabsTrigger>
            <TabsTrigger value="repuestos" className="flex-1">
              Repuestos
              {repuestosListos ? <span className="ml-1 text-green-600">✓</span> : <span className="ml-1 text-amber-500">⚠</span>}
            </TabsTrigger>
          </TabsList>

          {/* Pestaña 1: Piezas & Daños */}
          <TabsContent value="piezas" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Pieza afectada" value={String(form.pieza)} onChange={(v) => onChange('pieza', v)} placeholder="Guardafango delantero" />
              <SelectField
                label="Categoría de daño"
                value={String(form.categoria_dano)}
                onChange={(v) => onChange('categoria_dano', v)}
                options={damageCategoryOptions}
              />
              <Field label="Costo estimado" type="number" value={String(form.costo_estimado)} onChange={(v) => onChange('costo_estimado', v)} placeholder="0.00" />
              <Field label="URL foto" value={String(form.foto_url_pieza)} onChange={(v) => onChange('foto_url_pieza', v)} placeholder="https://..." />
            </div>
            <CheckField label="Requiere reemplazo" checked={Boolean(form.requiere_reemplazo)} onChange={(v) => onChange('requiere_reemplazo', v)} />
            <TextField label="Observación" value={String(form.observacion_pieza)} onChange={(v) => onChange('observacion_pieza', v)} />

            {process.proforma.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-medium uppercase text-gray-500">Piezas registradas ({process.proforma.length})</p>
                <div className="space-y-1">
                  {process.proforma.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                      <span className="font-medium text-gray-900">{p.pieza}</span>
                      <span className="text-gray-500">{p.categoria_dano} · ${p.costo_estimado}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Pestaña 2: Aprobación */}
          <TabsContent value="aprobacion" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label="Estado de aprobación"
                value={String(form.estado_aprobacion)}
                onChange={(v) => onChange('estado_aprobacion', v)}
                options={
                  tipoCliente === 'PARTICULAR'
                    ? ['PENDIENTE_ENVIO', 'ENVIADO', 'APROBADO', 'RECHAZADO']
                    : ['PENDIENTE_ENVIO', 'ENVIADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'OBSERVADO']
                }
              />
              <Field
                label={tipoCliente === 'PARTICULAR' ? 'Fecha envío proforma al cliente' : 'Fecha envío a aseguradora'}
                type="date"
                value={String(form.fecha_envio)}
                onChange={(v) => onChange('fecha_envio', v)}
              />
              <Field
                label={tipoCliente === 'PARTICULAR' ? 'Fecha aprobación del cliente' : 'Fecha aprobación aseguradora'}
                type="date"
                value={String(form.fecha_aprobacion)}
                onChange={(v) => onChange('fecha_aprobacion', v)}
              />
              {tipoCliente === 'ASEGURADORA' && (
                <Field label="URL documento adjunto" value={String(form.documento_url)} onChange={(v) => onChange('documento_url', v)} placeholder="https://..." />
              )}
            </div>
            <TextField label="Observaciones" value={String(form.observaciones_aprobacion)} onChange={(v) => onChange('observaciones_aprobacion', v)} />
          </TabsContent>

          {/* Pestaña 3: Repuestos */}
          <TabsContent value="repuestos" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Repuesto requerido" value={String(form.descripcion_repuesto)} onChange={(v) => onChange('descripcion_repuesto', v)} placeholder="Parachoques delantero" />
              <Field label="Cantidad" type="number" value={String(form.cantidad_repuesto)} onChange={(v) => onChange('cantidad_repuesto', v)} />
              <SelectField
                label="Estado de compra"
                value={String(form.estado_repuesto)}
                onChange={(v) => onChange('estado_repuesto', v)}
                options={['PENDIENTE', 'SOLICITADO', 'COMPRADO', 'EN_TRANSITO', 'RECIBIDO', 'CANCELADO']}
              />
              <Field label="Proveedor" value={String(form.proveedor)} onChange={(v) => onChange('proveedor', v)} />
              <Field label="Fecha estimada llegada" type="date" value={String(form.fecha_estimada_llegada)} onChange={(v) => onChange('fecha_estimada_llegada', v)} />
              <Field label="Fecha real llegada" type="date" value={String(form.fecha_real_llegada)} onChange={(v) => onChange('fecha_real_llegada', v)} />
              <Field label="Costo" type="number" value={String(form.costo_repuesto)} onChange={(v) => onChange('costo_repuesto', v)} />
            </div>
            <TextField label="Observaciones" value={String(form.observaciones_repuesto)} onChange={(v) => onChange('observaciones_repuesto', v)} />

            {process.repuestos.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-medium uppercase text-gray-500">Repuestos registrados ({process.repuestos.length})</p>
                <div className="space-y-1">
                  {process.repuestos.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                      <span className="font-medium text-gray-900">{r.descripcion}</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${r.estado === 'RECIBIDO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }
```

- [ ] **Step 4: Eliminar los bloques de `GESTION_ASEGURADORA` y `COMPRA_REPUESTO` de `StepFields`**

Borrar los bloques `if (status === 'GESTION_ASEGURADORA')` (líneas ~692–704) e `if (status === 'COMPRA_REPUESTO')` (líneas ~707–720) del cuerpo de `StepFields`.

- [ ] **Step 5: Verificar TypeScript sin errores**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS" && npx tsc --noEmit 2>&1 | head -60
```

Debe compilar sin errores.

- [ ] **Step 6: Levantar el servidor de desarrollo y verificar manualmente**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS" && npm run dev
```

Verificar en el navegador:

1. Abrir una orden existente en estado `LEVANTAMIENTO_PROFORMA`
2. Confirmar que el panel lateral muestra 7 pasos (sin Gestión Aseguradora ni Compra Repuesto)
3. Confirmar que el formulario muestra el selector de tipo de cliente pre-cargado
4. Confirmar que las 3 pestañas son visibles y navegables
5. Cambiar tipo a ASEGURADORA → pestaña Aprobación debe mostrar campo URL documento
6. Cambiar tipo a PARTICULAR → campo URL documento debe ocultarse
7. Guardar una pieza → indicador de Piezas cambia a ✓
8. Registrar aprobación con estado APROBADO → indicador de Aprobación cambia a ✓
9. Registrar un repuesto con estado RECIBIDO → indicador de Repuestos cambia a ✓
10. Con las 3 condiciones cumplidas → botón "Guardar y avanzar a Planificación Reparación" se habilita
11. Con condiciones incumplidas → botón muestra mensaje bloqueante correcto

- [ ] **Step 7: Commit**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS"
git add src/app/pages/OrderDetailPage.tsx
git commit -m "feat: UI con tabs para LEVANTAMIENTO_PROFORMA unificado (Piezas, Aprobacion, Repuestos)"
```

---

## Task 6: Actualizar etiquetas en `historyFieldLabel` y `SavedDataSummary`

**Files:**
- Modify: `src/app/pages/OrderDetailPage.tsx`

- [ ] **Step 1: Agregar nuevas claves en `historyFieldLabel`**

En la función `historyFieldLabel` (líneas ~980–1008), agregar las nuevas claves al objeto `labels`:

```typescript
    tipo_cliente: 'Tipo de cliente',
    estado_aprobacion: 'Estado aprobación',
    observaciones_aprobacion: 'Observaciones aprobación',
    descripcion_repuesto: 'Repuesto',
    cantidad_repuesto: 'Cantidad',
    estado_repuesto: 'Estado repuesto',
    costo_repuesto: 'Costo repuesto',
    foto_url_pieza: 'Foto pieza',
    observacion_pieza: 'Observación pieza',
```

- [ ] **Step 2: Actualizar `SavedDataSummary` para reflejar los nuevos campos**

Localizar el componente `SavedDataSummary` (líneas ~858–882) y reemplazar las cajas de Aseguradora y Repuestos para usar los campos correctos:

```tsx
function SavedDataSummary({ process }: { process: MockOrderProcess }) {
  const aprobacion = process.aseguradora;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos registrados</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SummaryBox title="Piezas" value={`${process.proforma.length} pieza(s)`} detail={process.proforma.at(-1)?.pieza} />
        <SummaryBox
          title="Aprobación"
          value={aprobacion.estado ?? 'PENDIENTE_ENVIO'}
          detail={[
            aprobacion.fecha_envio ? `Envío: ${aprobacion.fecha_envio}` : '',
            aprobacion.fecha_aprobacion ? `Aprobación: ${aprobacion.fecha_aprobacion}` : '',
            aprobacion.observaciones,
          ].filter(Boolean).join(' · ')}
        />
        <SummaryBox title="Repuestos" value={`${process.repuestos.length} repuesto(s)`} detail={process.repuestos.at(-1)?.descripcion} />
        <SummaryBox title="Planificación" value={`${process.tareas.length} tarea(s)`} detail={process.tareas.at(-1)?.operacion} />
        <SummaryBox title="Calidad" value={process.calidad.resultado} detail={process.calidad.observaciones} />
        <SummaryBox title="Entrega" value={process.entrega.confirmada ? 'Confirmada' : 'Pendiente'} detail={process.entrega.fecha_entrega_real} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Build final de verificación**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS" && npm run build 2>&1 | tail -20
```

Debe terminar sin errores.

- [ ] **Step 4: Commit final**

```bash
cd "/Users/eddiesosa/Documents/OneWayEc/PITS/Sistema Gestion PITS"
git add src/app/pages/OrderDetailPage.tsx
git commit -m "feat: actualiza etiquetas de historial y resumen de datos registrados"
```
