-- ============================================================
-- Alertas de aprobación atascada
-- Genera notificaciones a los 7, 10 y 15 días sin avance en
-- estados ENVIADO / EN_REVISION / OBSERVADO de la aprobación.
-- Aplica tanto a órdenes de clientes particulares como de aseguradora.
-- ============================================================

-- 1. Índice UNIQUE para deduplicación (evita alertas duplicadas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notificaciones_aprobacion_atascada
  ON notificaciones(tipo, referencia_tabla, referencia_id, referencia_marcador)
  WHERE tipo = 'APROBACION_ATASCADA';

-- 2. Función que genera las alertas
CREATE OR REPLACE FUNCTION public.crear_notificaciones_aprobacion_atascada()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_insertadas INTEGER := 0;
BEGIN
  WITH gestiones AS (
    SELECT
      oga.id                                                               AS gestion_id,
      oga.orden_id,
      o.numero_orden,
      v.placa,
      COALESCE(oga.fecha_envio::TIMESTAMPTZ, oga.updated_at)               AS fecha_ref,
      oga.estado::TEXT                                                      AS estado_gestion,
      CASE WHEN o.aseguradora_id IS NOT NULL THEN 'ASEGURADORA' ELSE 'PARTICULAR' END AS tipo_cliente,
      EXTRACT(DAY FROM (now() - COALESCE(oga.fecha_envio::TIMESTAMPTZ, oga.updated_at)))::INT AS dias
    FROM orden_gestion_aseguradora oga
    JOIN ordenes   o ON o.id = oga.orden_id
    LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
    WHERE oga.estado IN ('ENVIADO', 'EN_REVISION', 'OBSERVADO')
  ),
  umbrales AS (
    SELECT g.*, u.marcador, u.umbral_dias
    FROM gestiones g
    CROSS JOIN (
      VALUES
        ('ALERTA_7D',  7),
        ('ALERTA_10D', 10),
        ('ALERTA_15D', 15)
    ) AS u(marcador, umbral_dias)
    WHERE g.dias >= u.umbral_dias
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
      'APROBACION_ATASCADA',
      format(
        'OT %s%s lleva %s dias sin avanzar desde estado "%s". Fecha referencia: %s.',
        u.numero_orden,
        CASE WHEN u.placa IS NULL OR u.placa = '' THEN '' ELSE ' (' || u.placa || ')' END,
        u.dias,
        u.estado_gestion,
        to_char(u.fecha_ref AT TIME ZONE 'America/Guayaquil', 'DD/MM/YYYY')
      ),
      'orden_gestion_aseguradora',
      u.gestion_id,
      u.marcador,
      jsonb_build_object(
        'estado_gestion',      u.estado_gestion,
        'tipo_cliente',        u.tipo_cliente,
        'dias_espera',         u.dias,
        'umbral_dias',         u.umbral_dias,
        'referencia_marcador', u.marcador
      )
    FROM umbrales u
    WHERE NOT EXISTS (
      SELECT 1 FROM notificaciones n
      WHERE n.tipo                = 'APROBACION_ATASCADA'
        AND n.referencia_tabla    = 'orden_gestion_aseguradora'
        AND n.referencia_id       = u.gestion_id
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
SELECT public.crear_notificaciones_aprobacion_atascada() AS notificaciones_insertadas;

-- 4. Programar ejecución diaria a las 08:00 hora Ecuador (UTC-5 = 13:00 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'crear-notificaciones-aprobacion-atascada'
  ) THEN
    PERFORM cron.unschedule('crear-notificaciones-aprobacion-atascada');
  END IF;
END;
$$;

SELECT cron.schedule(
  'crear-notificaciones-aprobacion-atascada',
  '0 13 * * *',
  $$SELECT public.crear_notificaciones_aprobacion_atascada();$$
);
