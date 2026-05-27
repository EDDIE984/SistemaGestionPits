-- Ejecutar en Supabase SQL Editor para corregir el guardado de usuarios.
-- Crea la RPC usada por la pantalla de Configuracion > Usuarios.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION upsert_usuario(
  p_id           UUID,
  p_sucursal_id  UUID,
  p_rol_id       UUID,
  p_nombre       TEXT,
  p_username     TEXT,
  p_password     TEXT DEFAULT NULL,
  p_email        TEXT DEFAULT NULL,
  p_activo       BOOLEAN DEFAULT true
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

-- Opcional: convertir usuarios guardados previamente en texto plano.
-- Solo afecta valores que no parecen hashes bcrypt.
UPDATE usuarios
SET password_hash = crypt(password_hash, gen_salt('bf'))
WHERE password_hash IS NOT NULL
  AND password_hash !~ '^\$2[aby]\$';
