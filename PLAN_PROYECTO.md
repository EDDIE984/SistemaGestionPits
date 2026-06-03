# Plan del Proyecto - Sistema de Gestion de Talleres

## Objetivo

Desarrollar un sistema web para gestionar ordenes de ingreso de vehiculos en talleres, controlar el avance por etapas, medir tiempos reales contra tiempos planificados y dar visibilidad operativa por sucursal, isla y jefe de taller.

El sistema debe cubrir el proceso completo desde la recepcion del vehiculo hasta la entrega final.

## Stack Tecnico

Segun `STYLE_GUIDE.md`, el proyecto debe construirse con:

- React 18
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui
- Radix UI
- React Router
- Recharts
- Sonner
- Lucide React
- Supabase (base de datos y cliente JS)
- bcryptjs (hash de contrasenas)
- xlsx (exportacion a Excel)
- jsPDF + jspdf-autotable (exportacion a PDF)

Las credenciales y URLs externas deben configurarse mediante variables de entorno.

## Variables de Entorno

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx

VITE_API_CEDULA_URL=http://nessoftfact-001-site6.atempurl.com/api/ConsultasDatos/ConsultaCedulaV2
VITE_API_CEDULA_KEY=xxxx

VITE_API_PLACA_URL=https://webservices.ec/api/placas
VITE_API_PLACA_TOKEN=xxxx
```

Nota tecnica: los tokens de cedula y placa estan expuestos en el frontend. Se recomienda migrarlos a una Supabase Edge Function cuando sea posible.

---

## Modulos Principales

### 1. Autenticacion por Tabla

El sistema no utiliza la autenticacion nativa de Supabase. Se gestiona mediante una tabla `usuarios` propia.

**Mecanismo de sesion:**

- Las contrasenas se guardan hasheadas con bcrypt en la tabla `usuarios`
- Al hacer login se consulta la tabla, se compara el hash y si es valido se guarda el perfil del usuario en `localStorage`
- Un `AuthContext` en React expone el usuario activo a toda la aplicacion
- Un hook `useAuth` permite acceder al usuario desde cualquier componente
- Las rutas protegidas usan un componente `PrivateRoute` que redirige a `/login` si no hay sesion activa
- Al cerrar sesion se limpia `localStorage` y se resetea el contexto

**Datos que se guardan en sesion (localStorage):**

```json
{
  "id": "uuid",
  "nombre": "Juan Perez",
  "rol": "ASESOR",
  "sucursal_id": "uuid",
  "sucursal_nombre": "Taller Norte"
}
```

**Consideracion:** este esquema no permite invalidar sesiones desde el servidor. Es aceptable para un sistema interno de taller. Si en el futuro se requiere invalidacion remota, se puede agregar un campo `token_sesion` en la tabla `usuarios` que se valide en cada carga.

### 2. Configuracion Base

Permite administrar los datos estructurales del sistema. Solo accesible para el rol Administrador.

Incluye:

- Companias
- Sucursales / talleres
- Aseguradoras
- Planes de aseguradora
- Islas de trabajo
- Usuarios
- Roles
- Tecnicos
- Tarifas hora hombre
- Catalogo de operaciones

Islas iniciales:

- Enderezada
- Pintura
- Mecanica
- Calidad

Roles del sistema:

- `ADMINISTRADOR` — acceso total
- `ASESOR` — gestiona ordenes, proforma, aseguradora, repuestos
- `OPERARIO` — gestiona tareas de su isla
- `JEFE_TALLER` — acceso a dashboard, gantt y reportes
- `VISUALIZADOR` — solo pantalla principal del taller (sin formularios)

### 3. Gestion de Tecnicos

Los tecnicos son un subconjunto de usuarios con datos adicionales relacionados a su trabajo en islas.

Por cada tecnico se debe registrar:

- Usuario asociado
- Sucursal a la que pertenece
- Isla principal donde trabaja
- Especialidades adicionales
- Estado (activo / inactivo)

### 4. Tarifas Hora Hombre

El costo hora hombre puede variar por sucursal, por isla dentro de una sucursal, o por tecnico especifico. Se aplica la tarifa mas especifica disponible.

**Jerarquia de precedencia (de mayor a menor especificidad):**

```
Tecnico especifico > Isla en sucursal > Sucursal general
```

Por cada tarifa se debe guardar:

- Sucursal
- Isla (opcional)
- Tecnico (opcional)
- Valor por hora
- Fecha desde (vigencia)
- Fecha hasta (opcional, null = vigente)

Esto permite tener historial de tarifas y calcular costos correctamente segun la fecha en que se ejecuto el trabajo.

### 5. Catalogo de Operaciones (Flat Rate)

El sistema usa un modelo de precio por operacion estandar. Cada operacion tiene un tiempo predefinido independientemente del tiempo real que tome al tecnico.

**Formula de costo:**

```
costo_operacion = tiempo_estandar_horas × tarifa_hora_hombre
```

El catalogo es administrado desde la pantalla de configuracion y viene precargado con operaciones estandar (ver seccion Catalogo Semilla al final del documento).

Por cada operacion del catalogo se guarda:

- Nombre de la operacion
- Isla a la que pertenece
- Tiempo estandar en horas (ej: 3.5)
- Codigo de referencia Audatex (opcional, para trazabilidad)
- Descripcion adicional
- Estado (activo / inactivo)

**Ajuste por orden:** al planificar una orden, el asesor puede modificar el tiempo estandar para esa operacion especifica sin afectar el catalogo base. El sistema guarda el tiempo estandar original y el tiempo ajustado por separado para poder auditar las modificaciones.

**Tiempo real del tecnico:** aunque el costo se calcula con el tiempo estandar, el sistema sigue midiendo el tiempo real que tarda el tecnico (via inicio/pausa/fin de tarea) para calcular el indice de eficiencia.

**Formula de eficiencia:**

```
eficiencia = (tiempo_estandar / tiempo_real) × 100

