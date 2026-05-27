-- ================================================================
-- SISTEMA GESTIÓN PITS — Script de Migración Supabase
-- Ejecutar en: Supabase > SQL Editor > New Query
-- ================================================================

-- ── TIPOS ENUMERADOS ─────────────────────────────────────────────

CREATE TYPE estado_orden AS ENUM (
  'INGRESADA',
  'LEVANTAMIENTO_PROFORMA',
  'GESTION_ASEGURADORA',
  'COMPRA_REPUESTO',
  'PLANIFICACION_REPARACION',
  'INICIO_REPARACION',
  'EN_PROCESO_ISLAS',
  'CONTROL_CALIDAD',
  'LISTO_ENTREGA',
  'ENTREGADO'
);

CREATE TYPE estado_tarea AS ENUM (
  'PENDIENTE', 'EN_PROCESO', 'PAUSADA', 'COMPLETADA'
);

CREATE TYPE estado_aseguradora AS ENUM (
  'NO_APLICA', 'PENDIENTE_ENVIO', 'ENVIADO',
  'EN_REVISION', 'APROBADO', 'RECHAZADO', 'OBSERVADO'
);

CREATE TYPE estado_repuesto AS ENUM (
  'PENDIENTE', 'SOLICITADO', 'COMPRADO',
  'EN_TRANSITO', 'RECIBIDO', 'CANCELADO'
);

CREATE TYPE accion_tarea AS ENUM (
  'INICIAR', 'PAUSAR', 'REANUDAR', 'FINALIZAR'
);

CREATE TYPE resultado_calidad AS ENUM ('APROBADO', 'RECHAZADO');
CREATE TYPE resultado_punto   AS ENUM ('APROBADO', 'OBSERVADO');

-- ── FUNCIÓN TRIGGER updated_at ──────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── TABLAS SIN DEPENDENCIAS ──────────────────────────────────────

