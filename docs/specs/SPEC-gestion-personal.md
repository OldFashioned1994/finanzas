# Propuesta de SPEC · Finanzas → Gestión personal

Fecha: 05/11/2026. **Propuesta pendiente de aprobación; no autoriza programar ni publicar.**
Ubicación de la propuesta en el proyecto: `docs/specs/SPEC-gestion-personal.md`.

## 1. Qué se conserva y qué se propone

La fuente de alcance aprobado sigue siendo `docs/specs/SPEC.md` (28/10/2026), junto con `TAREAS.md` y `docs/decisiones.md`. Este documento los complementa: no reemplaza sus criterios ni marca etapas como terminadas. Se leyeron `AGENTS.md`, las instrucciones generales y del proyecto, las reglas de interfaz, pruebas, datos y API, `docs/gotchas.md`, el runbook y el contexto privado completo. Del contexto privado se trasladan necesidades y estructura, nunca sus valores personales.

**La etapa 1 está publicada pero abierta.** Antes de avanzar faltan la decisión del dominio personal, el alta de la llave, la importación y comparación de los datos anteriores, y configurar/probar el respaldo cifrado por mail. Decidir el dominio antes de crear la llave evita repetir su alta. No se cambia este orden por agregar módulos.

Orden propuesto: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10**. Se cierra y verifica una etapa antes de implementar la siguiente. Las ampliaciones de las etapas 2, 3 y 5 también requieren aprobar esta propuesta. Las etapas 7–10 son nuevas; no se anticipa su funcionalidad en las anteriores.

| Necesidad del § 6 privado | Dónde entra | Dependencia y límite |
|---|---|---|
| Ingresos por sueldo y facturas C | Etapa 7 nueva | Lee PDF mediante la base documental de la 3; concilia con las cuentas de la 4 y amplía el resultado de la 6. |
| Monotributo: facturado, margen, cuota y avisos | Cuota/vencimiento en la 5; panel específico en la 8 nueva | La 5 admite carga manual de obligaciones. La 8 usa las facturas confirmadas de la 7 y reutiliza esos vencimientos. |
| Servicios: cuenta, forma de pago e historia | Ficha básica vinculada a fijos en la 2; vencimientos en la 5; análisis en la 9 nueva | La 2 no interpreta facturas ni analiza aumentos. La 9 concilia el historial y agrega la lectura de facturas de servicio. |
| Vencimientos mensuales y renovaciones anuales | Ampliación de la etapa 5 existente | Incluye pagos manuales, cuota tributaria y renovación de seguro, con fechas verificadas y configurables. No hay agenda paralela. |
| Papeles: conservar y vincular cada PDF | Base documental en la 3; uso por 7 y 9; archivo unificado en la 10 nueva | Desde el primer PDF se guarda el original protegido. La búsqueda transversal llega al final; no hace falta esperar a la 10 para conservar papeles. |

### Límites que no se amplían

- Un solo usuario, PWA para teléfono y PC, mismo stack del proyecto y diseño vigente. No es un ERP ni una app compartida.
- Los pagos se hacen afuera. Registrar «pagué» o «cobré» documenta una operación; nunca la ejecuta.
- No se emiten facturas, no se consulta ARCA ni se automatiza ningún portal tributario. Se suben PDFs ya emitidos y se confirman sus datos.
- Solo Visa y Mastercard Galicia, caja de ahorro Galicia y Mercado Pago. Sin lectura de mails bancarios, descarga automática de extractos, Google Sheets ni valuación automática de inversiones.
- Dominio y casillas personales; nada bajo dominios de Sky Terra o Novex.
- No se lee ni cambia ningún secreto. Los datos reales, PDFs, importes, identificadores, domicilios, escalas personales y comprobantes quedan fuera de Git, fixtures, trazas de pruebas y capturas compartidas.

## 2. Reglas comunes de datos y uso

