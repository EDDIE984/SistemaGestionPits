-- Bucket y politicas para fotos de ordenes.
-- Ejecutar una vez en el SQL Editor de Supabase.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'orden-fotos',
  'orden-fotos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'orden_fotos_select'
  ) THEN
    CREATE POLICY orden_fotos_select
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'orden-fotos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'orden_fotos_insert'
  ) THEN
    CREATE POLICY orden_fotos_insert
      ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'orden-fotos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'orden_fotos_delete'
  ) THEN
    CREATE POLICY orden_fotos_delete
      ON storage.objects
      FOR DELETE
      USING (bucket_id = 'orden-fotos');
  END IF;
END $$;
