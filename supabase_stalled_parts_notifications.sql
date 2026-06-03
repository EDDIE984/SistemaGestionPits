-- ============================================================
-- Alertas de repuestos atascados
-- Genera notificaciones a los 7, 10 y 15 días sin avanzar en
-- estados PENDIENTE / SOLICITADO / COMPRADO / EN_TRANSITO.
-- Fecha de referencia: fecha_estimada_llegada si está seteada,
-- sino created_at (cuándo se registró el repuesto).
-- ============================================================

-- 1. Índice UNIQUE para deduplicación
CREATE UNIQUE INDEX IF NOT EXISTS idx_notificaciones_repuesto_pendiente
  ON notificaciones(tipo, referencia_tabla, referencia_id, referencia_marcador)
  WHERE tipo = 'REPUESTO_PENDIENTE';

-- 2. Función que genera las alertas
CREATE OR REPLACE FUNCTION public.crear_notificaciones_repuesto_pendiente()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_insertadas INTEGER := 0;
BEGIN
  WITH repuestos AS (
    SELECT
      r.id                                                                     AS repuesto_id,
      r.orden_id,
      o.numero_orden,
      v.placa,
      COALESCE(r.descripcion_libre, 'Repuesto sin descripcion')                AS descripcion,
      r.estado::TEXT                                                            AS estado_repuesto,
      COALESCE(r.fecha_estimada_llegada::TIMESTAMPTZ, r.created_at)            AS fecha_ref,
      EXTRACT(DAY FROM (now() - COALESCE(r.fecha_estimada_llegada::TIMESTAMPTZ, r.created_at)))::INT AS dias
    FROM orden_repuestos r
    JOIN ordenes   o ON o.id = r.orden_id
    LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
    WHERE r.estado IN ('PENDIENTE', 'SOLICITADO', 'COMPRADO', 'EN_TRANSITO')
  ),
  umbrales AS (
    SELECT rp.*, u.marcador, u.umbral_dias
    FROM repuestos rp
    CROSS JOIN (
      VALUES
        ('ALERTA_7D',  7),
        ('ALERTA_10D', 10),
        ('ALERTA_15D', 15)
    ) AS u(marcador, umbral_dias)
    WHERE rp.dias >= u.umbral_dias
  ),
  ins AS (
    INSERT INTO notificaciones (
      usuario_id,
      orden_id,
      tipo,
      mensaje,
      referencia_tabla,
      referencia_id,
      referencia_marcador,
      metadata
    )
    SELECT
      NULL,
      u.orden_id,
      'REPUESTO_PENDIENTE',
      format(
        'OT %s%s: repuesto "%s" lleva %s dias sin recibirse. Estado: %s. Fecha referencia: %s.',
        u.numero_orden,
        CASE WHEN u.placa IS NULL OR u.placa = '' THEN '' ELSE ' (' || u.placa || ')' END,
        u.descripcion,
        u.dias,
        u.estado_repuesto,
        to_char(u.fecha_ref AT TIME ZONE 'America/Guayaquil', 'DD/MM/YYYY')
      ),
      'orden_repuestos',
      u.repuesto_id,
      u.marcador,
      jsonb_build_object(
        'estado_repuesto',     u.estado_repuesto,
        'descripcion',         u.descripcion,
        'dias_espera',         u.dias,
        'umbral_dias',         u.umbral_dias,
        'referencia_marcador', u.marcador
      )
    FROM umbrales u
    WHERE NOT EXISTS (
      SELECT 1 FROM notificaciones n
      WHERE n.tipo                = 'REPUESTO_PENDIENTE'
        AND n.referencia_tabla    = 'orden_repuestos'
        AND n.referencia_id       = u.repuesto_id
        AND n.referencia_marcador = u.marcador
    )
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_insertadas FROM ins;

  RETURN v_insertadas;
END;
$$;

-- 3. Ejecución inmediata para cargar alertas ya existentes
SELECT public.crear_notificaciones_repuesto_pendiente() AS notificaciones_insertadas;

-- 4. Programar ejecución diaria a las 08:00 hora Ecuador (UTC-5 = 13:00 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'crear-notificaciones-repuesto-pendiente'
  ) THEN
    PERFORM cron.unschedule('crear-notificaciones-repuesto-pendiente');
  END IF;
END;
$$;

SELECT cron.schedule(
  'crear-notificaciones-repuesto-pendiente',
  '0 13 * * *',
  $$SELECT public.crear_notificaciones_repuesto_pendiente();$$
);
