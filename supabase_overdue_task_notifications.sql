-- Notificaciones automaticas para tareas de isla atrasadas.
-- Ejecutar en Supabase SQL Editor.
--
-- Criterio:
-- Una tarea esta atrasada cuando:
--   1. fecha_fin_planificada < now() considerando fecha y hora exacta
--   2. estado esta en PENDIENTE, EN_PROCESO o PAUSADA
--   3. se genera una notificacion por cada hora de atraso
--
-- La notificacion se crea como global (usuario_id = null) para que
-- administradores y jefes de taller la vean en la bandeja.

CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  orden_id UUID,
  tipo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notificaciones
  ADD COLUMN IF NOT EXISTS referencia_tabla TEXT,
  ADD COLUMN IF NOT EXISTS referencia_id UUID,
  ADD COLUMN IF NOT EXISTS referencia_marcador TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notif_usuario
  ON notificaciones(usuario_id);

CREATE INDEX IF NOT EXISTS idx_notif_no_leidas
  ON notificaciones(leida)
  WHERE leida = false;

CREATE INDEX IF NOT EXISTS idx_notificaciones_referencia
  ON notificaciones(referencia_tabla, referencia_id);

DROP INDEX IF EXISTS idx_notificaciones_tarea_atrasada_unread;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notificaciones_tarea_atrasada_hora
  ON notificaciones(tipo, referencia_tabla, referencia_id, referencia_marcador)
  WHERE tipo = 'TAREA_ATRASADA';

CREATE OR REPLACE FUNCTION public.crear_notificaciones_tareas_atrasadas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_insertadas INTEGER := 0;
BEGIN
  WITH tareas_atrasadas AS (
    SELECT
      t.id AS tarea_id,
      t.orden_id,
      o.numero_orden,
      v.placa,
      i.nombre AS isla,
      COALESCE(t.operacion_nombre, 'Operacion sin nombre') AS operacion,
      COALESCE(t.tecnico_nombre, 'Tecnico sin asignar') AS tecnico,
      t.estado::TEXT AS estado,
      t.fecha_fin_planificada,
      GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (now() - t.fecha_fin_planificada)) / 3600.0)::INT
      ) AS horas_atraso
    FROM orden_isla_tareas t
    JOIN ordenes o ON o.id = t.orden_id
    LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
    JOIN islas i ON i.id = t.isla_id
    WHERE t.estado IN ('PENDIENTE', 'EN_PROCESO', 'PAUSADA')
      AND t.fecha_fin_planificada < now()
  ),
  insertadas AS (
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
      tarea.orden_id,
      'TAREA_ATRASADA',
      format(
        'Tarea atrasada en OT %s%s: %s / %s. Debia finalizar el %s y sigue en estado %s. Atraso: %s hora(s).',
        tarea.numero_orden,
        CASE
          WHEN tarea.placa IS NULL OR tarea.placa = '' THEN ''
          ELSE ' (' || tarea.placa || ')'
        END,
        tarea.isla,
        tarea.operacion,
        to_char(tarea.fecha_fin_planificada AT TIME ZONE 'America/Guayaquil', 'DD/MM/YYYY HH24:MI'),
        tarea.estado,
        tarea.horas_atraso
      ),
      'orden_isla_tareas',
      tarea.tarea_id,
      'hora_atraso_' || tarea.horas_atraso,
      jsonb_build_object(
        'tarea_id', tarea.tarea_id,
        'isla', tarea.isla,
        'operacion', tarea.operacion,
        'tecnico', tarea.tecnico,
        'estado', tarea.estado,
        'fecha_fin_planificada', tarea.fecha_fin_planificada,
        'horas_atraso', tarea.horas_atraso,
        'referencia_marcador', 'hora_atraso_' || tarea.horas_atraso
      )
    FROM tareas_atrasadas tarea
    WHERE NOT EXISTS (
      SELECT 1
      FROM notificaciones n
      WHERE n.tipo = 'TAREA_ATRASADA'
        AND n.referencia_tabla = 'orden_isla_tareas'
        AND n.referencia_id = tarea.tarea_id
        AND n.referencia_marcador = 'hora_atraso_' || tarea.horas_atraso
    )
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_insertadas FROM insertadas;

  RETURN v_insertadas;
END;
$$;

-- Ejecucion inmediata para crear alertas de tareas que ya estan atrasadas.
SELECT public.crear_notificaciones_tareas_atrasadas() AS notificaciones_insertadas;

-- Programacion automatica en Supabase con pg_cron.
-- Si pg_cron no esta habilitado, activar la extension en Database > Extensions
-- o ejecutar esta linea desde un usuario con permisos suficientes.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'crear-notificaciones-tareas-atrasadas'
  ) THEN
    PERFORM cron.unschedule('crear-notificaciones-tareas-atrasadas');
  END IF;
END;
$$;

SELECT cron.schedule(
  'crear-notificaciones-tareas-atrasadas',
  '*/15 * * * *',
  $$SELECT public.crear_notificaciones_tareas_atrasadas();$$
);
