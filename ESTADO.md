# Estado del proyecto

> "App web personal de ingresos/gastos en el workspace (14-finanzas, React+Vite+Tailwind+Dexie), mobile-first, con panel de control, presupuestos y gastos fijos"
>
> Bajado desde la memoria de Claude Code el 11-ago-2026. Esta es la ficha viva: actualizala acá.

---

App web personal para registrar ingresos y gastos y analizar en qué se va la plata.
Carpeta `C:\Users\ivann\IA\Proyectos Claude Code\14-finanzas`.

Stack: React 19 + Vite + Tailwind v4 + Dexie (IndexedDB, sin backend/login/nube) +
write-excel-file (import dinámico, solo al exportar). Mobile-first.

**Desplegada como PWA en https://oldfashioned1994.github.io/finanzas/**
Repo público `OldFashioned1994/finanzas`, deploy automático por GitHub Actions en cada
push a main (Node 22). Para pushear, la cuenta activa de gh debe ser OldFashioned1994
(`gh auth switch --user OldFashioned1994`). Pages se habilitó vía
`gh api -X POST repos/OldFashioned1994/finanzas/pages -f build_type=workflow`.

## Ampliación grande del 2026-08-01

Pasó de "formulario + lista" a herramienta de gestión. Cuatro pantallas: Cargar,
Panel, Movimientos, Ajustes (nav inferior).

- **Esquema Dexie v2**: tablas `movimientos`, `categorias`, `metodos`, `presupuestos`,
  `fijos`, `ajustes`. La migración v1→v2 siembra la taxonomía desde config.js y además
  **absorbe** categorías/subcategorías/métodos que estén en movimientos viejos y no en
  la semilla (verificado con test de migración).
- **`src/config.js` ya NO es la fuente de verdad**: es solo la semilla de la primera
  ejecución. Categorías, subcategorías y métodos se editan desde Ajustes. Renombrar
  arrastra los movimientos ya cargados; lo que tiene historial se archiva, no se borra.
- **Carga rápida**: teclado numérico propio con calculadora encadenada
  (`utils/calculadora.js`), combos frecuentes de un toque, subcategoría/método
  presugeridos por uso con decaimiento temporal (vida media 45 días, `utils/calc.js`),
  deshacer en el toast.
- **Panel**: KPIs, ritmo de gasto, donut con drill-down, ranking por categoría,
  evolución 12 meses (barras divergentes desde el cero), métodos, top 5.
- **Presupuestos** mensuales con semáforo y marca de ritmo esperado; **gastos fijos**
  que se confirman con un toque (no se cargan solos a propósito).
- **Backup/restore JSON completo** (el .xlsx no restaura la app) en Ajustes.

Decisión de alcance vigente: **sin saldos de cuentas** (solo flujo, desglose por método).

## Multimoneda pesos/dólares (2026-08-01, esquema v3)

Cada movimiento guarda `moneda` ('ARS'|'USD') y `tc` (pesos por dólar de ESE
movimiento). El monto convertido NO se guarda: se calcula al mostrar (patrón de
ledger; si se guardara se desincronizaría al editar). Tabla `cotizaciones` (una por
mes) para dolarizar lo que no tenga tc propio; los métodos pueden tener `moneda`
propia (elegir "Caja dólares" pasa la carga a USD).

**La cotización es SIEMPRE manual, sin llamadas a internet** (decisión explícita de
Iván; la app sigue 100% offline). Ajustes → Dólar tiene la de referencia + una por mes.

Los 3 casos que pidió, todos cubiertos: gasto en USD con cotización propia; gasto que
sale de la caja de dólares (método en USD); y gasto en pesos con cotización porque se
lo cobraron en dólares (chip "Me lo cobraron en dólares").

Resolución del TC: el del movimiento → el del mes → el del mes anterior más cercano
(nunca uno posterior: sería reescribir el pasado) → el de referencia. Lo que no se
puede convertir se excluye y se avisa en pantalla, nunca se inventa un número.
El panel tiene toggle global $/US$ (preferencia en ajustes `monedaPanel`).

## Grupos de categorías (2026-08-01, esquema v4)

Taxonomía de TRES capas, como YNAB/Monarch: **grupo → categoría → subcategoría**
(ej. Vivienda → Servicios → LUZ). Tabla `grupos`; las categorías tienen `grupo`
(nombre, no id: renombrar arrastra) y `naturaleza` ('esencial'|'disfrute'|'otros').

Los 7 grupos de gasto por defecto siguen la lógica de la **COICOP Argentina 2019**
(el clasificador del INDEC para la ENGHo): agrupar por la necesidad que satisface.
Vivienda (incluye servicios, hogar y equipamiento — el "gasto locatario" que pidió
Iván), Alimentación, Transporte, Salud y cuidado, Ocio y estilo de vida, Educación,
Finanzas y varios. Ingresos: Trabajo, Rentas, Otros ingresos. El mapa está en
`CLASIFICACION` de src/config.js.

El panel arranca en vista de GRUPOS (toggle a categorías, preferencia `nivelPanel`)
y tiene la tarjeta "Cuánto es elección tuya" (esencial/disfrute/otros = regla
50/30/20). El color ahora lo manda el GRUPO por su orden en la taxonomía, y las
categorías heredan una variante aclarada del color de su grupo: con 7 grupos entran
en los 8 tonos validados sin ciclar.

## Fondos, cuotas y etiquetas (2026-08-01, esquema v5)

5ª pestaña **Fondos**: tabla `fondos` con `clase` 'inversion' | 'meta' (comparten
mecánica) y `opsFondo` con 4 tipos de operación (aporte, retiro, valuacion, interes).
Motor en `src/utils/fondos.js`. Rendimiento = valor − aportado. Decisión de alcance:
**saldos SOLO en inversiones**, nada de conciliar cuentas del día a día.

