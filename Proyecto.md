necesito desarrollar un sistema  para gestionar las ordenes de ingresos  y la gestion del mismo dentro del taller con el fin de evaluar la gestion y medir los tiempos de demora en todo el proceso desde la recepcion a la entrega. 

el sistema debe controlar todas las sucursales que tiene la empresa por lo que deberiamos tener una tabla con los datos principales de la compañìa y otra con los datos de cada taller

el formulario de ingreso debe tener los siguiente campos:

sucursal de ingreso
placa del vehiculo
modelo del vehiculo
chasis
marca
motor
aseguradora
plan_aseguradora
cedula de identidad o ruc
nombre completo
direccion telefono
correo
ciudad

por lo que deberiamos tener una tabla de aseguradoras, otra para planes, otra de clientes , otra para guardar las ordenes

al momento de crear las ordenes vamos a utilizar los siguientes webServices por lo que debes crear un archivo .env con las siguientes configuraciones del api :
cuando el usuario digita la cedula de identidad debes consultar el siguiente servicio

curl --location 'http://nessoftfact-001-site6.atempurl.com/api/ConsultasDatos/ConsultaCedulaV2?Cedula=1714639026&Apikey=xxxx'

de igual manera cuando digite la placa debe consultar el siguiente servicio
curl --location 'https://webservices.ec/api/placas/HBE7190' \
--header 'Authorization: Bearer xxxx' \
--header 'Cookie: server_name_session=xxxx'

una vez se guarde la informacion la orden se guarda con estado INICIO_REPARACION con el fin de que el asesor pueda realizar las gestiones necesarios.

vamos a tener una pantalla donde el usuario debe gestionar 
los estados de manera ordenada es decir que una vez realice el ingreso el siguiente proceso deberia realizar el LEVANTAMIENTO_PROFORMA para esto deberia catogorizar el daño entre 
K1- SE PUEDE REMOVER LIMPIANDO
K2- SE PUEDE REMOVER PULIENDO
K3-DAÑO PEQUEÑO QUE REQUIERE UN PROFESIONAL
K4-UN PROFESIONAL TIENE QUE REPARAR
K5- PUEDA QUE LA PARTE REQUIERA REEMPLAZO
 eso por cada pieza que va a proformar


luego de esto va la GESTIO_ASEGURADORA en caso aplique luego COMPRA_REPUESTO y una vez tenga los repuesto INICIO_REPARACION una vez este en este estaod el usuario debe poder planificar los dias, horas que el automovil debera permanecer en cada isla 
las islas que estan definidas son:
ENDEREZADA
PINTURA
MECANICA
CALIDAD

Catalogo de operaciones y tarifas hora hombre

Para poder planificar el trabajo de cada orden se definio un catalogo base de operaciones por isla. Este catalogo no representa trabajos ya realizados, sino operaciones estandar que el asesor puede seleccionar al momento de armar la planificacion de una orden.

El criterio para crear el catalogo de operaciones fue:

- Cada operacion debe pertenecer a una isla especifica: Enderezada, Pintura, Mecanica o Calidad.
- Cada operacion debe tener un tiempo estandar en horas. Este tiempo funciona como referencia flat rate, independientemente del tiempo real que luego tarde el tecnico.
- El tiempo estandar permite calcular el costo estimado de la tarea antes de ejecutarla.
- El codigo de referencia permite relacionar la operacion con codigos internos o referencias tipo Audatex, si luego el taller desea homologarlo.
- La descripcion permite aclarar el alcance de la operacion para evitar diferencias de criterio entre asesores y tecnicos.
- El campo activo permite mantener el historico sin borrar operaciones que ya fueron usadas en ordenes anteriores.

La razon de usar tiempos estandar es que el sistema necesita comparar lo planificado contra lo ejecutado. Por ejemplo, si una operacion de pintura tiene 3.5 horas estandar y el tecnico la termina en 3 horas, se puede medir eficiencia. Si tarda 5 horas, se puede identificar desviacion operativa.

Formula de costo estimado:

tiempo_estandar_horas x tarifa_hora_hombre = costo_estimado

Formula de eficiencia:

(tiempo_estandar_horas / tiempo_real_horas) x 100 = eficiencia

Tambien se definio una tabla de tarifas hora hombre. Esta tarifa representa el valor por hora que el taller usara para costear o facturar las operaciones planificadas. La tarifa puede ser general por sucursal, especifica por isla o especifica por tecnico.

El criterio para las tarifas iniciales fue:

- Se usa una tarifa general de taller como valor base o fallback.
- Se asignan tarifas por isla porque no todas las areas tienen el mismo costo operativo, herramientas, insumos ni nivel tecnico.
- Pintura y Mecanica tienen valores mas altos por el uso de equipos, especializacion, diagnostico, preparacion, cabina, materiales asociados y mayor carga tecnica.
- Enderezada tiene un valor alto, pero ligeramente menor que pintura y mecanica, por ser mano de obra especializada de carroceria.
- Calidad tiene una tarifa menor porque su funcion principal es inspeccion, validacion, prueba y limpieza pre-entrega.
- La tarifa por tecnico queda disponible para casos especiales, por ejemplo tecnicos senior o especialistas.

Tarifas recomendadas para carga inicial en Ecuador:

- Tarifa general taller: 22.00 USD/hora
- Enderezada: 24.00 USD/hora
- Pintura: 26.00 USD/hora
- Mecanica: 27.00 USD/hora
- Calidad: 18.00 USD/hora
- Tecnico senior o especialista: entre 30.00 y 35.00 USD/hora, si aplica

Estas tarifas no son el salario del trabajador. Son una tarifa operativa/comercial de taller que debe cubrir mano de obra, cargas laborales, tiempos improductivos, supervision, administracion, infraestructura, equipos, herramientas, utilidad y riesgo operativo. Como base de criterio para Ecuador se tomo en cuenta que el salario basico unificado 2026 es de 482 USD y que los salarios sectoriales automotrices estan cercanos a ese piso laboral; por eso la tarifa hora hombre debe ser superior al costo salarial directo.

La tarifa aplicada a una tarea debe guardarse como snapshot en la orden. Esto permite que, si la tarifa cambia en el futuro, las ordenes antiguas mantengan el costo con el que fueron planificadas originalmente.

  en cada isla es necesario que pueda definir la fecha de inicio y la fecha fin del trabajo y en base a esto debe calcularse el precio de trabajo hombre para esta tarea

  con esto debo tener una pantalla para que cada isla pueda gestionar el inicio y finalizaciòn de las tareas asi tambien otra pantalla para que puedan visualizar en cards con colores :
  Verde esta a tiempo
  Amarillo se acerca a la hora de finalizacion
  ROJO atrasado
  AZUL Proximo VEHICULO

  asi podra tener como un panel de trabajo que pueda ser proyectado en una pantalla principal y logren visualizar cada estado de la isla logeada

  por otro lado necesito un dashboard tipo gant que me permita como jefe de taller el cronograma de trabajo de cada isla.

  Si hay algo mas que necesitas o que me hace falta para implementar este proyecto avisame

  admin / admin123
jefe / jefe123
operario / operario123
