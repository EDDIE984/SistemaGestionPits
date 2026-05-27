-- Opcional: ejecutar una sola vez si existen ordenes antiguas en INGRESADA.
-- El ingreso ya queda representado por fecha_ingreso; la operacion inicia en proforma.

UPDATE ordenes
SET estado = 'LEVANTAMIENTO_PROFORMA'
WHERE estado = 'INGRESADA';
