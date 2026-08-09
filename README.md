# R2 Quiz

R2 Quiz es una versión light y personal de Kahoot orientada a aulas, reuniones y actividades con logística simple.
La interfaz busca ser elegante, legible y rápida, con foco en una experiencia de trivia en vivo que no dependa de un backend grande.

## Propósito

- Facilitar partidas de trivia en vivo con un host y varios jugadores.
- Reducir la complejidad tecnológica y el costo de mantenimiento.
- Mantener la interfaz clara para uso doméstico, educativo y pequeño grupo.

## Archivos

- `preguntas.json` — banco de preguntas.
- `host.html` — pantalla del anfitrión.
- `player.html` — pantalla del jugador.
- `estilos.css` — identidad visual, responsive y refinamiento del UI.
- `api/ably-key.js` — endpoint de lectura de entorno para acceder a la API key de Ably.

## Modelo de operación

- Los clientes se conectan a Ably a través de canales privados del juego.
- La sala se identifica por un código de 4 dígitos.
- El host mantiene el estado y entrega el ranking parcial y final.
- El estado no se persiste entre sesiones.

## Privacidad y seguridad

- La clave de Ably no debe dejarse en el código fuente ni en archivos públicos.
- En Vercel se debe configurar la variable `ABLY_API_KEY`.
- El cliente solo puede obtener esa clave a través de un endpoint seguro y limitado.
- No se usan imágenes ni avatares externos. Los identificadores visuales se materializan como avatar ASCII generado por código del navegador.
- La selección de perfil se entiende como una clasificación no sensible para soporte visual: mujer, hombre y otro, si se desea.

## Flujo pensado para nightlife económica

1. El host crea la sala desde la pantalla inicial.
2. El proyecto recupera la key de Ably desde un entorno seguro.
3. Los jugadores abren la app, ingresan código, nombre y perfil.
4. El perfil desencadena una asignación aleatoria de avatar ASCII.
5. El host observa el lobby con un leaderboard inicial, antes de iniciar.
6. La pregunta se lanza en vivo, con respuesta compacta por pregunta y cálculo de ranking.
7. El leaderboard se refleja en la pantalla del host y el podio final se presenta al terminar.

## Diseño visual

La referencia visual del usuario sugiere un leaderboard con una estructura de ranking y un cierre con podio al final.
La idea es usar una composición clara, con barras de clasificación, badges de posición, avatar ASCII y una estética digital premium.

## Desplegar

1. Publicar el repo en GitHub.
2. Conectar el proyecto con Vercel.
3. Añadir la variable de entorno `ABLY_API_KEY` en Vercel.
4. Usar `/host.html` y `/player.html` como rutas de acceso.

## Mantenimiento

- Si se quiere bajar el número de mensajes en Ably se recomienda:
  - quitar presencia de movimiento de puntero o animaciones visuales de coste bajo
  - consolidar respuesta al cierre de pregunta
  - enviar resumen de ranking en vez de notificaciones de cada jugador en cada cambio
  - usar presencia mínima para saber quién está dentro

## Próximos pasos posibles

- Generar un leaderboard visual con barras, podio y animaciones suaves.
- Exportar resultados finales como JSON descargable.
- Mantener el estado del juego y la sección de historial.
- Añadir seguridad a nivel de reglas de acceso de Ably para limitar permisos.