**Registro único.** Movimientos, fijos, cuentas, vencimientos y archivos se enlazan por identificadores. Una factura, una acreditación, el consumo de una tarjeta y el pago de su resumen representan hechos diferentes: no se suman como si fueran cuatro gastos o ingresos. Confirmar una lectura debe permitir vincular un registro existente antes de crear uno. Reimportar el mismo archivo o la misma identidad documental no duplica nada; una corrección conserva su origen.

**Importar no es confirmar.** Se conserva el original y una lectura provisional. Los campos ambiguos quedan para revisión; sin fecha, moneda o total confirmado no se incorpora el documento a los totales. Un faltante se expresa como `{PENDIENTE: qué falta}`, nunca como cero, fecha supuesta o importe obtenido por diferencia. Un mes sin factura no demuestra que no haya habido actividad o que exista deuda.

**Fechas e importes.** Fechas `dd/mm/aaaa`, horas de Argentina, importes `1.234,56` con moneda. Se mantienen ARS/USD separados o se convierten con el tipo de cambio correspondiente al movimiento; un tipo de cambio ausente no se reemplaza silenciosamente por el actual. Período del ingreso, emisión, vencimiento, cobro y pago son campos distintos.

**Uso desde el teléfono.** Los recorridos frecuentes se diseñan para **menos de 60 s y hasta 3 toques reales sobre controles de navegación y confirmación dentro de la app**. Se cuentan pulsaciones, no pantallas o pasos: abrir un menú, elegir una opción y confirmar son tres toques distintos. El tiempo incluye completar o corregir los campos necesarios; se registran aparte las pulsaciones de teclado, Face ID y el selector de archivos del sistema, junto con el tiempo total observado. No se presenta ese desglose como tres pulsaciones físicas totales. La carga de un gasto conserva el criterio aprobado. La revisión completa de 40 líneas de un resumen mantiene su criterio original de menos de 3 minutos; es una importación mensual, no se redefine como una carga rápida. Un recorrido que exceda el objetivo se rediseña o queda señalado como excepción pendiente de aprobación; no se lo declara cumplido por agrupar acciones. La revisión de anomalías puede completarse desde PC.

| Recorrido frecuente | Secuencia propuesta (máximo 3 acciones en la app) |
|---|---|
| Cargar gasto | Cargar → combo/categoría → guardar, con teclado y calculadora existentes. |
| Importar un ingreso o factura de servicio | Subir PDF desde su módulo → seleccionar archivo en el selector del sistema → Confirmar. El tipo se determina por contexto o lectura, sin sumar un menú obligatorio. La revisión no requiere otro botón; los toques del selector se informan aparte. La prueba usa un documento legible y disponible, sin excepciones. |
| Confirmar un cobro ya identificado | Abrir ingreso → elegir acreditación sugerida → confirmar. |
| Registrar un pago externo | Abrir vencimiento → «Pagué» → confirmar importe, fecha y método. |
| Consultar cuota o margen del monotributo | Monotributo → período; un toque adicional como máximo para el detalle. |
| Consultar un aumento o un papel | Abrir aviso/archivo → detalle o PDF. Buscar y abrir un resultado no agrega pantallas intermedias. |

Sin textos de ayuda ni consejos en pantalla: solo datos, avisos de datos y desgloses. Controles de 44 px, foco visible, carga/vacío/error y reintento, sin desborde horizontal a 375 px. Confirmaciones y datos cargados sobreviven a un error de red; reintentos y conciliaciones no duplican registros.

## 3. Etapas y criterios verificables

Los criterios siguientes mantienen los aprobados; sus agrupaciones no reducen exigencias. **Cada etapa implementada** requiere `pnpm verificar` en verde, salida guardada como evidencia, revisión a 375/1280 px con datos sintéticos y medición de sus recorridos móviles aplicables. Esta entrega es únicamente la propuesta documental.

### Etapa 1 · Cerrar la base publicada — sigue abierta

Alcance: el aprobado, sin módulos nuevos. Dependencia: ninguna; es el bloqueo del resto.

