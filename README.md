# Dodo Sushi & Bar San Felipe

Sitio estático listo para GitHub y Vercel. El catálogo se lee desde la URL pública de Google Sheets definida en `src/app.js`; el archivo `public/catalogo-respaldo.csv` solo se muestra si la consulta en vivo falla. Los cambios del Sheet se consultan al cargar la página, sin redeploy. Si Google demora en actualizar su publicación, la web mostrará la versión publicada más reciente.

## Desarrollo y despliegue

```bash
npm run dev
npm run build
```

La salida estática queda en `dist/`. En Vercel se usa `vercel.json`, con `npm run build` y directorio `dist`.

## Formato de la carta

Encabezados: `categoría,nombre,descripción,opciones/tamaños,precio,stock,foto,observaciones`.

- `precio`: monto CLP; se aceptan formatos como `10000`, `$10.000` y `$10,000`.
- `stock`: `sí` o `si` permite pedir. Cualquier otro valor bloquea el producto.
- `foto`: URL pública de una imagen individual. Vacío no genera marco; si falla la carga, se retira la imagen.
- `opciones/tamaños`: variantes separadas por `/` aparecen como selector cuando comparten precio.
- Las filas de `Coberturas para tablas` alimentan el configurador de las tablas a elección y cobran el precio por roll. La fila `Tempurizar gyozas` alimenta el adicional de gyozas.

Las tres fotos entregadas se usan únicamente en el diseño de la portada y secciones; no se asignan automáticamente a un producto. El favicon y el icono móvil se derivan del logo entregado.