Ejemplo:
  Operacion estandar: 3.5h
  Tecnico tardo: 2.8h
  Eficiencia: (3.5 / 2.8) × 100 = 125%   ← tecnico mas rapido que el estandar

  Tecnico tardo: 5.0h
  Eficiencia: (3.5 / 5.0) × 100 = 70%    ← tecnico mas lento que el estandar
```

Un indice mayor a 100% significa que el tecnico es mas eficiente que el estandar. Este indicador se muestra en el dashboard del jefe de taller y en el reporte de productividad.

### 6. Clientes y Vehiculos

Permite registrar y consultar informacion de clientes y vehiculos.

Funciones:

- Consulta automatica por cedula/RUC via API externa
- Consulta automatica por placa via API externa
- Registro o actualizacion de cliente
- Registro o actualizacion de vehiculo
- Asociacion entre cliente, vehiculo y orden

### 7. Ordenes de Ingreso

Pantalla principal para registrar el ingreso de un vehiculo al taller.

Campos requeridos:

- Sucursal de ingreso
- Placa del vehiculo
- Modelo del vehiculo
- Chasis
- Marca
- Motor
- Aseguradora (opcional)
- Plan aseguradora (opcional, depende de si aplica aseguradora)
- Cedula de identidad o RUC
- Nombre completo
- Direccion
- Telefono
- Correo
- Ciudad

Estado inicial:

```txt
INGRESADA
```

### 8. Flujo de Estados

```txt
INGRESADA
LEVANTAMIENTO_PROFORMA
GESTION_ASEGURADORA     ← opcional, puede saltarse
COMPRA_REPUESTO
PLANIFICACION_REPARACION
INICIO_REPARACION
CONTROL_CALIDAD
LISTO_ENTREGA
ENTREGADO
```

**Regla de aseguradora:** al avanzar desde `LEVANTAMIENTO_PROFORMA`, el sistema pregunta si aplica gestion de aseguradora. Si no aplica, el flujo salta directamente a `COMPRA_REPUESTO`.

Cada cambio de estado se guarda en historial con:

- Orden
- Estado anterior
- Estado nuevo
- Usuario responsable
- Fecha y hora
- Observacion

### 9. Levantamiento de Proforma

Pantalla para que el asesor registre piezas afectadas y categorice el dano.

Categorias:

- `K1` - Se puede remover limpiando
- `K2` - Se puede remover puliendo
- `K3` - Dano pequeno que requiere un profesional
- `K4` - Un profesional tiene que reparar
- `K5` - Puede que la parte requiera reemplazo

Por cada pieza se debe guardar:

- Orden
- Pieza
- Categoria de dano
- Observacion
- Requiere reemplazo
- Costo estimado (si aplica)
- Links de fotos (URLs externas)

### 10. Gestion de Aseguradora

Modulo opcional. Solo se activa si aplica aseguradora para la orden.

Debe permitir registrar:

- Si aplica aseguradora
- Fecha de envio
- Estado de aprobacion
- Fecha de aprobacion
- Observaciones
- Links de documentos adjuntos (URLs externas)
- Usuario responsable

Estados:

- `NO_APLICA`
- `PENDIENTE_ENVIO`
- `ENVIADO`
- `EN_REVISION`
- `APROBADO`
- `RECHAZADO`
- `OBSERVADO`

### 11. Compra de Repuestos

Por cada repuesto se debe registrar:

- Repuesto requerido
- Cantidad
- Estado de compra
- Proveedor
- Fecha estimada de llegada
- Fecha real de llegada
- Costo
- Observaciones

Estados:

- `PENDIENTE`
- `SOLICITADO`
- `COMPRADO`
- `EN_TRANSITO`
- `RECIBIDO`
- `CANCELADO`

### 12. Planificacion por Islas (Flat Rate)

Cuando la orden esta lista para reparacion, el asesor planifica las operaciones por isla usando el catalogo de operaciones.

**Flujo de planificacion:**

1. El asesor selecciona las operaciones del catalogo que aplican para cada isla
2. El sistema carga automaticamente el tiempo estandar de cada operacion
3. El asesor puede ajustar el tiempo estandar para esa orden si la reparacion es mas compleja
4. El sistema calcula el costo usando la tarifa hora hombre vigente
5. Se asigna un tecnico responsable y fechas de inicio/fin planificadas

Por cada tarea de isla se guarda:

- Orden
- Isla
- Operacion del catalogo (referencia)
- Tecnico responsable
- Tiempo estandar original (snapshot del catalogo)
- Tiempo estandar ajustado (puede diferir si el asesor lo modifico)
- Motivo del ajuste (si aplica)
- Fecha/hora inicio planificada
- Fecha/hora fin planificada
- Fecha/hora inicio real
- Fecha/hora fin real
- Tiempo real calculado (total - pausas)
- Tarifa hora hombre aplicada (snapshot al momento de planificar)
- Costo estimado (tiempo_estandar_ajustado × tarifa)
- Costo real referencial (tiempo_real × tarifa, solo para analisis interno)
- Estado de tarea
- Observaciones

**Calculos:**

```txt
costo_facturado   = tiempo_estandar_ajustado × tarifa_hora
costo_interno     = tiempo_real × tarifa_hora   (no se factura, es para analisis)
eficiencia        = (tiempo_estandar_ajustado / tiempo_real) × 100
desviacion_tiempo = tiempo_real - tiempo_estandar_ajustado
```

**Reasignacion:** una tarea puede reasignarse a otro tecnico con historial de quien la tenia antes, quien la recibe, fecha y motivo. La tarifa se recalcula si el nuevo tecnico tiene una tarifa diferente.

### 13. Pantalla Operativa por Isla

Cada isla tiene una pantalla para que el operario gestione sus tareas.

Funciones:

- Ver vehiculos asignados a su isla
- Identificar vehiculo actual
- Identificar proximo vehiculo
- Iniciar tarea
- Pausar tarea (registra hora de pausa)
- Reanudar tarea (registra hora de reanudacion)
- Finalizar tarea
- Registrar observaciones
- Marcar novedad o atraso

**Regla de control operativo:**

- El estado `INICIO_REPARACION` no se avanza manualmente desde el detalle de la orden.
- Las acciones operativas se ejecutan exclusivamente desde la pantalla de isla.
- Al ejecutar `INICIAR` por primera vez, se registra `fecha_inicio_real` y la orden cambia automaticamente a `EN_PROCESO_ISLAS`.
- Si una tarea esta `PAUSADA`, la accion `INICIAR` se interpreta como `REANUDAR` y queda registrada como evento independiente.
- `FINALIZAR` solo se permite cuando la tarea esta `EN_PROCESO`; no se debe finalizar una tarea que nunca inicio.
- Al finalizar una tarea se registra `fecha_fin_real`.
- Cuando todas las tareas/islas planificadas de la orden estan `COMPLETADA`, la orden cambia automaticamente a `CONTROL_CALIDAD`.
- El detalle de la orden solo muestra el resumen operativo de islas, fechas planificadas, fechas reales y avance temporal; no muestra botones de guardar o avanzar durante `INICIO_REPARACION` ni `EN_PROCESO_ISLAS`.

**Historial operativo obligatorio:**

Cada accion del tecnico debe guardarse en `orden_isla_tarea_eventos`:

- `INICIAR`
- `PAUSAR`
- `REANUDAR`
- `FINALIZAR`

La bitacora debe conservar todos los ciclos de trabajo, por ejemplo:

```txt
INICIAR -> PAUSAR -> REANUDAR -> PAUSAR -> REANUDAR -> FINALIZAR
```

Esto permite medir el tiempo real efectivo y auditar cada interrupcion.

**Calculo de tiempo real:** se descuenta cada periodo pausado del tiempo total entre `fecha_inicio_real` y `fecha_fin_real`. Si la tarea aun no finaliza, el tiempo real parcial se calcula hasta la hora actual descontando pausas cerradas y, si hay una pausa activa, deteniendo el conteo en el inicio de esa pausa.

Colores de estado:

- Verde: a tiempo
- Amarillo: menos del 20% del tiempo planificado restante
- Rojo: atrasado (hora actual supera la hora fin planificada)
- Azul: proximo vehiculo (aun no iniciado)

**Base para futura app movil:**

La app movil de operarios debe reutilizar estas mismas reglas:

- Listar tareas asignadas por isla/tecnico y sucursal.
- Mostrar OT, placa, vehiculo, operacion, tecnico, inicio/fin planificado, estado actual y semaforo.
- Permitir solo acciones validas segun estado:
  - `PENDIENTE` -> `INICIAR`
  - `EN_PROCESO` -> `PAUSAR` o `FINALIZAR`
  - `PAUSADA` -> `REANUDAR`
  - `COMPLETADA` -> sin acciones operativas
- Registrar cada accion en `orden_isla_tarea_eventos`.
- Actualizar `orden_isla_tareas.estado`, `fecha_inicio_real` y `fecha_fin_real` segun corresponda.
- Cambiar la orden a `EN_PROCESO_ISLAS` al primer inicio/reanudacion operativo.
- Cambiar la orden a `CONTROL_CALIDAD` cuando todas las tareas planificadas esten completadas.
- No permitir avance manual del flujo de orden desde la app movil; la transicion depende del estado real de las tareas.
- Sincronizar historial completo para medir tiempo real, pausas y eficiencia.

### 14. Control de Calidad

Una vez que todas las islas completan su trabajo, la orden pasa a `CONTROL_CALIDAD`.

El responsable de calidad debe:

- Revisar una lista de puntos de control configurables por taller
- Marcar cada punto como aprobado u observado
- Registrar observaciones por punto
- Adjuntar links de fotos de la revision
- Aprobar o rechazar la revision

Si es aprobada, la orden avanza a `LISTO_ENTREGA`.
Si es rechazada, la orden regresa a `INICIO_REPARACION` con observaciones para correccion en las islas.

### 15. Proceso de Entrega

Cuando la orden esta en `LISTO_ENTREGA`, el asesor gestiona la entrega al cliente.

Debe registrarse:

- Fecha y hora de notificacion al cliente
- Fecha y hora de entrega real
- Observaciones de entrega
- Links de fotos del vehiculo al momento de entrega
- Confirmacion de entrega

Al confirmar, la orden pasa a `ENTREGADO` y queda cerrada.

### 16. Adjuntos y Fotos

El sistema no almacena archivos. Unicamente guarda URLs externas (Google Drive, Dropbox, S3, etc.).

En los modulos que lo requieren se pueden agregar links con:

- URL del archivo
- Descripcion
- Fecha de carga
- Usuario que lo agrego

### 17. Pantalla Principal de Taller

Vista proyectable en pantalla principal del taller. Accesible con rol `VISUALIZADOR`.

Debe mostrar:

- Cards por isla con vehiculo actual y proximo
- Hora planificada de finalizacion y tiempo restante o atraso
- Estado visual por color (semaforo)
- Filtro por sucursal
- Actualizacion automatica

### 18. Dashboard Jefe de Taller

**Vistas del Gantt:** diaria, semanal y mensual con filtro obligatorio por sucursal.

Debe incluir:

- Cronograma por isla con barras por orden/tarea
- Indicador visual de atraso sobre las barras
- Ordenes activas, planificadas y completadas
- Capacidad ocupada por isla

KPIs:

- Ordenes ingresadas en el periodo
- Ordenes en reparacion
- Ordenes atrasadas
- Tiempo promedio de reparacion
- Tiempo promedio por etapa
- Cumplimiento de planificacion (%)
- Costo facturado vs costo interno de mano de obra
- **Eficiencia promedio por tecnico** (tiempo_estandar / tiempo_real × 100)
- **Top operaciones con mayor desviacion** (donde los tecnicos se alejan mas del estandar)

### 19. Reportes

Modulo de reportes con exportacion a PDF y Excel.

| Reporte | Descripcion |
|---|---|
| Ordenes por estado | Listado filtrable por sucursal, estado y rango de fechas |
| Tiempos por etapa | Tiempo real vs planificado por cada estado del flujo |
| Atrasos por isla | Ordenes y tareas con desvio positivo de tiempo |
| Costos de mano de obra | Estimado facturado vs costo interno real |
| Productividad por tecnico | Horas trabajadas, eficiencia promedio, ordenes completadas |
| Historial de orden | Trazabilidad completa de una orden especifica |
| Operaciones ajustadas | Ordenes donde el asesor modifico el tiempo estandar del catalogo |

### 20. Notificaciones Internas

Alertas visibles para `JEFE_TALLER` y `ADMINISTRADOR`:

- Orden sin cambio de estado por mas de N dias configurables
- Tarea de isla superando la hora fin planificada
- Repuesto sin llegar pasada la fecha estimada
- Orden rechazada en control de calidad
- Orden lista para entrega sin confirmar en mas de N dias

Las notificaciones se muestran en un icono de campana en el header y en una bandeja de notificaciones.

---

## Modelo de Datos

### Tablas

```
companias
sucursales
roles
usuarios
tecnicos
tarifas_hora_hombre
aseguradoras
planes_aseguradora
clientes
vehiculos
ordenes
orden_estados_historial
orden_eventos_historial
orden_piezas_danos
orden_gestion_aseguradora
repuestos
orden_repuestos
islas
operaciones_catalogo
orden_isla_tareas
orden_isla_tarea_pausas
orden_isla_tarea_eventos
orden_isla_tarea_reasignaciones
checklist_calidad_puntos
orden_calidad_revision
orden_calidad_revision_puntos
orden_entrega
adjuntos
notificaciones
```

### Tablas clave explicadas

**`operaciones_catalogo`**
```
id, nombre, isla_id, tiempo_estandar_horas, codigo_audatex (nullable),
descripcion, activo
```

**`orden_isla_tareas`**
```
id, orden_id, isla_id, operacion_catalogo_id,
tecnico_id, estado,
tiempo_estandar_original,     -- snapshot del catalogo al planificar
tiempo_estandar_ajustado,     -- puede diferir si el asesor lo modifico
motivo_ajuste,
tarifa_hora_aplicada,         -- snapshot de la tarifa vigente al planificar
costo_estimado,               -- tiempo_estandar_ajustado × tarifa
tiempo_real_horas,            -- calculado desde pausas y tiempos reales
costo_interno,                -- tiempo_real × tarifa (solo para analisis)
eficiencia,                   -- tiempo_estandar_ajustado / tiempo_real × 100
fecha_inicio_planificada, fecha_fin_planificada,
fecha_inicio_real, fecha_fin_real,
observaciones
```

**`tarifas_hora_hombre`**
```
id, sucursal_id, isla_id (nullable), tecnico_id (nullable),
valor_hora, fecha_desde, fecha_hasta (nullable)
```

**`orden_isla_tarea_pausas`**
```
id, tarea_id, inicio_pausa, fin_pausa (nullable), motivo
```

**`orden_isla_tarea_eventos`**
```
id, tarea_id, usuario_id, accion,
estado_resultante, fecha_hora, observacion
```

Registra cada inicio, pausa, reanudacion y finalizacion de la tarea. Esta bitacora permite auditar la operacion real del taller y reconstruir tiempos si se requiere. Para la futura app movil, esta tabla sera la fuente de verdad del historial operativo y debe conservar todos los ciclos de pausa/reanudacion hasta la finalizacion.

**`orden_isla_tarea_reasignaciones`**
```
id, tarea_id, tecnico_anterior_id, tecnico_nuevo_id,
usuario_responsable_id, fecha_reasignacion, motivo,
tarifa_anterior, tarifa_nueva
```

**`orden_estados_historial`**
```
id, orden_id, estado_anterior, estado_nuevo,
usuario_id, fecha_hora, observacion
```

---

## Rutas de la Aplicacion

```txt
/login

