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

> **Tus datos viven solo en el dispositivo donde la uses.** No se sincronizan entre
> el cel y la PC. Bajá un **backup** cada tanto (Ajustes → Datos y respaldo) y
> guardalo en Drive: es lo único que te devuelve todo si perdés el teléfono.

## Las cuatro pantallas

### Cargar

Es la pantalla de inicio, pensada para que un gasto se registre en segundos:

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
- **En qué se va la plata**: anillo con el peso de cada categoría en porcentaje.
- **Detalle por categoría**: ranking con barras, variación vs. el período anterior
  y desglose por subcategoría al tocar cada una.
- **Presupuestos** del mes con semáforo.
- **Últimos 12 meses**: ingresos y gastos como barras divergentes desde el cero
  (tocá un mes para saltar a él).
- **Con qué pagaste** y **gastos más grandes** del período.

### Movimientos

Lista agrupada por día con subtotal diario, buscador y filtros por mes / tipo /
categoría. Al tocar un movimiento aparecen **Repetir** (lo vuelve a cargar con
fecha de hoy), **Editar** y **Borrar** (con deshacer).

### Ajustes

- **Presupuestos** mensuales por categoría, con sugerencia basada en tu promedio
  real de los últimos 3 meses.
- **Gastos fijos** (alquiler, expensas, streaming): el día que corresponde
  aparecen en el panel para confirmarlos con un toque. No se cargan solos a
  propósito: lo registrado sigue siendo lo que realmente pasó.
- **Categorías y métodos**: agregar, renombrar, reordenar, archivar. Al renombrar,
  los movimientos ya cargados se actualizan solos. Lo que tiene historial no se
  borra: se archiva (deja de ofrecerse al cargar, pero sigue contando en el panel).
- **Datos y respaldo**: backup completo `.json` (restaurable), export `.xlsx` para
  planilla, y restauración en modo *sumar* o *reemplazar*.

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

- **Datos**: Dexie sobre IndexedDB, esquema v2 (`movimientos`, `categorias`,
  `metodos`, `presupuestos`, `fijos`, `ajustes`). La migración desde v1 conserva
  los movimientos y rescata categorías o métodos que existan en el historial y no
  estén en la semilla.
- [`src/config.js`](src/config.js) es **solo la semilla** de la primera ejecución.
  El día a día se edita desde Ajustes.
- **Gráficos**: SVG propio, sin librería (Recharts pesaba más que toda la app). La
  paleta de categorías está validada para daltonismo y contraste sobre el fondo
  oscuro; ver [`src/utils/paleta.js`](src/utils/paleta.js) antes de cambiar un color.
- **Stack**: React 19 + Vite + Tailwind v4 · Dexie · write-excel-file (carga
  diferida, solo al exportar).
