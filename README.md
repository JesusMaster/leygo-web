# leygo-web

Landing de **leygo.cl**: qué es leygo, qué hace, cómo instalarlo y preguntas frecuentes.
Es un sitio estático (HTML, CSS y JS sin build ni dependencias), separado del repositorio del agente.

```
index.html     contenido y estructura
styles.css     tokens de diseño, layout y animaciones
app.js         demo de rutas, tarjeta de aprobación, manifiesto que se escribe solo, copiar comandos
fonts/         Overpass y Overpass Mono (OFL), servidas desde el mismo dominio
favicon.svg    logo de leygo (se adapta a modo oscuro)
og.png         imagen para compartir en redes (1200×630)
```

## Verlo en local

```bash
npx serve .          # o: python3 -m http.server 8080
```

## Publicar en leygo.cl

**Cloudflare Pages** (lo más simple, gratis):
1. Sube esta carpeta a un repo nuevo (p. ej. `JesusMaster/leygo-web`).
2. Cloudflare → Workers & Pages → Create → Pages → conecta el repo. Build command: vacío. Output directory: `/`.
3. Custom domains → `leygo.cl` y `www.leygo.cl`.

**En el Droplet con Caddy** (si prefieres tenerlo junto al agente): copia la carpeta a `/srv/leygo-web` y agrega al Caddyfile:

```
leygo.cl, www.leygo.cl {
    root * /srv/leygo-web
    encode zstd gzip
    file_server
    @estaticos path /fonts/* /og.png /favicon.svg
    header @estaticos Cache-Control "public, max-age=31536000, immutable"
    header /index.html Cache-Control "no-cache"
}
```

## Diseño

- La página es un mapa de rutas hecho con el alfabeto del logo: línea continua = conexión fija, línea punteada índigo = una delegación en curso, amarillo = tú (tu mensaje, tu OK).
- Tipografía única: Overpass (derivada de la señalética vial Highway Gothic) y Overpass Mono solo para código.
- Colores en `:root` de `styles.css`, con variante oscura automática (`prefers-color-scheme`).
- Animaciones: entrada del logo y del titular al cargar, la demo de la portada (se pausa sola fuera de pantalla y tiene botón de pausa), la tarjeta de aprobación al tocarla y el manifiesto de Nami al aparecer. Con "reducir movimiento" activado todo se muestra quieto.

## Editar la demo

Las escenas están en `ESCENAS` al inicio de `app.js`. Cada paso es un mensaje (`msg`), una nota de ruteo (`paso`), un recorrido entre nodos (`viaje`, usando los `data-nodo` del HTML), una pausa o una aprobación (`ok`).