/dashboard

/configuracion
/configuracion/companias
/configuracion/sucursales
/configuracion/aseguradoras
/configuracion/planes
/configuracion/islas
/configuracion/usuarios
/configuracion/tecnicos
/configuracion/tarifas
/configuracion/catalogo-operaciones

/ordenes
/ordenes/nueva
/ordenes/:id
/ordenes/:id/proforma
/ordenes/:id/aseguradora
/ordenes/:id/repuestos
/ordenes/:id/planificacion
/ordenes/:id/calidad
/ordenes/:id/entrega

/islas
/islas/:islaId

/pantalla-taller

/gantt

/reportes
/reportes/ordenes
/reportes/tiempos
/reportes/atrasos
/reportes/costos
/reportes/productividad
/reportes/historial-orden
/reportes/operaciones-ajustadas

/notificaciones
```

---

## Lineamientos de UI

El diseno debe seguir `STYLE_GUIDE.md`.

Principios:

- Layout con sidebar colapsable
- Fondo interno `bg-gray-50`
- Cards blancas con borde suave
- Boton primario `#030213`
- Badges para estados
- Iconos desde `lucide-react`
- Tablas para CRUD
- Cards operativas para pantalla de isla
- Recharts para KPIs y reportes
- Interfaz densa, clara y orientada a operacion

