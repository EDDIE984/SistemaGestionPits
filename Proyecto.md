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
