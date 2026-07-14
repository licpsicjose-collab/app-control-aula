# Íconos de Control de Aula — Integración

## Archivos entregados

| Archivo | Tamaño | Uso | Incluye Ψ |
|---|---|---|---|
| favicon-16.png | 16×16 | Pestaña del navegador | No |
| favicon-32.png | 32×32 | Pestaña del navegador (pantallas retina) | No |
| favicon-48.png | 48×48 | Favicon de respaldo / Windows | No |
| apple-touch-icon-180.png | 180×180 | Ícono al agregar a pantalla de inicio en iPhone | Sí |
| android-icon-192.png | 192×192 | Ícono estándar de Android (manifest.json) | Sí |
| android-icon-512.png | 512×512 | Ícono estándar de Android en alta resolución | Sí |
| android-icon-maskable-192.png | 192×192 | Ícono adaptativo con zona segura ampliada | Sí |
| android-icon-maskable-512.png | 512×512 | Ícono adaptativo con zona segura ampliada, alta resolución | Sí |

## Por qué el favicon no lleva el símbolo Ψ

A 16-32px, cualquier segundo elemento deja de leerse como forma y se convierte en una mancha de píxeles. Se decidió (confirmado en la conversación de diseño) priorizar la legibilidad del escudo principal en el favicon, y reservar el Ψ como firma para los tamaños donde sí se puede apreciar (180px en adelante) y para la pantalla de login.

## Por qué existe una versión "maskable" aparte

Android puede recortar el ícono estándar en un círculo, una gota o un cuadrado redondeado, dependiendo del fabricante del teléfono — y ese recorte puede cortar contenido que esté cerca del borde. La versión maskable deja una "zona segura" en el centro (aproximadamente el 80% del lienzo) para que el escudo y el Ψ nunca queden cortados, sin importar qué forma use el sistema operativo.

## HTML — colocar dentro de <head>

```html
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png">
<link rel="manifest" href="/manifest.json">
```

## manifest.json — para Android / PWA

```json
{
  "name": "Control de Aula",
  "short_name": "Control de Aula",
  "icons": [
    {
      "src": "/android-icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/android-icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/android-icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/android-icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "theme_color": "#1e3a8a",
  "background_color": "#f3f4f6",
  "display": "standalone"
}
```

## Nota sobre favicon.ico

No se generó un `.ico` clásico (formato multi-resolución de Windows) porque las herramientas disponibles en este entorno no incluyen un conversor a `.ico`. Los navegadores modernos aceptan perfectamente favicons en PNG mediante las etiquetas `<link>` de arriba; si necesitas específicamente un `.ico` (por ejemplo por un requisito de infraestructura antiguo), puedes generarlo subiendo `favicon-48.png` a un conversor como https://realfavicongenerator.net, ya que esta tarea no requiere ninguna herramienta más allá de conversión de formato.

## Archivos fuente (SVG editables)

Se incluyen también los 3 SVG maestros (`icono_con_psi.svg`, `icono_sin_psi.svg`, `icono_maskable.svg`) por si necesitas regenerar los PNG en otro tamaño o ajustar el color del escudo (`#1e3a8a`) o del Ψ (blanco al 55% de opacidad) en el futuro.