No se debe construir una landing page. La primera vista despues del login debe ser una pantalla util del sistema.

---

## Fases de Implementacion

### Fase 1. Base del Proyecto

- Crear proyecto Vite + React + TypeScript
- Instalar dependencias
- Configurar alias `@`
- Configurar layout base con sidebar
- Configurar React Router
- Agregar Toaster (Sonner)
- Crear archivo `.env`
- Configurar cliente Supabase
- Crear `AuthContext`, hook `useAuth` y componente `PrivateRoute`

### Fase 2. Catalogos y Datos Base

- Companias
- Sucursales
- Aseguradoras y planes
- Islas
- Roles
- Usuarios (con hash de contrasena)
- Tecnicos
- Tarifas hora hombre
- Catalogo de operaciones (con carga del catalogo semilla precargado)

### Fase 3. Autenticacion

- Pantalla de login
- Validacion contra tabla `usuarios` con bcrypt
- Guardado de sesion en `localStorage`
- Cierre de sesion
- Redireccion por rol al hacer login
- Proteccion de rutas por rol

### Fase 4. Ordenes de Ingreso

- Formulario de ingreso con consulta por cedula/RUC y placa
- Registro de cliente y vehiculo
- Registro de orden con estado inicial
- Historial de estados

### Fase 5. Flujo de Taller