CREATE TABLE companias (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT        NOT NULL,
  ruc         TEXT,
  direccion   TEXT,
  telefono    TEXT,
  correo      TEXT,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT    NOT NULL UNIQUE,
  descripcion TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE aseguradoras (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre   TEXT    NOT NULL,
  ruc      TEXT,
  contacto TEXT,
  telefono TEXT,
  activo   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE repuestos (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT    NOT NULL,
  codigo      TEXT,
  descripcion TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE clientes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula_ruc TEXT,
  nombre     TEXT        NOT NULL,
  direccion  TEXT,
  telefono   TEXT,
  correo     TEXT,
  ciudad     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── NIVEL 1: dependen de tablas base ────────────────────────────

CREATE TABLE sucursales (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  compania_id UUID        NOT NULL REFERENCES companias(id),
  nombre      TEXT        NOT NULL,
  direccion   TEXT,
  ciudad      TEXT,
  telefono    TEXT,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE planes_aseguradora (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  aseguradora_id UUID    NOT NULL REFERENCES aseguradoras(id),
  nombre         TEXT    NOT NULL,
  descripcion    TEXT,
  activo         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE vehiculos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID        NOT NULL REFERENCES clientes(id),
  placa      TEXT        NOT NULL,
  marca      TEXT,
  modelo     TEXT,
  chasis     TEXT,
  motor      TEXT,
  anio       INTEGER,
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── NIVEL 2: dependen de sucursales ─────────────────────────────

CREATE TABLE islas (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID    NOT NULL REFERENCES sucursales(id),
  nombre      TEXT    NOT NULL,
  descripcion TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE usuarios (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id   UUID        REFERENCES sucursales(id),
  rol_id        UUID        NOT NULL REFERENCES roles(id),
  nombre        TEXT        NOT NULL,
  username      TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  email         TEXT,
  activo        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE checklist_calidad_puntos (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID    NOT NULL REFERENCES sucursales(id),
  nombre      TEXT    NOT NULL,
  descripcion TEXT,
  orden       INTEGER NOT NULL DEFAULT 0,
  activo      BOOLEAN NOT NULL DEFAULT true
);

-- ── NIVEL 3: dependen de usuarios e islas ───────────────────────

CREATE TABLE tecnicos (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID    NOT NULL REFERENCES usuarios(id),
  sucursal_id       UUID    NOT NULL REFERENCES sucursales(id),
  isla_principal_id UUID    REFERENCES islas(id),
  especialidades    TEXT,
  activo            BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE operaciones_catalogo (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  isla_id               UUID         NOT NULL REFERENCES islas(id),
  nombre                TEXT         NOT NULL,
  tiempo_estandar_horas NUMERIC(10,2) NOT NULL,
  codigo_audatex        TEXT,
  descripcion           TEXT,
  activo                BOOLEAN      NOT NULL DEFAULT true
);

-- ── NIVEL 4: dependen de tecnicos ───────────────────────────────

CREATE TABLE tarifas_hora_hombre (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id UUID         NOT NULL REFERENCES sucursales(id),
  isla_id     UUID         REFERENCES islas(id),
  tecnico_id  UUID         REFERENCES tecnicos(id),
  valor_hora  NUMERIC(10,2) NOT NULL,
  fecha_desde DATE         NOT NULL DEFAULT CURRENT_DATE,
  fecha_hasta DATE
);

-- ── ORDENES (núcleo) ─────────────────────────────────────────────

CREATE TABLE ordenes (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id            UUID         NOT NULL REFERENCES sucursales(id),
  vehiculo_id            UUID         NOT NULL REFERENCES vehiculos(id),
  cliente_id             UUID         NOT NULL REFERENCES clientes(id),
  asesor_id              UUID         NOT NULL REFERENCES usuarios(id),
  aseguradora_id         UUID         REFERENCES aseguradoras(id),
  plan_aseguradora_id    UUID         REFERENCES planes_aseguradora(id),
  numero_orden           TEXT         NOT NULL UNIQUE,
  estado                 estado_orden NOT NULL DEFAULT 'INGRESADA',
  fecha_ingreso          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fecha_entrega_estimada TIMESTAMPTZ,
  fecha_entrega_real     TIMESTAMPTZ,
  observaciones          TEXT,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── NIVEL 5: dependen de ordenes ────────────────────────────────

CREATE TABLE orden_estados_historial (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id        UUID        NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  usuario_id      UUID        NOT NULL REFERENCES usuarios(id),
  estado_anterior TEXT,
  estado_nuevo    TEXT        NOT NULL,
  fecha_hora      TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacion     TEXT
);

CREATE TABLE orden_eventos_historial (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id         UUID        NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  usuario_id       UUID        NOT NULL REFERENCES usuarios(id),
  tipo_evento      TEXT        NOT NULL,
  estado_actual    TEXT        NOT NULL,
  tabla_referencia TEXT,
  referencia_id    UUID,
  datos_snapshot   JSONB,
  titulo           TEXT        NOT NULL,
  detalle          TEXT,
  fecha_hora       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orden_piezas_danos (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id           UUID         NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  pieza              TEXT         NOT NULL,
  categoria_dano     TEXT         NOT NULL,
  observacion        TEXT,
  requiere_reemplazo BOOLEAN      NOT NULL DEFAULT false,
  costo_estimado     NUMERIC(10,2),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE orden_gestion_aseguradora (
  id                 UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id           UUID               NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  usuario_id         UUID               NOT NULL REFERENCES usuarios(id),
  aplica_aseguradora BOOLEAN            NOT NULL DEFAULT false,
  estado             estado_aseguradora NOT NULL DEFAULT 'PENDIENTE_ENVIO',
  fecha_envio        DATE,
  fecha_aprobacion   DATE,
  observaciones      TEXT,
  created_at         TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE TABLE orden_repuestos (
  id                     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id               UUID            NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  repuesto_id            UUID            REFERENCES repuestos(id),
  descripcion_libre      TEXT,
  cantidad               NUMERIC(10,2)   NOT NULL DEFAULT 1,
  estado                 estado_repuesto NOT NULL DEFAULT 'PENDIENTE',
  proveedor              TEXT,
  fecha_estimada_llegada DATE,
  fecha_real_llegada     DATE,
  costo                  NUMERIC(10,2),
  observaciones          TEXT,
  created_at             TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE orden_isla_tareas (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id                 UUID          NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  isla_id                  UUID          NOT NULL REFERENCES islas(id),
  operacion_catalogo_id    UUID          NOT NULL REFERENCES operaciones_catalogo(id),
  tecnico_id               UUID          NOT NULL REFERENCES tecnicos(id),
  estado                   estado_tarea  NOT NULL DEFAULT 'PENDIENTE',
  tiempo_estandar_original NUMERIC(10,2) NOT NULL,
  tiempo_estandar_ajustado NUMERIC(10,2) NOT NULL,
  motivo_ajuste            TEXT,
  tarifa_hora_aplicada     NUMERIC(10,2) NOT NULL,
  costo_estimado           NUMERIC(10,2) NOT NULL,
  tiempo_real_horas        NUMERIC(10,2),
  costo_interno            NUMERIC(10,2),
  eficiencia               NUMERIC(10,2),
  fecha_inicio_planificada TIMESTAMPTZ   NOT NULL,
  fecha_fin_planificada    TIMESTAMPTZ   NOT NULL,
  fecha_inicio_real        TIMESTAMPTZ,
  fecha_fin_real           TIMESTAMPTZ,
  observaciones            TEXT,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE orden_calidad_revision (
  id                      UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id                UUID              NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  usuario_id              UUID              NOT NULL REFERENCES usuarios(id),
  resultado               resultado_calidad NOT NULL,
  observaciones_generales TEXT,
  fecha_revision          TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE TABLE orden_entrega (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id                   UUID        NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  usuario_id                 UUID        NOT NULL REFERENCES usuarios(id),
  fecha_notificacion_cliente TIMESTAMPTZ,
  fecha_entrega_real         TIMESTAMPTZ,
  observaciones              TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── NIVEL 6: dependen de orden_isla_tareas ──────────────────────

CREATE TABLE orden_isla_tarea_pausas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id     UUID        NOT NULL REFERENCES orden_isla_tareas(id) ON DELETE CASCADE,
  inicio_pausa TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin_pausa    TIMESTAMPTZ,
  motivo       TEXT
);

CREATE TABLE orden_isla_tarea_eventos (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id          UUID         NOT NULL REFERENCES orden_isla_tareas(id) ON DELETE CASCADE,
  usuario_id        UUID         NOT NULL REFERENCES usuarios(id),
  accion            accion_tarea NOT NULL,
  estado_resultante estado_tarea NOT NULL,
  fecha_hora        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  observacion       TEXT
);

CREATE TABLE orden_isla_tarea_reasignaciones (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id               UUID          NOT NULL REFERENCES orden_isla_tareas(id) ON DELETE CASCADE,
  tecnico_anterior_id    UUID          NOT NULL REFERENCES tecnicos(id),
  tecnico_nuevo_id       UUID          NOT NULL REFERENCES tecnicos(id),
  usuario_responsable_id UUID          NOT NULL REFERENCES usuarios(id),
  fecha_reasignacion     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  motivo                 TEXT,
  tarifa_anterior        NUMERIC(10,2) NOT NULL,
  tarifa_nueva           NUMERIC(10,2) NOT NULL
);

CREATE TABLE orden_calidad_revision_puntos (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID            NOT NULL REFERENCES orden_calidad_revision(id) ON DELETE CASCADE,
  punto_id    UUID            NOT NULL REFERENCES checklist_calidad_puntos(id),
  resultado   resultado_punto NOT NULL,
  observacion TEXT
);

-- ── TABLAS TRANSVERSALES ────────────────────────────────────────

CREATE TABLE adjuntos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID        NOT NULL REFERENCES usuarios(id),
  tabla_referencia TEXT        NOT NULL,
  referencia_id    UUID        NOT NULL,
  url              TEXT        NOT NULL,
  descripcion      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notificaciones (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID        REFERENCES usuarios(id),
  orden_id   UUID        REFERENCES ordenes(id) ON DELETE CASCADE,
  tipo       TEXT        NOT NULL,
  mensaje    TEXT        NOT NULL,
  leida      BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── TRIGGER updated_at ──────────────────────────────────────────

CREATE TRIGGER trg_gestion_aseguradora_updated_at
  BEFORE UPDATE ON orden_gestion_aseguradora
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── ÍNDICES ──────────────────────────────────────────────────────

CREATE INDEX idx_ordenes_sucursal   ON ordenes(sucursal_id);
CREATE INDEX idx_ordenes_estado     ON ordenes(estado);
CREATE INDEX idx_ordenes_numero     ON ordenes(numero_orden);
CREATE INDEX idx_ordenes_vehiculo   ON ordenes(vehiculo_id);
CREATE INDEX idx_ordenes_cliente    ON ordenes(cliente_id);

CREATE INDEX idx_tareas_orden       ON orden_isla_tareas(orden_id);
CREATE INDEX idx_tareas_isla        ON orden_isla_tareas(isla_id);
CREATE INDEX idx_tareas_tecnico     ON orden_isla_tareas(tecnico_id);
CREATE INDEX idx_tareas_estado      ON orden_isla_tareas(estado);

CREATE INDEX idx_hist_estados_orden ON orden_estados_historial(orden_id);
CREATE INDEX idx_hist_eventos_orden ON orden_eventos_historial(orden_id);

CREATE INDEX idx_vehiculos_placa    ON vehiculos(placa);
CREATE INDEX idx_clientes_cedula    ON clientes(cedula_ruc);
CREATE INDEX idx_usuarios_username  ON usuarios(username);

CREATE INDEX idx_tarifas_sucursal   ON tarifas_hora_hombre(sucursal_id);
CREATE INDEX idx_tarifas_isla       ON tarifas_hora_hombre(isla_id);

CREATE INDEX idx_notif_usuario      ON notificaciones(usuario_id);
CREATE INDEX idx_notif_no_leidas    ON notificaciones(leida) WHERE leida = false;

-- ── ROW LEVEL SECURITY (deshabilitado para auth por tabla propia) ─

ALTER TABLE companias                       DISABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales                      DISABLE ROW LEVEL SECURITY;
ALTER TABLE islas                           DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles                           DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                        DISABLE ROW LEVEL SECURITY;
ALTER TABLE tecnicos                        DISABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas_hora_hombre             DISABLE ROW LEVEL SECURITY;
ALTER TABLE operaciones_catalogo            DISABLE ROW LEVEL SECURITY;
ALTER TABLE aseguradoras                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE planes_aseguradora              DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes                        DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos                       DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes                         DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_estados_historial         DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_eventos_historial         DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_piezas_danos              DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_gestion_aseguradora       DISABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos                       DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_repuestos                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_isla_tareas               DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_isla_tarea_pausas         DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_isla_tarea_eventos        DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_isla_tarea_reasignaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_calidad_puntos        DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_calidad_revision          DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_calidad_revision_puntos   DISABLE ROW LEVEL SECURITY;
ALTER TABLE orden_entrega                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE adjuntos                        DISABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones                  DISABLE ROW LEVEL SECURITY;

-- ── DATOS INICIALES ──────────────────────────────────────────────

-- Extensión para bcrypt (disponible por defecto en Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Compañía (ajustar RUC real)
INSERT INTO companias (id, nombre, ruc, ciudad, activo)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'PITS', 'XXXXXXXXXX', 'Quito', true
);

-- 2. Roles
INSERT INTO roles (nombre, descripcion) VALUES
  ('ADMINISTRADOR', 'Acceso total al sistema'),
  ('JEFE_TALLER',   'Supervisión de operaciones'),
  ('OPERARIO',      'Ejecución de tareas en islas');

-- 3. Sucursal principal
INSERT INTO sucursales (id, compania_id, nombre, ciudad, activo)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Taller Principal', 'Quito', true
);

-- 4. Islas de trabajo
INSERT INTO islas (id, sucursal_id, nombre, descripcion, activo) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Enderezada', 'Área de enderezado de carrocería', true),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Pintura',    'Área de pintura y acabados',       true),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Mecánica',   'Área de mecánica general',          true),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Calidad',    'Control de calidad y entrega',      true);

-- 5. Usuario administrador
INSERT INTO usuarios (sucursal_id, rol_id, nombre, username, password_hash, email, activo)
SELECT
  'b0000000-0000-0000-0000-000000000001',
  r.id,
  'Edison Sosa',
  'edison.sosa@onewayec.com',
  crypt('usuario2005', gen_salt('bf')),
  'edison.sosa@onewayec.com',
  true
FROM roles r
WHERE r.nombre = 'ADMINISTRADOR';

-- ── AJUSTES PARA FLEXIBILIDAD DE UI ─────────────────────────────
-- Permite guardar tareas con técnico y operación como texto libre
-- (sin necesidad de que existan en los catálogos de tecnicos/operaciones)

ALTER TABLE orden_isla_tareas
  ALTER COLUMN operacion_catalogo_id DROP NOT NULL,
  ALTER COLUMN tecnico_id            DROP NOT NULL,
  ADD COLUMN   operacion_nombre      TEXT,
  ADD COLUMN   tecnico_nombre        TEXT;

-- ── RPC: validate_credentials ────────────────────────────────────
-- Compara la contraseña con el hash bcrypt almacenado y retorna
-- los datos de sesión si las credenciales son correctas.

CREATE OR REPLACE FUNCTION validate_credentials(p_username TEXT, p_password TEXT)
RETURNS TABLE(
  id              UUID,
  nombre          TEXT,
  username        TEXT,
  rol             TEXT,
  sucursal_id     UUID,
  sucursal_nombre TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.nombre,
    u.username,
    r.nombre       AS rol,
    u.sucursal_id,
    s.nombre       AS sucursal_nombre
  FROM  usuarios   u
  JOIN  roles      r ON r.id = u.rol_id
  JOIN  sucursales s ON s.id = u.sucursal_id
  WHERE u.username     = p_username
    AND u.activo        = true
    AND u.password_hash = crypt(p_password, u.password_hash);
END;
$$;

-- ── RPC: upsert_usuario ─────────────────────────────────────────
-- Crea o actualiza usuarios desde la pantalla de configuración.
-- La contraseña nunca se guarda en texto plano: se convierte a bcrypt.
-- En edición, si p_password viene null o vacío, se conserva el hash actual.

CREATE OR REPLACE FUNCTION upsert_usuario(
  p_id          UUID,
  p_sucursal_id UUID,
  p_rol_id      UUID,
  p_nombre      TEXT,
  p_username    TEXT,
  p_password    TEXT DEFAULT NULL,
  p_email       TEXT DEFAULT NULL,
  p_activo      BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_id IS NULL THEN
    IF NULLIF(p_password, '') IS NULL THEN
      RAISE EXCEPTION 'La contrasena es obligatoria para crear usuarios';
    END IF;

    INSERT INTO usuarios (
      sucursal_id,
      rol_id,
      nombre,
      username,
      password_hash,
      email,
      activo
    )
    VALUES (
      p_sucursal_id,
      p_rol_id,
      p_nombre,
      p_username,
      crypt(p_password, gen_salt('bf')),
      p_email,
      COALESCE(p_activo, true)
    )
    RETURNING id INTO v_id;

    RETURN v_id;
  END IF;

  UPDATE usuarios
  SET
    sucursal_id = p_sucursal_id,
    rol_id = p_rol_id,
    nombre = p_nombre,
    username = p_username,
    password_hash = CASE
      WHEN NULLIF(p_password, '') IS NULL THEN password_hash
      ELSE crypt(p_password, gen_salt('bf'))
    END,
    email = p_email,
    activo = COALESCE(p_activo, true)
  WHERE id = p_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  RETURN v_id;
END;
$$;