**Terminado cuando:**
1. Queda registrada la decisión del dominio personal y funcionan la PWA y su acceso en esa dirección, sin usar dominios empresariales.
2. La llave permite entrar desde iPhone con Face ID y desde PC con el teléfono; sin sesión no se devuelve ningún dato.
3. El respaldo anterior se importa y cada total mensual de ingresos y gastos coincide al peso con su origen, sin incorporar datos personales al repo.
4. Cargar un gasto cumple menos de 60 s y hasta 3 toques con el flujo aprobado.
5. Se configuran remitente, destino y custodia de la clave; llega el respaldo nocturno cifrado y una restauración en base vacía reproduce los datos. Las llaves restauradas se prueban en el mismo dominio; las sesiones no se restauran.

### Etapa 2 · Paridad con la app anterior y ficha básica de servicios

Se mantienen Fondos, plan, presupuestos, fijos, cuotas, catálogos, etiquetas, preferencias, Excel, reloj, WhatsApp y cotización. Ampliación acotada: ficha de servicio asociada al fijo existente; no se vuelve a cargar como otro gasto. Depende de la 1 cerrada.

**Terminado cuando:**
1. El anexo de paridad enumera cada función de la app anterior con su recorrido ejecutado, resultado aprobado y evidencia; la migración conserva fondos, fijos, plan y presupuestos, sin cambiar la exclusión de transferencias ni contar intereses reinvertidos como cobros.
2. Reloj y WhatsApp incorporan gastos al servidor en menos de un minuto sin abrir la app, sin duplicarlos; la carga móvil conserva 60 s / 3 toques.
3. La cotización diaria se carga sola con el tipo y fuente aprobados; si falla, muestra la última cotización junto con el aviso de antigüedad. No se elige una variante por cuenta propia.
4. La dirección anterior lleva a la nueva solo después de verificar la paridad y el acceso.
5. Una ficha de servicio conserva su vínculo al fijo, identificador de cuenta, medio y modalidad de pago, periodicidad y estado. Migrar/reimportar no duplica el fijo; un día habitual o importe de referencia no se muestra como vencimiento o deuda confirmados. Consultar/confirmar un fijo frecuente cumple el recorrido móvil.

### Etapa 3 · Resúmenes Galicia y base documental privada

Se mantiene el lector Visa/Mastercard y su revisión. Se agrega conservar el PDF original y abrirlo desde su importación. Depende de la 2; aún no existe el archivo general ni lectores de ingresos/servicios.

**Terminado cuando:**
1. El conjunto de resúmenes reales definido en el SPEC aprobado se valida solo en entorno privado de la PC: líneas y total cuadran al peso. Los casos automáticos y las capturas usan equivalentes sintéticos.
2. Lo cargado a mano, por fijos, reloj o WhatsApp se concilia sin duplicar; reimportar el mismo número de resumen no crea otro; pagar el resumen no agrega un gasto.
3. Cada consumo queda en su mes de consumo y cada cuota en el mes en que se cobra, conservando impuestos, percepciones, intereses y moneda.
4. Revisar y confirmar 40 líneas lleva menos de 3 minutos. Elegir un PDF y abrir su lectura respeta hasta 3 acciones; no se oculta una conciliación dudosa para reducir toques.
5. El original queda en almacenamiento privado, identificado por huella y vinculado al resumen y sus líneas. Sin sesión no se puede descargar ni adivinar su ruta; respaldo y restauración recuperan también el archivo y sus vínculos, sin sesiones.

### Etapa 4 · Extractos, cuentas y conciliación

Sin nuevos bancos ni lectores de ingresos. Su conciliación servirá a la etapa 7. Depende de la 3.

**Terminado cuando:**
1. Los extractos en los formatos confirmados se importan y el saldo de cada cuenta coincide con su origen a la misma fecha.
2. Transferencias propias y pagos de tarjeta no crean gasto ni ingreso económico. En el financiero, pagar la tarjeta sí es salida efectiva; transferir entre cuentas propias cambia sus saldos individuales y tiene efecto neto cero en el consolidado. El consumo y su pago no se suman en el mismo resultado.
3. Importar dos veces o conciliar contra un movimiento previo no duplica su efecto; una coincidencia ambigua requiere confirmar y un vínculo erróneo se puede corregir.
4. Consultar saldos o confirmar una coincidencia individual cumple 60 s / 3 toques. El extracto subido queda protegido y enlazado con la base documental de la 3.