- Levantamiento de proforma por piezas
- Gestion de aseguradora (flujo opcional)
- Gestion de repuestos
- Planificacion por isla con seleccion de operaciones del catalogo y ajuste de tiempos

### Fase 6. Operacion por Isla

- Pantalla de tareas por isla
- Inicio, pausa, reanudacion y finalizacion de tarea
- Calculo de tiempo real y eficiencia
- Reasignacion de tecnico
- Semaforo de tiempos
- Base funcional para app movil de operarios usando las mismas reglas de estado y bitacora

### Fase 7. Control de Calidad y Entrega

- Checklist de puntos de calidad configurables
- Revision de calidad con aprobacion/rechazo
- Proceso de entrega con confirmacion
- Cierre de orden

### Fase 8. Pantalla Principal y Dashboard

- Pantalla proyectable del taller
- Dashboard tipo Gantt con vistas diaria, semanal y mensual
- Filtro por sucursal
- KPIs incluyendo eficiencia por tecnico

### Fase 9. Reportes y Notificaciones

- Modulo de reportes con filtros
- Exportacion a PDF y Excel
- Reporte de eficiencia y productividad por tecnico
- Reporte de operaciones con tiempos ajustados
- Bandeja de notificaciones internas
- Generacion de alertas por reglas de negocio

