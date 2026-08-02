# Finanzas

App web personal para registrar ingresos y gastos y entender en qué se te va la
plata. Mobile-first, sin backend ni login: todo se guarda en tu propio dispositivo
(IndexedDB). Funciona sin conexión.

## Usarla en el celular

Está publicada como PWA en **https://oldfashioned1994.github.io/finanzas/**.

1. Abrí esa dirección en el celular (Chrome en Android / Safari en iPhone).
2. **Agregar a la pantalla de inicio** (menú del navegador). Te queda como una app,
   a pantalla completa y con ícono propio.
3. Una vez instalada funciona **sin conexión**: la app se guarda en el cel y tus
   movimientos viven ahí. No hace falta tener la PC prendida.

Cada `push` a `main` la recompila y actualiza sola (GitHub Actions); el cel toma la
versión nueva al volver a abrirla.

> **Tus datos viven solo en el dispositivo donde la uses**, y no salen de ahí:
> son privados por diseño. Para que además sean duraderos, la app le pide al
> navegador **almacenamiento permanente** — con eso concedido, deja de borrarlos
> por falta de espacio o por pasar tiempo sin usarla. En Ajustes → Datos y
> respaldo podés ver si está activo.
>
> Dos cosas que igual conviene saber: instalada en la pantalla de inicio el
> navegador cuida mucho más sus datos (en iPhone, un sitio suelto en Safari
> pierde el almacenamiento a los 7 días sin usarlo), y un backup cada tanto es lo
> único que te devuelve todo si borrás los datos del sitio o cambiás de teléfono.

## Las cuatro pantallas

### Cargar

Es la pantalla de inicio, pensada para que un gasto se registre en segundos:

0. **Pesos o dólares**: el selector `$ / US$` al lado del monto define en qué
   moneda lo tipeás (ver *Dólares* más abajo).
1. **Monto** en el teclado propio de la app, que además es **calculadora**: podés
   tipear `1200 + 340 + 85` y el botón te resuelve la cuenta antes de guardar.
2. **Frecuentes**: la fila de arriba arma los combos que más usás
   (categoría + subcategoría + método). Un toque completa los tres campos.
3. Si no usás un frecuente, al elegir la categoría la app **presugiere** la
   subcategoría y el método que más usás en ella.
4. **Guardar**. Queda todo listo para el siguiente, y el aviso trae **Deshacer**
   por si te equivocaste.

La fecha es hoy (con atajos *Hoy* / *Ayer*) y el tipo por defecto es *Gasto*.
Las categorías y métodos se ordenan solos por lo que más usaste últimamente.

### Panel

El tablero de control. Se mueve por período (mes a mes, 3 meses, año, todo):

- **KPIs**: gastos, ingresos, balance y tasa de ahorro, con la variación contra el
  período anterior. En el mes en curso la comparación es contra el **mismo tramo**
  del mes pasado, no contra el mes entero.
- **Ritmo de gasto**: cuánto llevás acumulado día a día contra la curva del mes
  anterior, con promedio diario y cierre estimado.
- **En qué se va la plata**: anillo con el peso de cada **grupo** en porcentaje
  (Vivienda, Alimentación, Transporte…), con un botón para pasar al detalle por
  categoría.
- **Cuánto es elección tuya**: qué parte del gasto es esencial, cuál es disfrute
  y cuál es otra cosa. Es la lectura de la regla 50/30/20.
- **Detalle por grupo**: ranking con barras, variación vs. el período anterior y
  desglose al tocar cada uno (grupo → categorías → subcategorías).
- **Presupuestos** del mes con semáforo.
- **Últimos 12 meses**: ingresos y gastos como barras divergentes desde el cero
  (tocá un mes para saltar a él).
- **Con qué pagaste** y **gastos más grandes** del período.

### Grupos, categorías y subcategorías

La app tiene tres niveles, igual que YNAB y Monarch:
**grupo → categoría → subcategoría**. Por ejemplo:
`Vivienda → Servicios → LUZ`.