### Etapa 5 · Vencimientos y avisos, ampliación del calendario existente

Incluye servicios manuales, cuota tributaria, expensas, tarjetas y renovaciones anuales, incluida la de seguro. Sus fechas se cargan o verifican; no se precargan los valores del contexto. Depende de la 4; no depende del futuro panel tributario.

**Terminado cuando:**
1. Un vencimiento manual confirmado avisa al iPhone N días antes y el mismo día, con N editable y 3 por defecto. Los débitos automáticos no generan pedidos de pago ni se marcan pagados solo porque llegó la fecha.
2. El reloj muestra los vencimientos del mes y vibra el día correspondiente; el registro de envíos evita repetir el mismo aviso por un reintento.
3. «Pagué» registra la fecha, el importe, el medio y su vínculo contable, apaga los avisos y cumple 60 s / 3 toques. Si ya existe el movimiento se vincula; corregir o deshacer restaura un estado coherente. Un pago con tarjeta no se registra además como salida de cuenta.
4. El vencimiento y saldo de cada tarjeta provienen del último resumen confirmado. No se reemplazan por un día aproximado ni se mezclan saldos ARS/USD.
5. Una regla mensual/anual genera una sola obligación por período. Las fechas estimadas se distinguen de las confirmadas; una renovación avisa «renueva», sin afirmar un importe ni un pago. Cuota y avisos tributarios usan esta misma agenda; un pago desconocido permanece `{PENDIENTE: confirmar pago}`.

### Etapa 6 · Resultado económico y financiero aprobado

Se entrega primero el resultado definido por el SPEC vigente, con movimientos manuales/importados de las etapas anteriores. No espera a los lectores futuros. Depende de la 5.

**Terminado cuando:**
1. El económico coincide con la suma de ingresos menos gastos del período según las fechas y reglas aprobadas, desglosado por grupo/categoría y sin transferencias.
2. El financiero refleja cobros y pagos efectivos; el patrimonio se puede reconstruir con cuentas, fondos, deuda de tarjetas y cuotas futuras, sin restar dos veces una misma obligación.
3. El mail del día 1 contiene los mismos números que la pantalla del mes anterior y respeta la configuración personal de la etapa 1.
4. Consultar un mes y abrir su desglose cumple 60 s / 3 toques. Cada total permite identificar movimientos y advertir faltantes de cotización; la comparación del mes en curso usa el mismo tramo del anterior.

### Etapa 7 · Ingresos: recibos de sueldo y facturas C

Nueva. Depende de la 6 y reutiliza archivo (3), conciliación (4) y resultados (6). Propone distinguir ingreso documentado/devengado de cobro efectivo; ese criterio se aprueba en la pregunta 3 antes de implementarlo.

**Terminado cuando:**
1. Subir un recibo o factura C obtiene una lectura revisable con período, emisión, tipo/número, moneda y total; sueldo además muestra bruto, descuentos y neto. Una lectura sin datos suficientes queda pendiente y no suma a resultados.
2. Confirmar crea o vincula un solo ingreso. Un PDF repetido o un comprobante con la misma identidad abre el registro existente; subir un faltante posteriormente no duplica un ingreso cargado manualmente. No se inventa una factura ni su fecha a partir de diferencias entre totales.
3. El neto del sueldo y el total a cobrar de la factura se concilian con acreditaciones importadas o cobros manuales identificados. Admite cobro parcial, varias acreditaciones y una acreditación aplicada a varios documentos, sin asignar más de su importe ni contar de nuevo lo ya importado; las diferencias quedan a revisar.
4. Se verifica con casos sintéticos el criterio aprobado para un ingreso de un mes cobrado en otro. El financiero solo cambia con el cobro confirmado; subir el PDF no crea plata en la cuenta. Los movimientos anteriores solo se vinculan/reclasifican tras revisión, sin modificar totales históricos silenciosamente.
5. Importar/confirmar un documento legible y confirmar un cobro sugerido cumplen cada uno 60 s / 3 toques. El original se abre desde ingreso y movimiento, y vuelve a estar disponible al restaurar el respaldo.

