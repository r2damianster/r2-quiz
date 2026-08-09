# R2 Quiz

Juego de trivia en vivo (tipo Kahoot), 100% estático, sin backend propio ni base de datos.

## Archivos

- `preguntas.json` — banco de preguntas. Editalo para tus propias trivias.
- `host.html` — pantalla del anfitrión (la proyectás o la mirás vos).
- `player.html` — pantalla de cada jugador (la abren desde su celular).
- `estilos.css` — estilos compartidos.

## Cómo funciona

- No hay servidor propio: `host.html` y `player.html` se conectan directo a **Ably**
  (servicio de pub/sub en tiempo real) desde el navegador.
- El "código de sala" es simplemente el nombre de un canal de Ably (`r2quiz-1234`).
  No hace falta registrar nada en ningún lado.
- Todo el estado del juego (puntajes, pregunta actual) vive en memoria de la
  pestaña del host mientras dura la partida. Si cerrás esa pestaña, la partida
  se pierde — no hay persistencia a propósito, para no depender de una base de datos.

## Desplegar

1. Subí esta carpeta a un repo de GitHub.
2. Importalo en Vercel (plan gratuito) como sitio estático — no necesita build step.
3. Listo: `tu-proyecto.vercel.app/host.html` y `tu-proyecto.vercel.app/player.html`.

## Usar

1. Abrí `host.html`, pegá tu **Ably API Key** y creá la sala.
2. Compartí el código de 4 dígitos que aparece en pantalla.
3. Cada jugador abre `player.html` en su celular, pega la misma API key,
   pone el código de sala y su nombre.
4. Cuando ya se unieron todos, tocás "Iniciar partida" en el host.

## Sobre la API key en el navegador

Ably usa una key visible en el código del cliente — es normal para este tipo
de apps, pero conviene saber:

- Cualquiera que abra el código fuente de tu sitio puede ver la key.
- Para uso personal/con grupos pequeños esto es aceptable.
- Si querés más control, en el dashboard de Ably podés crear una key separada
  con permisos limitados (solo `publish`/`subscribe`/`presence`, sin acceso
  de administración) y usar esa en vez de la key raíz.

## Personalizar

- **Puntaje**: la fórmula de puntos (base + bono por velocidad) está en
  `revelarRespuesta()` dentro de `host.html`.
- **Tiempo por pregunta**: campo `tiempo` (en segundos) en `preguntas.json`.
- **Colores/tipografía**: todo el sistema de diseño está en `estilos.css`
  (variables `:root` al inicio del archivo).

## Próximos pasos posibles

- Guardar el historial de partidas exportando el ranking final a un JSON
  descargable (no incluido aún, para mantener esta primera versión simple).
- Restringir la key de los jugadores a solo `subscribe`+`publish` (sin
  `presence:admin`) desde el dashboard de Ably.