### Fase 10. Validacion Final

- Pruebas del flujo completo por rol
- Validacion responsive
- Validacion de acceso por rol
- Validacion de calculos (eficiencia, pausas, tarifas)
- Revision visual contra `STYLE_GUIDE.md`

---

## Decisiones Tecnicas Confirmadas

| Decision | Resolucion |
|---|---|
| Base de datos | Supabase |
| Autenticacion | Tabla propia `usuarios`, sin auth nativa de Supabase |
| Sesion | `localStorage` + React Context |
| Contrasenas | Hasheadas con bcrypt |
| Gestion de aseguradora | Opcional, puede saltarse por orden |
| Pausa de tareas | Permitida, con registro en `orden_isla_tarea_pausas` |
| Reasignacion de tecnico | Permitida, con historial en `orden_isla_tarea_reasignaciones` |
| Costo hora hombre | Variable con jerarquia sucursal > isla > tecnico |
| Modelo de costeo | Flat rate: tiempo_estandar_catalogo × tarifa_hora |
| Ajuste de tiempo estandar | Permitido por orden, sin modificar el catalogo base |
| Medicion de tiempo real | Si, para calcular eficiencia (no afecta el costo facturado) |
| Eficiencia | tiempo_estandar_ajustado / tiempo_real × 100 |
| Catalogo de operaciones | Precargado con semilla estandar, editable desde configuracion |
| Codigo Audatex | Campo opcional en cada operacion del catalogo para trazabilidad |
| Adjuntos y fotos | Solo URLs externas, no se sube ningun archivo |
| Exportacion de reportes | PDF (jsPDF) y Excel (xlsx) |
| Notificaciones al cliente | No aplica, solo alertas internas |
| Vistas del Gantt | Diaria, semanal y mensual con filtro por sucursal |

---

## MVP Recomendado

Primera version funcional:

- Autenticacion por tabla
- Catalogos basicos incluyendo operaciones
- Registro de orden con consulta por cedula y placa
- Flujo de estados completo
- Levantamiento de proforma
- Planificacion por isla con flat rate y ajuste de tiempos
- Pantalla operativa por isla con semaforo, pausa/reanudacion y eficiencia
- Pantalla principal de taller
- Dashboard basico con Gantt semanal y KPIs de eficiencia

Segunda iteracion:

- Control de calidad con checklist
- Proceso de entrega formal
- Reportes con exportacion
- Notificaciones internas
- Gantt completo con vistas diaria y mensual
- Analitica historica de tiempos, costos y eficiencia por tecnico

---

## Catalogo Semilla de Operaciones

Operaciones precargadas para revision y ajuste del cliente. Los tiempos estan basados en estandares Audatex para carroceria y colision. Todos los tiempos estan en horas.

### Isla: Enderezada

| Operacion | Tiempo Estandar (h) | Codigo Ref |
|---|---|---|
| Desmontaje y montaje de capo | 1.5 | END-001 |
| Desmontaje y montaje de puerta delantera | 1.0 | END-002 |
| Desmontaje y montaje de puerta trasera | 1.0 | END-003 |
| Desmontaje y montaje de guardafango delantero | 1.5 | END-004 |
| Desmontaje y montaje de guardafango trasero | 1.5 | END-005 |
| Desmontaje y montaje de parachoque delantero | 1.0 | END-006 |
| Desmontaje y montaje de parachoque trasero | 1.0 | END-007 |
| Desmontaje y montaje de cubierta maletero | 1.5 | END-008 |
| Desmontaje y montaje de techo corredizo | 2.0 | END-009 |
| Enderezado de capo (dano leve) | 2.0 | END-010 |
| Enderezado de capo (dano medio) | 3.5 | END-011 |
| Enderezado de capo (dano severo) | 5.0 | END-012 |
| Enderezado de puerta delantera (dano leve) | 2.0 | END-013 |
| Enderezado de puerta delantera (dano medio) | 3.5 | END-014 |
| Enderezado de puerta delantera (dano severo) | 5.5 | END-015 |
| Enderezado de puerta trasera (dano leve) | 2.0 | END-016 |
| Enderezado de puerta trasera (dano medio) | 3.5 | END-017 |
| Enderezado de puerta trasera (dano severo) | 5.0 | END-018 |
| Enderezado de guardafango delantero (dano leve) | 2.0 | END-019 |
| Enderezado de guardafango delantero (dano medio) | 3.0 | END-020 |
| Enderezado de guardafango delantero (dano severo) | 4.5 | END-021 |
| Enderezado de guardafango trasero (dano leve) | 2.5 | END-022 |
| Enderezado de guardafango trasero (dano medio) | 3.5 | END-023 |
| Enderezado de guardafango trasero (dano severo) | 5.0 | END-024 |
| Enderezado de cubierta maletero (dano leve) | 2.0 | END-025 |
| Enderezado de cubierta maletero (dano medio) | 3.5 | END-026 |
| Enderezado de cubierta maletero (dano severo) | 5.0 | END-027 |
| Enderezado de techo (dano leve) | 3.0 | END-028 |
| Enderezado de techo (dano medio) | 5.0 | END-029 |
| Enderezado de techo (dano severo) | 8.0 | END-030 |
| Enderezado de pilar A | 2.0 | END-031 |
| Enderezado de pilar B | 2.5 | END-032 |
| Enderezado de pilar C | 2.0 | END-033 |
| Enderezado de larguero delantero | 4.0 | END-034 |
| Enderezado de larguero trasero | 4.0 | END-035 |
| Alineacion de carroceria en bancada (dano medio) | 8.0 | END-036 |
| Alineacion de carroceria en bancada (dano severo) | 14.0 | END-037 |
| Reemplazo de capo | 2.5 | END-038 |
| Reemplazo de puerta delantera | 3.0 | END-039 |
| Reemplazo de puerta trasera | 3.0 | END-040 |
| Reemplazo de guardafango delantero | 2.0 | END-041 |
| Reemplazo de guardafango trasero | 2.5 | END-042 |
| Reemplazo de cubierta maletero | 3.0 | END-043 |
| Masillado y preparacion de superficie (por pieza) | 1.5 | END-044 |
| Reparacion de umbral de puerta | 2.0 | END-045 |

### Isla: Pintura