### Etapa 8 · Monotributo: control documental y obligaciones

Nueva. Depende de la 7; cuota y avisos reutilizan la 5. No realiza trámites ni determina una recategorización oficial.

**Terminado cuando:**
1. El facturado del año suma exclusivamente facturas confirmadas y muestra período/corte; la base de comparación de categoría mantiene su ventana propia. Sueldo y cobros no se suman a la facturación. Faltan documentos o períodos: se advierte y no se presenta un margen completo.
2. Categoría, escalas, cuota y reglas tienen fuente, vigencia e historial editables. El cálculo anualizado expone período, meses considerados y fórmula validada; solo se muestra cuando la regla sea aplicable y esté confirmada. Una prueba con datos sintéticos y parámetros versionados reproduce el resultado; sin parámetros válidos muestra `{PENDIENTE: escala o regla vigente}`. No se incorporan las cifras ni conclusiones fiscales del contexto privado como constantes.
3. El estado mensual de cuota deriva del vencimiento y del pago enlazado, con comprobante cuando se adjunte. Débito o fecha transcurrida no prueban pago; importe base, intereses confirmados y total se distinguen. Registrar el pago externo cumple 60 s / 3 toques.
4. El aviso de recategorización de enero y los demás períodos que se confirmen se configuran con calendario vigente, sin efectuar trámites. El aviso de mes sin factura solo corre para períodos donde se declaró facturación esperada; subir una factura o registrar «sin emisión prevista» resuelve el aviso sin crear ingresos.
5. Consultar facturado, margen numérico, fórmula o cuota cumple el recorrido móvil. La barra incluye cantidades y período; no emite consejos fiscales ni recomienda automáticamente una categoría.

### Etapa 9 · Servicios: historial y variaciones

Nueva. Depende de la 8; amplía las fichas de la 2 con movimientos conciliados de la 3/4, vencimientos de la 5 y lector de facturas de servicio.

**Terminado cuando:**
1. Cada servicio muestra su cuenta, modalidad, método, periodicidad e historial de importes confirmados. Factura, consumo del resumen y débito en cuenta se vinculan a la misma obligación; las coincidencias dudosas se revisan y no se suman dos veces.
2. Subir y confirmar una factura de servicio conserva período, total, moneda, vencimiento y PDF. Corrige una previsión, no crea otra deuda ni otro gasto; los importes estimados siguen identificados y no sirven de base para una alerta de aumento.
3. El aviso compara el importe con el promedio de períodos previos confirmados de la misma moneda y periodicidad, con X y cantidad de períodos configurables (pregunta 5). Muestra importe actual, promedio y diferencia; sin base suficiente o con promedio cero informa el faltante y no inventa un porcentaje. No avisa «pagá» para un débito automático ni evalúa la conveniencia del proveedor.
4. Consultar el aviso y abrir la factura, confirmar una lectura legible o registrar un pago manual cumplen sus recorridos de 60 s / 3 toques. Cambiar modalidad o archivar un servicio conserva el historial y ajusta únicamente obligaciones/avisos futuros confirmados por el usuario.

### Etapa 10 · Papeles: archivo unificado y búsqueda

Nueva. Depende de la 9. Reúne los documentos que ya se conservan desde la 3, sin volver a importarlos. Alcance inicial propuesto: recibos, facturas C, resúmenes, extractos, facturas de servicios y comprobantes de cobro/pago.