Los grupos que trae por defecto siguen la lógica de la **COICOP Argentina 2019**,
el clasificador que usa el INDEC para la Encuesta Nacional de Gastos de los
Hogares: agrupar el gasto por *la necesidad que satisface*.

| Grupo | Categorías |
|---|---|
| 🏠 Vivienda | Vivienda · Servicios · Hogar · Equipamiento |
| 🍔 Alimentación | Alimentación |
| 🚕 Transporte | Transporte |
| 💊 Salud y cuidado | Salud · Cuidado personal |
| 🎬 Ocio y estilo de vida | Ocio y entretenimiento · Regalos y eventos |
| 📚 Educación | Educación |
| 🏦 Finanzas y varios | Servicios financieros · Imprevistos |

En ingresos: Trabajo, Rentas y Otros ingresos.

Además, cada categoría de gasto tiene una **naturaleza** (esencial, disfrute u
otros) que alimenta la tarjeta *"Cuánto es elección tuya"*. Todo esto se edita
desde Ajustes → Grupos y Ajustes → Categorías.

### Fondos

Los bolsillos donde apartás plata. Dos clases:

**Inversiones** — plazo fijo, fondo común, dólares guardados, cripto, acciones.
Cuatro operaciones: *aportar*, *retirar*, *valuar* (anotar cuánto vale hoy según
el banco o el broker) y *acreditar interés*. El rendimiento se calcula solo:
`valor actual − aportado`.

**Metas** — juntar para algo concreto (un viaje, el seguro anual) con objetivo,
fecha y barra de progreso. Si ponés fecha, te dice cuánto apartar por mes.

Dos reglas que hacen que los números no mientan:

- **Poner plata en un fondo NO es un gasto.** Se registra como *transferencia*:
  aparece en la lista de movimientos pero queda fuera de todos los totales.
  Es plata que sigue siendo tuya, solo cambió de bolsillo.
- **Un rendimiento NO es un ingreso hasta que lo cobrás.** Al acreditar un
  interés elegís: si queda adentro reinvirtiéndose, solo sube el valor del
  fondo; si lo cobraste, ahí sí entra al flujo del mes como ingreso real.
  Contar como ingreso una ganancia que nunca tocaste infla la tasa de ahorro.

### Compras en cuotas

Al cargar un gasto elegís en cuántas cuotas lo pagás y la app genera las N de una
vez, una por mes: ya las debés. Cada mes futuro muestra la suya, marcada `3/12`.
El panel te dice cuánto queda por pagar en total, y en Ajustes → Compras en
cuotas ves cómo cae mes a mes y podés cancelar las que faltan.

### Etiquetas

Además de la categoría, cualquier movimiento puede llevar etiquetas libres
("brasil 2026", "mudanza"). Sirven para lo que cruza rubros: un viaje toca
transporte, comida y ocio, y ninguna categoría sola te dice cuánto salió.

### Movimientos

Lista agrupada por día con subtotal diario, buscador y filtros por mes / tipo /
categoría. Al tocar un movimiento aparecen **Repetir** (lo vuelve a cargar con
fecha de hoy), **Editar** y **Borrar** (con deshacer).

### Dólares

La app maneja pesos y dólares, con **cotización manual**: el número lo ponés vos
(el dólar que uses: blue, MEP, tarjeta). No hay llamadas a internet.

- **Gasto en dólares**: tocás `US$`, ponés el monto y la cotización. Mientras
  cargás ves el equivalente en pesos (`US$50 × 1.310 = $65.500`). No hace falta
  tener una "cuenta en dólares": alcanza con la cotización.
- **Gasto en pesos que te cobraron en dólares**: dejás el monto en `$` y tocás
  *"Me lo cobraron en dólares"* para agregarle la cotización.
- **Que salga de la caja de dólares**: creás un método (ej. "Caja dólares") y en
  Ajustes lo marcás como `US$`. Al elegirlo, la carga pasa sola a dólares.