| Operacion | Tiempo Estandar (h) | Codigo Ref |
|---|---|---|
| Preparacion y pintura de capo | 4.0 | PIN-001 |
| Preparacion y pintura de puerta delantera | 3.5 | PIN-002 |
| Preparacion y pintura de puerta trasera | 3.5 | PIN-003 |
| Preparacion y pintura de guardafango delantero | 3.0 | PIN-004 |
| Preparacion y pintura de guardafango trasero | 3.5 | PIN-005 |
| Preparacion y pintura de parachoque delantero | 3.0 | PIN-006 |
| Preparacion y pintura de parachoque trasero | 3.0 | PIN-007 |
| Preparacion y pintura de cubierta maletero | 4.0 | PIN-008 |
| Preparacion y pintura de techo | 5.0 | PIN-009 |
| Preparacion y pintura de espejo retrovisor | 1.0 | PIN-010 |
| Pintura general vehiculo completo (hasta 4 puertas) | 20.0 | PIN-011 |
| Pintura general vehiculo completo (SUV / furgon) | 28.0 | PIN-012 |
| Aplicacion de barniz protector (por pieza) | 0.5 | PIN-013 |
| Pulida y encerada general | 3.0 | PIN-014 |
| Pulida y encerada parcial (por zona) | 1.0 | PIN-015 |
| Correccion de pintura zona pequena | 1.5 | PIN-016 |
| Igualacion de color zona pequena | 2.0 | PIN-017 |
| Retoque de pintura (rayon superficial) | 0.5 | PIN-018 |
| Aplicacion de anticorosivo en zonas tratadas | 1.0 | PIN-019 |
| Pintura de partes plasticas (parachoque) | 2.5 | PIN-020 |
| Aplicacion de protector de piedras (por zona) | 1.0 | PIN-021 |
| Pintura de umbral de puerta | 1.5 | PIN-022 |
| Desengrase y preparacion general previa a pintura | 2.0 | PIN-023 |

### Isla: Mecanica

| Operacion | Tiempo Estandar (h) | Codigo Ref |
|---|---|---|
| Cambio de parabrisas delantero | 2.0 | MEC-001 |
| Cambio de luna trasera | 2.0 | MEC-002 |
| Cambio de luna lateral fija | 1.5 | MEC-003 |
| Cambio de luna lateral electrica | 2.5 | MEC-004 |
| Calibracion de sensor ADAS en parabrisas | 1.5 | MEC-005 |
| Revision y ajuste de puertas | 1.0 | MEC-006 |
| Revision y reparacion de mecanismo de cierre | 1.5 | MEC-007 |
| Cambio de bisagras de puerta | 1.0 | MEC-008 |
| Revision de sistema electrico basico (puertas, faros) | 2.0 | MEC-009 |
| Cambio de faro delantero | 0.5 | MEC-010 |
| Cambio de faro trasero | 0.5 | MEC-011 |
| Cambio de conjunto faro (con ajuste) | 1.5 | MEC-012 |
| Cambio de espejo retrovisor exterior | 0.5 | MEC-013 |
| Cambio de espejo retrovisor con electronica | 1.5 | MEC-014 |
| Cambio de radiador | 2.5 | MEC-015 |
| Cambio de condensador de A/C | 2.0 | MEC-016 |
| Revision de sistema de A/C post-colision | 1.5 | MEC-017 |
| Cambio de parachoque delantero completo | 1.0 | MEC-018 |
| Cambio de parachoque trasero completo | 1.0 | MEC-019 |
| Desmontaje parcial de tablero | 3.0 | MEC-020 |
| Revision de airbags (sin reemplazo) | 2.0 | MEC-021 |
| Reemplazo de bolsa de airbag | 3.0 | MEC-022 |
| Reemplazo de modulo de airbag | 1.5 | MEC-023 |
| Cambio de cinturones de seguridad | 1.0 | MEC-024 |
| Revision de sistema de direccion post-colision | 2.0 | MEC-025 |
| Revision de suspension delantera post-colision | 2.5 | MEC-026 |
| Revision de suspension trasera post-colision | 2.0 | MEC-027 |
| Cambio de capot con bisagras y soporte | 2.0 | MEC-028 |
| Reparacion de sistema de escape (dano colision) | 1.5 | MEC-029 |
| Revision y ajuste de alineacion y balanceo | 1.5 | MEC-030 |

### Isla: Calidad

| Operacion | Tiempo Estandar (h) | Codigo Ref |
|---|---|---|
| Inspeccion final de carroceria y pintura | 1.0 | CAL-001 |
| Inspeccion final de mecanica y electricos | 1.0 | CAL-002 |
| Prueba de ruta | 0.5 | CAL-003 |
| Verificacion de ajuste de puertas y capo | 0.5 | CAL-004 |
| Verificacion de lunas y sellos | 0.5 | CAL-005 |
| Verificacion de iluminacion completa | 0.5 | CAL-006 |
| Lavado y limpieza interior y exterior pre-entrega | 1.5 | CAL-007 |
| Descontaminacion de pintura (clay bar) | 1.0 | CAL-008 |
| Documentacion fotografica final | 0.5 | CAL-009 |

---

*Nota: los tiempos del catalogo semilla son referencias estandar. El cliente debe revisarlos y ajustarlos segun su experiencia operativa real y los valores que maneja en Audatex. El codigo de referencia (Cod Ref) puede reemplazarse por el codigo oficial de Audatex una vez revisado.*