**Terminado cuando:**
1. Papeles reúne los archivos existentes; se filtra por tipo, período, emisor/servicio y estado de revisión. Buscar y abrir un documento conocido cumple 60 s / 3 toques, sin depender del nombre original del archivo.
2. Cada original conserva huella, fecha de carga, tipo y vínculos a sus registros; puede estar pendiente de vincular y no crea un movimiento por sí solo. Repetir la carga no duplica archivo ni movimiento; corregir metadatos no reemplaza silenciosamente el original.
3. El visor permite abrir/descargar el original y navegar a ingreso, servicio, importación o movimiento relacionado. Los PDFs dañados, protegidos por contraseña o sin texto quedan en estado revisable; no se muestran datos extraídos como confirmados.
4. Sin sesión, tanto el archivo como sus metadatos están inaccesibles. El respaldo cifrado y su restauración en un entorno vacío recuperan originales, vínculos y metadatos; el procedimiento comprueba cantidad de archivos y sus huellas.
5. La conservación y el alcance siguen la decisión 6: por defecto propuesto no se borran originales automáticamente. Un archivo con registros asociados no puede eliminarse silenciosamente; la falta de un original se informa y no altera el movimiento.

## 4. Pantallas nuevas y ampliaciones

Los nombres de tablas son **modelo propuesto**, no migraciones ni código. Se mantienen las pantallas aprobadas y la navegación móvil existente; los accesos frecuentes se ubican sin agregar pasos intermedios. Toda pantalla nueva guarda solamente los datos indicados, nunca copias de totales calculables.

| Pantalla | Etapa | Nueva o ampliada | Datos que guarda / tablas propuestas |
|---|---|---|---|
| Servicios · ficha básica | 2 | Nueva, desde Fijos/Ajustes | Alias, identificador de cuenta, modalidad, método, periodicidad, vínculo al fijo y activo/archivado: `servicios`; completa los `fijos` previstos por la etapa 2. |
| Importar · revisión de resumen y original | 3 | Ampliación de la aprobada | Archivo, lectura provisional/confirmada, identidad del resumen, vínculo a líneas y movimientos: `documentos`, `documento_vinculos`, `lecturas_documento`, más resúmenes/líneas de la etapa 3. |
| Importar · extracto y conciliación | 4 | Ampliación de la aprobada | Extracto original y vínculos: base documental; cuentas, extractos y conciliaciones siguen el alcance de la 4. |
| Vencimientos · detalle / registrar pago | 5 | Ampliación de la aprobada | Tipo de obligación, fuente, recurrencia, período, fecha estimada/confirmada, estado, pago y avisos: `reglas_vencimiento`, `vencimientos`, `aviso_envios`, con vínculos a movimientos y documentos. |
| Ingresos · lista y detalle | 7 | Nueva | Clase de ingreso, período, identidad documental, moneda, importe esperado/confirmado, estado de revisión y vínculos: `ingresos_documentados`; recibo detallado en `recibos_sueldo`; factura en `facturas_emitidas`. |
| Ingresos · importar y revisar | 7 | Nueva modalidad del importador | Lectura provisional y correcciones confirmadas, documento original y registro resultante: `lecturas_documento`, `documentos`, `documento_vinculos` y las tablas del ingreso. |
| Ingresos · conciliar cobro | 7 | Nueva, desde detalle | Aplicaciones de acreditaciones a ingresos, importe/moneda, fecha y estado: `cobros_ingreso`. Reutiliza movimientos y cuentas; no crea otro libro de caja. |
| Monotributo · panel y período | 8 | Nueva | Perfil, categoría/vigencias, períodos esperados de emisión y resolución de avisos: `perfil_tributario`, `escalas_tributarias`, `periodos_facturacion`. Cuotas/pagos en la agenda existente. |
| Monotributo · parámetros | 8 | Nueva, desde Ajustes | Fuentes, topes y componentes confirmados, vigencias, ventana/fórmula aplicable y calendario: `escalas_tributarias`, `perfil_tributario`, `reglas_vencimiento`. Ningún valor fiscal viene prellenado con datos personales. |
| Servicios · historial y detalle de variación | 9 | Ampliación de la ficha | Enlaces a períodos, facturas y movimientos; regla X/base comparable y estado del aviso: `servicio_periodos`, `alertas_servicio`, más configuración en `servicios`. |
| Servicios · importar factura | 9 | Nueva modalidad del importador | Lectura revisable, original y vínculo a servicio/período/vencimiento: base documental y `servicio_periodos`. |
| Papeles · archivo y visor | 10 | Nueva | Tipo, emisor, período, etiquetas y vínculos corregibles en `documentos` / `documento_vinculos`. La búsqueda y el visor no duplican archivos. |
| Panel / resultados · origen del ingreso | 7–9 | Ampliación de la etapa 6 | Ningún total nuevo persistido: consulta movimientos, ingresos y vínculos confirmados; abre su documento de origen. |