- **Cada movimiento guarda su propia cotización**, así un gasto de marzo sigue
  valiendo los dólares que valía en marzo. El monto convertido no se guarda: se
  calcula al mostrar.
- **El panel se lee en cualquiera de las dos monedas** con el botón `$ / US$`.
  Ver los 12 meses en dólares es la única forma de compararlos sin que la
  inflación los deforme.
- Los movimientos sin cotización propia usan la del mes (Ajustes → Dólar); si un
  mes no tiene, hereda la del mes anterior más cercano. Lo que no se pueda
  convertir queda afuera y la app lo avisa, en vez de inventar un número.

### Ajustes

- **Grupos**: crear, renombrar, reordenar (el orden define el color en el panel).
  Al borrar un grupo sus categorías se mudan, no quedan sueltas.
- **Dólar**: cotización de referencia y una por mes, para poder leer el histórico
  en dólares.
- **Presupuestos** mensuales por categoría, con sugerencia basada en tu promedio
  real de los últimos 3 meses.
- **Gastos fijos** (alquiler, expensas, streaming): el día que corresponde
  aparecen en el panel para confirmarlos con un toque. No se cargan solos a
  propósito: lo registrado sigue siendo lo que realmente pasó.
- **Categorías y métodos**: agregar, renombrar, reordenar, archivar. Al renombrar,
  los movimientos ya cargados se actualizan solos. Lo que tiene historial no se
  borra: se archiva (deja de ofrecerse al cargar, pero sigue contando en el panel).
- **Datos y respaldo**: estado del almacenamiento permanente (con botón para
  activarlo si el navegador todavía no lo concedió) y cuándo fue la última copia.
  Backup completo `.json` (restaurable), export `.xlsx` para planilla, y
  restauración en modo *sumar* o *reemplazar*. En iPhone el backup se guarda con
  la hoja de compartir → *Guardar en Archivos*: queda en el teléfono, sin nube.

## Correrla en local (desarrollo)

```bash
npm install        # solo la primera vez
npm run dev        # entorno de desarrollo
```

Vite muestra dos direcciones: **Local** (`http://localhost:5173/finanzas/`) para la
PC y **Network** (`http://192.168.x.x:5173/finanzas/`) para abrirla en el celular
estando en la misma Wi-Fi.

`npm run build` genera `dist/` y `npm run preview` la sirve.

## Notas técnicas

- **Datos**: Dexie sobre IndexedDB, esquema v5 (`movimientos`, `categorias`,
  `grupos`, `metodos`, `presupuestos`, `fijos`, `cotizaciones`, `fondos`,
  `opsFondo`, `compras`, `ajustes`). Las migraciones nunca tocan un monto: v2
  rescata categorías o métodos que existan en el historial y no estén en la
  semilla, v3 marca como pesos lo ya cargado, v4 asigna cada categoría a su grupo
  (lo que no encaje va al grupo de varios, nunca se pierde) y v5 suma fondos y
  cuotas. **Cuidado al tocar un `upgrade`**: cada uno corre con el esquema de SU
  versión, así que no puede usar una tabla que se crea más adelante.
- **Tipos de movimiento**: `gasto`, `ingreso` y `transferencia`. Las
  transferencias quedan fuera de todos los totales — si sumás algo nuevo al
  panel, acordate de excluirlas.
- [`src/config.js`](src/config.js) es **solo la semilla** de la primera ejecución.
  El día a día se edita desde Ajustes.
- **Gráficos**: SVG propio, sin librería (Recharts pesaba más que toda la app). La
  paleta de categorías está validada para daltonismo y contraste sobre el fondo
  oscuro; ver [`src/utils/paleta.js`](src/utils/paleta.js) antes de cambiar un color.
- **Stack**: React 19 + Vite + Tailwind v4 · Dexie · write-excel-file (carga
  diferida, solo al exportar).
