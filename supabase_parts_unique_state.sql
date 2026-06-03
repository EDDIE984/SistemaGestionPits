-- Evita duplicar registros de repuestos con el mismo estado dentro de una OT.
-- Ejecutar una vez en el SQL Editor de Supabase.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM orden_repuestos
    GROUP BY orden_id, estado
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existen estados de repuesto duplicados por OT. Revisa esos registros antes de crear el índice único.';
  END IF;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_orden_repuestos_orden_estado
    ON orden_repuestos (orden_id, estado);
END $$;
