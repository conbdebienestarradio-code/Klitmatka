# Manual de usuario de Klimatka

**Edición inicial · Alcance: funciones disponibles en la aplicación actual**

## Índice

- [¿Qué es Klimatka?](#qué-es-klimatka)
- [1. Propósito y alcance](#1-propósito-y-alcance)
- [Acceso a la plataforma](#acceso-a-la-plataforma)
- [2. Navegación](#2-navegación)
- [3. Consultar el Resumen](#3-consultar-el-resumen)
- [4. Registrar una actividad](#4-registrar-una-actividad)
- [5. Consultar, corregir o eliminar registros](#5-consultar-corregir-o-eliminar-registros)
- [6. Interpretar Calidad](#6-interpretar-calidad)
- [7. Usar el Plan de acción](#7-usar-el-plan-de-acción)
- [8. Exportar información](#8-exportar-información)
- [9. Biblioteca de factores y estados](#9-biblioteca-de-factores-y-estados)
- [10. Problemas frecuentes](#10-problemas-frecuentes)
- [11. Glosario breve](#11-glosario-breve)

## ¿Qué es Klimatka?

Klimatka es una plataforma de inteligencia ambiental empresarial. Su propósito es ayudar a transformar los datos de la operación en una línea base clara para orientar mejores decisiones, tal como expresa su lema: **«Una línea base clara para transformar cada dato en una mejor decisión»**.

La herramienta permite registrar actividades ambientales —como consumo de electricidad, combustibles, agua, materiales, residuos, refrigerantes, emisiones al aire y uso digital— y calcular resultados con los factores disponibles en su biblioteca. También facilita consultar y comparar períodos, revisar la calidad y trazabilidad de los datos, identificar oportunidades de mejora y exportar información para reportes.

Klimatka busca que los resultados sean comprensibles y rastreables: cada cálculo debe interpretarse junto con la evidencia de la actividad, el factor utilizado, su fuente, estado y las advertencias metodológicas disponibles. No sustituye la documentación de respaldo ni convierte automáticamente datos incompletos o factores pendientes en información oficialmente validada.

## 1. Propósito y alcance

Klimatka permite registrar actividad ambiental, calcular resultados con factores disponibles en la biblioteca interna y revisar su período, calidad y trazabilidad. El espacio de trabajo y sus registros están separados por empresa. Este manual describe las funciones disponibles actualmente.

## Acceso a la plataforma

### Crear un perfil personal

1. En la pantalla de acceso, selecciona **Crear mi perfil**.
2. Completa nombre, apellidos, cargo profesional, correo electrónico de acceso, contraseña y confirmación.
3. Selecciona **Crear mi perfil**. El perfil personal no requiere datos de empresa.

La contraseña debe tener al menos 12 caracteres. Una persona puede usar el mismo perfil para administrar o integrar varias empresas.

### Crear y cambiar empresas

1. Desde el panel, abre el selector del espacio de trabajo para administrar empresas.
2. Completa nombre de la empresa, RIF, correo empresarial y número total de empleados.
3. Selecciona **Crear espacio empresarial**. Quien crea la empresa obtiene el rol de administradora.
4. Elige cualquier empresa de la lista para cambiar el espacio activo.

Cada empresa tiene sus propios análisis, sedes, dotaciones y miembros. Los datos de actividad se aíslan por empresa y cada cálculo conserva la cuenta de la persona que lo registró. El nombre y el RIF no pueden repetirse; el correo de empresa se guarda como dato del perfil.

El total de empleados declarado se guarda en el perfil de la empresa. No cambia los totales ambientales ni se utiliza por sí solo para calcular impactos o intensidades. Para indicadores por empleado, registra la dotación correspondiente a cada sede y mes en el formulario de actividad. En la vista anual solo se calcula la intensidad cuando hay dotación registrada para los 12 meses; si falta información, se muestra la cobertura sin inventar un promedio. Actualmente Klimatka conserva esa dotación agregada por sede y mes; no mantiene fichas nominales individuales de empleados.

### Iniciar sesión e invitar usuarios

- En **Iniciar sesión**, usa el correo de acceso y la contraseña de tu perfil.
- Una administradora de empresa puede seleccionar **Invitar a un usuario** en el menú lateral, indicar su correo y crear un enlace. Debe compartirlo con la persona invitada; Klimatka no envía el correo automáticamente.
- El enlace vence a los 7 días y solo puede aceptarse con el correo invitado. La persona puede crear un perfil personal o, si ya tiene uno, iniciar sesión; luego quedará asociada a la empresa como miembro.
- **Cerrar sesión** aparece junto al nombre de la persona en el menú lateral.

Las administradoras de empresa pueden consultar **Calidad** y la biblioteca metodológica. Los miembros pueden registrar y revisar actividades de su empresa, pero no administrar la biblioteca. La intranet de administración de Klimatka está reservada a las cuentas que autorice la plataforma.

## 2. Navegación

El menú lateral contiene las vistas disponibles según el rol:

- **Resumen:** indicadores, comparación de períodos, línea base de GEI, módulos ambientales y exportaciones.
- **Registros:** actividades calculadas, búsqueda, corrección, eliminación y trazabilidad.
- **Calidad:** lectura del índice DQ y sus cinco dimensiones; disponible para administradores.
- **Plan de acción:** ruta de mejora de referencia y oportunidades que se generan cuando los registros aportan evidencia suficiente.
- **Intranet de Klimatka:** las cuentas autorizadas por la plataforma pueden abrir la administración de módulos de medición desde el enlace correspondiente del menú.

En pantallas pequeñas, el menú se abre con el botón de menú. El enlace **Conoce el método** lleva a **Calidad** para administradores. La bienvenida aparece durante cinco segundos después de validar la sesión.

## 3. Consultar el Resumen

1. Abre **Resumen**.
2. En **Período de consulta**, elige **Año de gestión** o **Mes específico**.
3. Selecciona el **Año**. En la vista mensual, selecciona también el **Mes**.
4. Usa **Comparar con** para elegir el año de comparación. En vista mensual, se compara el mismo mes entre los años seleccionados.

La tabla presenta los valores de ambos períodos, la **Diferencia absoluta** y la **Variación (%)**. Si el período no tiene datos, verás mensajes como «Sin datos» o «Sin registros»; no significa que el valor sea cero. Si el período de comparación tiene una base igual a cero, la variación porcentual aparece como no aplicable.

El resumen también muestra huella de GEI, electricidad, agua, residuos, uso de IA e internet, línea base de GEI e Índice DQ. Si hay dotación suficiente, **Indicadores por sede y empleado** presenta intensidades sin alterar los totales; la vista anual requiere cobertura para los doce meses. Los mosaicos de **Módulos ambientales** abren el formulario de captura con el módulo elegido. Si aparece **Transparencia metodológica**, revisa el aviso: algunos factores pueden estar pendientes de validación oficial y la herramienta conserva ese estado y las reglas de respaldo aplicadas.

## 4. Registrar una actividad

Puedes iniciar una captura con **Registrar actividad** en el Resumen, **Nueva actividad** en Registros, **Añadir actividad** en el Plan de acción o seleccionando un mosaico de módulo en el Resumen.

### Datos generales

1. En **Módulo**, elige una de las opciones: Electricidad, Combustible, Agua, Residuos, Materiales, Empaques, Refrigerantes, Emisiones al aire, Uso de IA o Internet.
2. En **Actividad / factor**, selecciona la opción disponible para ese módulo. Las opciones dependen de la biblioteca cargada.
3. Indica la **Cantidad** y la **Unidad**; las unidades disponibles cambian según el módulo y el factor.
4. Completa **Instalación**, **Período reportado**, **Geografía**, **Tipo de fuente** y **Referencia / documento de respaldo**. Las geografías disponibles actualmente son Venezuela (VE), Estados Unidos (CAMX) y Colombia (nacional). Los tipos de fuente incluyen factura comercial, medición directa, registro operativo y estimación.
5. Indica **Empleados de la sede** si tienes ese dato. Se guarda por sede y mes y se reutiliza al registrar otra actividad en ese mismo contexto.
6. Puntúa las cinco dimensiones de calidad con **0 = baja**, **1 = parcial** o **2 = completa**, usando la evidencia disponible. Debes completar las cinco para enviar el registro.
7. Selecciona **Validar y calcular**. Si se muestra un error, corrige los campos indicados y vuelve a intentarlo. Si decides salir, usa **Cancelar**.

### Campos particulares por módulo

- **Electricidad:** elige cálculo _Location-based_ con factor de red o _Market-based_ con factor contractual. Para _Market-based_ debes aportar el factor contractual y su fuente.
- **Combustible:** selecciona el combustible disponible; la unidad depende del combustible.
- **Agua:** puedes incluir agua descargada, reutilizada y un denominador productivo cuando tengas esos datos. El balance se presenta como diferencia o agua no contabilizada, no como pérdida atribuida.
- **Residuos:** indica si el residuo es peligroso o no peligroso y el factor/destino disponible. No dejes la clasificación sin seleccionar.
- **Materiales:** puedes registrar contenido reciclado, material recuperado, material elegible para circularidad y datos del producto o subproductos, si están respaldados. La recuperabilidad potencial y la recuperación real son datos distintos.
- **Empaques:** puedes aportar contenido reciclado y masa recuperada. No se infiere masa recuperada a partir de que el empaque sea reciclable.
- **Refrigerantes:** selecciona el refrigerante disponible y registra la cantidad en una unidad permitida.
- **Emisiones al aire:** selecciona CO₂, CH₄, N₂O, PM10, NOx, SOx o VOC. Para CH₄, indica el origen solicitado. Los contaminantes criterio no se convierten automáticamente a CO₂e.
- **Uso de IA:** indica el tipo de uso, proveedor y solicitudes. El modelo y los tokens de entrada/salida son opcionales.
- **Internet:** indica el tipo de conexión, proveedor y tráfico total. La subida y descarga son opcionales.

En los módulos digitales, registra **Energía informada**, **Agua informada** o **GEI informado** únicamente cuando el proveedor o una medición los documente. Solicitudes, tokens y GB describen actividad, no emisiones; el GEI reportado por la fuente se conserva separado y no se agrega a los alcances corporativos.

## 5. Consultar, corregir o eliminar registros

En **Registros**, puedes buscar por categoría, período o factor. Cada fila muestra la actividad, instalación, período, resultado, calidad DQ y estado del cálculo. Abre **Ver trazabilidad** para revisar el factor aplicado, estado y fuente del factor, fuente de actividad, puntuación/calidad, incertidumbre y advertencias metodológicas. Para registros digitales también se muestran los datos disponibles de proveedor, tokens, tráfico y recursos reportados.

- **Modificar:** abre el registro, corrige los datos y selecciona **Guardar corrección**. La actividad se valida y calcula de nuevo; la versión anterior queda disponible en **Historial de versiones**.
- **Eliminar:** confirma el mensaje del sistema. El registro deja de participar en los totales activos, pero se conserva en el historial de trazabilidad. La eliminación no equivale a restaurar el registro.

## 6. Interpretar Calidad

La vista **Calidad** resume el Índice DQ sobre 10 y muestra cinco dimensiones: **Fuente**, **Medición**, **Representatividad temporal**, **Representatividad operacional** y **Trazabilidad**. Cada dimensión se puntúa de 0 a 2 durante la captura; la vista ayuda a entender la evidencia disponible, no a cambiar la puntuación después de guardar. El nivel global se muestra como alta, media-alta, media, baja o insuficiente. Un puntaje alto indica mejor respaldo del dato, no mejor desempeño ambiental.

## 7. Usar el Plan de acción

El **Plan de acción** presenta una ruta de referencia organizada por horizontes (0–90 días, 3–6, 6–12 y 12–36 meses) y **Oportunidades priorizadas** derivadas de registros cuando se cumplen los umbrales documentados y hay datos suficientes.

Las oportunidades pueden incluir acción, prioridad, causa u oportunidad, plazo, inversión, disponibilidad y recuperación estimada de la inversión. Cuando falten datos para estimarla, la herramienta lo indica. Esta pantalla no asigna responsables, no marca tareas como completadas ni confirma ahorros ejecutados; las oportunidades son recomendaciones que requieren revisión y verificación por parte de la organización.

## 8. Exportar información

- **Exportar PDF:** descarga `informe-ejecutivo-ambiental.pdf` con el período que está seleccionado en el Resumen. Si ese período no tiene registros, la herramienta muestra un aviso y no genera el archivo.
- **Datos para Power BI:** descarga `datos-ambientales-power-bi.csv`, con columnas para período, instalación, módulo, actividad, uso digital, GEI, alcance, fuente, calidad y estado del factor. Actualmente esta exportación incluye los registros guardados en general, no solo el período que se ve en el Resumen. Si todavía no hay registros, no se genera el archivo.

## 9. Biblioteca de factores, módulos y estados

La biblioteca metodológica se usa para ofrecer factores y opciones en los formularios. Las personas usuarias de empresa no pueden crear ni aprobar factores. Para entender un cálculo, consulta **Ver trazabilidad** en el registro y revisa factor, estado, fuente y advertencias. Si un factor aparece pendiente o se aplicó una regla de respaldo, interpreta el resultado con esa salvedad; no presentes un factor pendiente como validado oficialmente.

La intranet de Klimatka permite a las cuentas autorizadas por la plataforma agregar módulos de medición con su unidad e indicador, y registrar un factor opcional, su fuente, estado metodológico y fecha de vigencia. Cada actualización crea una nueva versión y conserva el historial; las capturas existentes mantienen su trazabilidad. Los módulos adicionales admiten el cálculo genérico de cantidad por factor, no la programación de fórmulas arbitrarias. Un factor sin fuente documentada no debe tratarse como validado.

## 10. Problemas frecuentes

- **No aparecen resultados:** verifica el año, mes y período elegidos; la aplicación muestra un estado vacío cuando no hay registros en ese corte.
- **No se genera el PDF:** selecciona un período con registros.
- **No se genera el CSV:** aún no hay registros ambientales para exportar o no fue posible preparar la descarga.
- **No se puede guardar:** revisa el mensaje de validación, completa los campos requeridos y asigna las cinco puntuaciones de calidad.
- **Aparece un aviso metodológico o un factor pendiente:** revisa la trazabilidad y documenta la salvedad; no sustituyas el factor por uno no autorizado.
- **No puedes iniciar sesión:** verifica que estés usando el correo con el que registraste tu cuenta y que la contraseña tenga los datos correctos.
- **La invitación no se acepta:** comprueba que no hayan pasado siete días y que el correo del formulario coincida con el correo invitado. Pide a la persona administradora un nuevo enlace si expiró.
- **No aparece Calidad o la biblioteca:** estas funciones solo están disponibles para administradores de la empresa.
- **No aparecen intensidades por empleado:** verifica que exista dotación por sede y mes; para la vista anual se necesita cobertura de los doce meses.

## 11. Glosario breve

- **GEI:** gases de efecto invernadero. **CO₂e** expresa su impacto en una unidad equivalente de CO₂.
- **tCO₂e / kgCO₂e:** toneladas o kilogramos de CO₂ equivalente.
- **Índice DQ:** índice de calidad del dato, calculado a partir de cinco dimensiones de evidencia.
- **Factor de emisión:** valor usado junto con la actividad registrada para calcular un resultado ambiental.
- **Fallback / respaldo:** regla alternativa aplicada cuando corresponde; su uso y estado deben consultarse en la trazabilidad.

---

**Control de actualización:** este documento corresponde a la interfaz disponible al momento de su redacción. Se actualizará al recibir el PDF final del manual o cuando cambien los flujos de acceso, roles y permisos.