### Detalle de datos nuevos

`movimientos`, `compras`, `categorias`, `grupos`, `metodos`, `cotizaciones`, `ajustes`, `respaldos_viejos`, `credenciales` y `sesiones` ya existen. `fijos`, cuentas, resúmenes, extractos y vencimientos pertenecen a etapas aprobadas aún pendientes: se implementan allí y se amplían, no se crean duplicados con otro nombre.

| Entidad propuesta | Alta | Campos y relaciones nuevos relevantes |
|---|---|---|
| `servicios` | 2 | Identificador, alias, proveedor, referencia de cuenta, vínculo al fijo/método, modalidad manual/automática, periodicidad, día habitual como previsión y estado. En 9 agrega X y cantidad de períodos de comparación. |
| `documentos` | 3 | Identificador, tipo, nombre original, referencia opaca al archivo privado, formato/tamaño, huella, fecha de carga, período/emisión/emisor confirmados, estado, etiquetas. El archivo binario vive fuera del repo y fuera de rutas públicas. |
| `documento_vinculos` | 3 | Documento, clase e identificador del registro vinculado, función del vínculo y fecha de confirmación. Admite un documento con varios movimientos sin copiarlo. |
| `lecturas_documento` | 3 | Documento, tipo/versión del lector, campos propuestos, faltantes y errores, revisión, campos confirmados y registro resultante. No suma a resultados. |
| `reglas_vencimiento` | 5 | Origen, tipo pago/renovación/recategorización, periodicidad, próxima fecha validada, modalidad de pago, anticipación y vigencia. El importe puede faltar; no se inventa. |
| `vencimientos` (ampliación de lo aprobado) | 5 | Regla/origen y período únicos, fechas previstas/confirmadas, moneda e importe confirmado si existe, estado, fecha e importe pagados y vínculos a movimiento/comprobante. |
| `aviso_envios` (ya previsto en la 5) | 5 | Vencimiento, canal iPhone/reloj, tipo de aviso, momento previsto/enviado y resultado. Clave única por aviso y canal para no repetir envíos. |
| `ingresos_documentados` | 7 | Clase sueldo/factura C, período devengado, fecha de emisión, moneda, importe confirmado, estado de revisión, documento y movimiento de ingreso asociado. El estado de cobro se calcula desde sus aplicaciones. |
| `recibos_sueldo` | 7 | Ingreso, período, identidad del empleador informada en el PDF, bruto, descuentos, neto y concepto/tipo de liquidación. El neto es la referencia de cobro; bruto/descuentos no generan otros ingresos. |
| `facturas_emitidas` | 7 | Ingreso, emisor/identificador, tipo, punto de venta, número, cliente/identificador, emisión, período, moneda y total confirmados. Identidad única; no emisión ni acceso a ARCA. |
| `cobros_ingreso` | 7 | Ingreso, movimiento de acreditación/cobro, importe y moneda aplicados, fecha y estado de conciliación. Relación de varios cobros/documentos con control de sumas y reversión. |
| `perfil_tributario` | 8 | Inicio de actividad, categoría y vigencias, actividad, régimen/componentes aplicables, expectativa de emisión por período y calendario confirmado. Todos los valores personales se cargan en privado. |
| `escalas_tributarias` | 8 | Categoría, vigencia, fuente y verificación, tope, componentes/cuota, ventana de cómputo y regla de anualización confirmada/versionada. Las fuentes y reglas pendientes impiden presentar el cálculo como válido. |
| `periodos_facturacion` | 8 | Período, emisión esperada sí/no, cobertura documental completa/pendiente, estado del aviso y motivo de resolución. El facturado se calcula con facturas confirmadas, no se almacena otra suma. |
| `servicio_periodos` | 9 | Servicio/período, documento, obligación y movimiento conciliado, importe/moneda, fecha y calidad del dato estimado/confirmado. Un período puede tener ajustes documentados sin perder el original. |
| `alertas_servicio` | 9 | Servicio/período, regla y versión utilizadas, referencias de los períodos comparados, fecha del cálculo y estado visto/resuelto. La diferencia se reproduce desde sus importes confirmados. |

