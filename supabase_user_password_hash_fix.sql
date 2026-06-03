-- Ejecutar en Supabase SQL Editor para corregir el guardado de usuarios.
-- Crea la RPC usada por la pantalla de Configuracion > Usuarios.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS isla_id UUID REFERENCES islas(id);

ALTER TABLE orden_isla_tarea_eventos
  ADD COLUMN IF NOT EXISTS tecnico_id UUID REFERENCES tecnicos(id);

CREATE INDEX IF NOT EXISTS idx_eventos_tecnico
  ON orden_isla_tarea_eventos(tecnico_id);

DROP FUNCTION IF EXISTS validate_credentials(TEXT, TEXT);

CREATE OR REPLACE FUNCTION validate_credentials(p_username TEXT, p_password TEXT)
RETURNS TABLE(
  id              UUID,
  nombre          TEXT,
  username        TEXT,
  rol             TEXT,
  sucursal_id     UUID,
  sucursal_nombre TEXT,
  isla_id         UUID,
  isla_nombre     TEXT
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
    s.nombre       AS sucursal_nombre,
    u.isla_id,
    i.nombre       AS isla_nombre
  FROM  usuarios   u
  JOIN  roles      r ON r.id = u.rol_id
  JOIN  sucursales s ON s.id = u.sucursal_id
  LEFT JOIN islas  i ON i.id = u.isla_id
  WHERE u.username     = p_username
    AND u.activo        = true
    AND u.password_hash = crypt(p_password, u.password_hash);
END;
$$;

DROP FUNCTION IF EXISTS upsert_usuario(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS upsert_usuario(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION upsert_usuario(
  p_id           UUID,
  p_sucursal_id  UUID,
  p_rol_id       UUID,
  p_isla_id      UUID,
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
  v_rol_nombre TEXT;
BEGIN
  SELECT nombre INTO v_rol_nombre
  FROM roles
  WHERE id = p_rol_id;

  IF v_rol_nombre = 'OPERARIO' AND p_isla_id IS NULL THEN
    RAISE EXCEPTION 'La isla es obligatoria para usuarios OPERARIO';
  END IF;

  IF p_id IS NULL THEN
    IF NULLIF(p_password, '') IS NULL THEN
      RAISE EXCEPTION 'La contrasena es obligatoria para crear usuarios';
    END IF;

    INSERT INTO usuarios (
      sucursal_id,
      rol_id,
      isla_id,
      nombre,
      username,
      password_hash,
      email,
      activo
    )
    VALUES (
      p_sucursal_id,
      p_rol_id,
      p_isla_id,
      p_nombre,
      p_username,
      crypt(p_password, gen_salt('bf')),
      p_email,
      COALESCE(p_activo, true)
    )
    RETURNING id INTO v_id;

    IF v_rol_nombre = 'OPERARIO' THEN
      INSERT INTO tecnicos (
        usuario_id,
        sucursal_id,
        isla_principal_id,
        activo
      )
      VALUES (
        v_id,
        p_sucursal_id,
        p_isla_id,
        true
      );
    END IF;

    RETURN v_id;
  END IF;

  UPDATE usuarios
  SET
    sucursal_id = p_sucursal_id,
    rol_id = p_rol_id,
    isla_id = p_isla_id,
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

  IF v_rol_nombre = 'OPERARIO' THEN
    UPDATE tecnicos
    SET
      sucursal_id = p_sucursal_id,
      isla_principal_id = p_isla_id,
      activo = true
    WHERE usuario_id = v_id;

    IF NOT FOUND THEN
      INSERT INTO tecnicos (
        usuario_id,
        sucursal_id,
        isla_principal_id,
        activo
      )
      VALUES (
        v_id,
        p_sucursal_id,
        p_isla_id,
        true
      );
    END IF;
  ELSE
    UPDATE tecnicos
    SET activo = false
    WHERE usuario_id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Sincroniza operarios existentes con el catalogo de tecnicos usado en planificacion.
UPDATE tecnicos t
SET
  sucursal_id = u.sucursal_id,
  isla_principal_id = u.isla_id,
  activo = true
FROM usuarios u
JOIN roles r ON r.id = u.rol_id
WHERE t.usuario_id = u.id
  AND r.nombre = 'OPERARIO'
  AND u.isla_id IS NOT NULL;

INSERT INTO tecnicos (
  usuario_id,
  sucursal_id,
  isla_principal_id,
  activo
)
SELECT
  u.id,
  u.sucursal_id,
  u.isla_id,
  true
FROM usuarios u
JOIN roles r ON r.id = u.rol_id
WHERE r.nombre = 'OPERARIO'
  AND u.isla_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM tecnicos t
    WHERE t.usuario_id = u.id
  );

UPDATE orden_isla_tarea_eventos e
SET tecnico_id = t.tecnico_id
FROM orden_isla_tareas t
WHERE e.tarea_id = t.id
  AND e.tecnico_id IS NULL
  AND t.tecnico_id IS NOT NULL;

-- Opcional: convertir usuarios guardados previamente en texto plano.
-- Solo afecta valores que no parecen hashes bcrypt.
UPDATE usuarios
SET password_hash = crypt(password_hash, gen_salt('bf'))
WHERE password_hash IS NOT NULL
  AND password_hash !~ '^\$2[aby]\$';
