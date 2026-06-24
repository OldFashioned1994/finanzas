# Finanzas

App web personal para registrar ingresos y gastos. Mobile-first, sin backend ni
login: todo se guarda en tu propio dispositivo (IndexedDB). Exporta a `.xlsx` listo
para Google Sheets.

## Usarla en el celular (online)

Está publicada como PWA en **https://skyterrasl.github.io/finanzas/**.

1. Abrí esa dirección en el celular (Chrome en Android / Safari en iPhone).
2. **Agregar a la pantalla de inicio** (menú del navegador). Te queda como una app,
   a pantalla completa y con ícono propio.
3. Una vez instalada funciona **sin conexión**: la app se guarda en el cel y tus
   movimientos viven ahí. No hace falta tener la PC prendida.

Cada vez que cambiemos el código y se haga `push` a `main`, GitHub Actions la
recompila y actualiza sola; el cel toma la versión nueva al volver a abrirla.

> Tus datos viven solo en el navegador donde la uses (no se sincronizan entre
> dispositivos). Usá **Exportar** cada tanto como respaldo. La sincronización con
> Google Sheets queda para una próxima etapa.

## Cómo correrla en local (desarrollo)

```bash
npm install        # solo la primera vez
npm run dev        # entorno de desarrollo
```

Vite te muestra dos direcciones:

- **Local** (`http://localhost:5173`) → para abrir en la PC.
- **Network** (`http://192.168.x.x:5173`) → abrí *esta* en el celular (tiene que
  estar en la misma red Wi-Fi que la PC). Así la probás de verdad en el cel.

Para una versión optimizada: `npm run build` genera la carpeta `dist/` y
`npm run preview` la sirve.

> Los datos viven en el navegador del dispositivo donde la uses. Si la abrís en el
> cel, los movimientos quedan en el cel. Para tenerla siempre disponible sin la PC
> encendida habría que subirla a un hosting estático (GitHub Pages, Vercel, etc.) —
> eso lo vemos cuando quieras.

## Editar categorías, subcategorías y métodos

Todo está en un solo archivo: [`src/config.js`](src/config.js). Agregá, quitá o
renombrá lo que quieras; el orden en que lo escribís es el orden de los botones.
Los movimientos ya cargados no se rompen si renombrás algo: conservan el texto con
el que se guardaron.

## Cargar un movimiento (el flujo rápido)

La pantalla de inicio ya es la de carga:

1. Escribís el **monto** (el teclado numérico abre solo).
2. Tocás **categoría** → **subcategoría** → **método**.
3. **Guardar**.

Por defecto el tipo es *Gasto* (un toque lo pasa a *Ingreso*) y la fecha es hoy
(editable). Al guardar, la pantalla queda lista para el siguiente.

## Movimientos y exportar

En la pestaña **Movimientos** ves la lista (más nueva primero), con filtros por
mes / tipo / categoría y los totales del mes. Cada uno se puede editar o borrar.

El botón **Exportar** baja un `.xlsx` (`finanzas_AAAA-MM-DD.xlsx`) con una fila por
movimiento y las columnas en orden: Fecha · Tipo · Monto · Categoría ·
Subcategoría · Método de pago · Descripción. Lo abrís o importás directo en Google
Sheets (las fechas y los montos van como fecha y número reales).

## Stack

React + Vite + Tailwind v4 · Dexie (IndexedDB) · write-excel-file. Sin backend.