## 5. Privacidad, respaldo y validación de la propuesta

- `docs/privado/` permanece ignorado. Antes de entregar se verifica tanto que no aparezca en `git status` como que `git ls-files -- docs/privado` esté vacío; ignorar no alcanza si algo ya estaba versionado. No se modifica ni se agrega ese directorio.
- La propuesta describe campos, no valores reales. Los documentos usados para aceptación privada quedan en el almacenamiento autorizado; las pruebas, sus registros y las capturas solo usan datos sintéticos. No se copian PDFs personales a los directorios del proyecto.
- La conservación de archivos y su inclusión en el respaldo se resuelven en la etapa 3, antes del primer PDF. Si exceden el límite de la casilla, el procedimiento cifrado debe permitir recuperar el conjunto completo y comprobar sus huellas; no se declara respaldo completo de solo la base de datos. `{PENDIENTE: límite de adjuntos de la casilla y mecanismo cifrado compatible}`.
- Las migraciones son aditivas; no se tocan las aplicadas ni se reescriben registros históricos automáticamente. Ajustes y conciliaciones son revisables y reversibles, con respaldo antes de migrar.
- Se conservan los pendientes heredados: `{PENDIENTE: tipo y fuente del dólar automático}` para la 2; `{PENDIENTE: formatos y muestras privadas de los extractos}` para la 4. También se necesita `{PENDIENTE: escala, reglas fiscales y calendario vigentes verificados}` antes de los cálculos de la 8. No se convierten supuestos del contexto privado en normativa o decisiones aprobadas.

## 6. Decisiones de Nico — máximo seis

1. **Acceso (etapa 1): ¿qué dominio personal usamos para crear la llave definitiva?** Recomendación: dominio personal propio y HTTPS antes del alta de la llave; conservar la etapa abierta hasta verificar el acceso en iPhone y PC. `{PENDIENTE: dominio elegido}`.
2. **Respaldo (etapa 1): ¿qué casillas personales usamos para enviar/recibir y dónde vas a guardar la clave de recuperación?** Recomendación: destino personal estable, remitente personal autorizado y clave en un gestor con copia de recuperación fuera del VPS. Los valores se configuran en privado; no se incluyen en el SPEC. `{PENDIENTE: remitente, destinatario y custodia}`.
3. **Ingresos (etapa 7): ¿separamos el mes del ingreso documentado del mes de cobro?** Recomendación: económico por período devengado confirmado y financiero por acreditación efectiva, con sueldo neto como ingreso y bruto/descuentos solo como desglose. Aprobar esta ampliación de la etapa 6 y vincular los movimientos previos sin duplicarlos.
4. **Facturación esperada (etapa 8): ¿querés aviso por mes sin factura solo cuando ese período tenga emisión prevista?** Recomendación: sí, expectativa configurable por período, aviso de dato faltante y resolución explícita; no presuponer facturación mensual ni deuda por ausencia de PDF.
5. **Variaciones de servicios (etapa 9): ¿aprobamos aviso por aumento superior al 25 % contra los tres períodos previos comparables?** Recomendación: usar ese punto de partida, editable por servicio; solo con importes confirmados de la misma moneda/periodicidad y base suficiente. Son parámetros propuestos, no valores observados ni límites fiscales.
6. **Archivo (etapa 10): ¿arrancamos con los papeles financieros de estas etapas y conservamos sus originales sin borrado automático?** Recomendación: sí; dejar documentos de identidad, contratos generales y otros papeles para una ampliación explícita, con privacidad y conservación definidas antes de incorporarlos.