**Dos reglas conceptuales que no hay que romper:**
1. Los movimientos ahora pueden ser `gasto`, `ingreso` o **`transferencia`**. Aportar a
   un fondo genera una transferencia, que queda FUERA de todos los totales (es el
   error de doble conteo clásico). Si se agrega algo al panel, hay que excluirlas.
2. Un interés solo entra al flujo como ingreso si se marca `cobrado`; si se reinvierte
   solo sube el valor del fondo. Contar ganancias no realizadas infla la tasa de ahorro.

**Cuotas**: al cargar un gasto se elige la cantidad de cuotas y se generan las N de una
vez (tabla `compras` + movimientos con `compraId` y `cuota:{n,de}`). Deuda = cuotas con
fecha futura. Gestión en Ajustes → Compras en cuotas.

**Etiquetas**: campo `tags` (índice multiEntry `*tags`) libre y transversal a categorías.

**Proyección de cierre**: suma lo comprometido (fijos sin confirmar + cuotas por vencer)
y solo extrapola la parte variable; requiere ≥5 días del mes.

**GOTCHA CRÍTICO de migraciones**: cada `upgrade()` de Dexie corre con el esquema de SU
versión. Un upgrade viejo NO puede tocar una tabla creada en una versión posterior — pasó
con `absorberDeMovimientos`/`sembrarTaxonomia` pidiendo `grupos` (creada en v4) desde el
upgrade a v2, y rompía la migración de cualquier base que viniera de v1. Hay test de
migración v1→actual en el scratchpad; correrlo siempre que se agregue una versión.

## Permanencia de los datos (2026-08-02)

Iván la usa en **iPhone** y quiere los datos **privados pero duraderos**: nada de nube
ni sync (lo descartó explícitamente). Solo que no se borren en uso normal.

`src/utils/respaldo.js`: la app pedía `navigator.storage.persist()` al arrancar pero
**nunca verificaba si se lo concedían**. Ahora se reintenta en cada arranque (el
navegador lo otorga según uso e instalación, así que el primer pedido es el que más
falla) y Ajustes → Datos y respaldo muestra el estado real + última copia + aviso si no
está instalada en pantalla de inicio.

Datos técnicos verificados (2026): la regla de Safari que borra el almacenamiento a los
**7 días** de no usar un sitio **NO aplica a PWAs instaladas en pantalla de inicio**;
`persist()` está soportado en Safari 17+; borrar el historial de Safari SÍ borra los
datos de la PWA. **File System Access API no existe en iOS** (no se puede escribir un
archivo solo): el backup se entrega con `navigator.share({files})` para "Guardar en
Archivos". Chromium headless nunca concede persistencia — no es un bug al testear.

REGLA DE TONO: cuando pidió esto, mi propuesta inicial (panel de riesgos, rescate
automático, niveles urgentes) le pareció exagerada. Quería lo mínimo que funcione.
Preferir lo simple y no dramatizar el riesgo.

## Servicios como fijos e importación (2026-10-28)

- Los fijos tienen `descripcion` (Edenor, Claro…) y `debito` (true si se debita solo de una
  tarjeta). Se ven en Ajustes → Gastos fijos y en «Fijos por confirmar» del panel, y `debito`
  viaja al reloj en los vencimientos (campo nuevo, el buzón lo guarda tal cual).
- **Importar fijos**: Ajustes → Gastos fijos → Importar, un JSON
  `{ formato: 'finanzas-fijos', version: 1, fijos: [...] }` (ver `src/utils/fijos-import.js`).
  Antes de guardar muestra la lista: lo repetido viene destildado y se marca lo que se va a
  crear (categoría, subcategoría, método). Los nombres se comparan sin acentos ni mayúsculas.
- El archivo con los servicios de Nico vive en su OneDrive, fuera del repo: **datos personales,
  nunca al repo, que es público** (tampoco este ESTADO, que se publica).
- Siguen (pedido del 28-oct): etapa 2, leer el PDF del resumen de Visa/Mastercard Galicia en el
  teléfono (revisar y confirmar, conciliar con lo ya cargado, cada consumo en su mes); etapa 3,
  resultado económico del mes.

## Gotchas técnicos

- **Gráficos en SVG propio, sin librería** (Recharts pesa 136 KB gzip, más que la app).
  La paleta categórica de `src/utils/paleta.js` está VALIDADA (banda de luminosidad,
  croma, contraste ≥3:1 y daltonismo) contra la superficie #101a2e con el validador de
  la skill `dataviz`. No cambiar un hex suelto sin revalidar el set.
- El par rosa/verde (gasto/ingreso) NO se distingue en deuteranopía: en los gráficos la
  identidad va siempre por otro canal además del color (posición respecto del cero,
  etiqueta directa).
- En el mes en curso, la comparación contra el período anterior se recorta al **mismo
  tramo** (día 1 al día de hoy del mes pasado); si no, todo arranca con un falso "-90%".
- La proyección de cierre de mes solo aparece con ≥5 días de base.
- Dexie mapea la versión 2 del esquema a la **20** interna de IndexedDB (al testear).
- Íconos: Safari ignora un apple-touch-icon SVG → hay PNG 180/192/512 + maskable en
  `public/`, generados renderizando el SVG con Playwright (`scratchpad/generar-iconos.mjs`).

Pendiente / futuro: sincronización con Google Sheets (explícitamente NO por ahora).
Los datos siguen viviendo solo en el dispositivo; el backup JSON es el respaldo real.