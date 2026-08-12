# CLAUDE.md — R2 Quiz Light

## Propósito
R2 Quiz es una versión ligera y personal de Kahoot para partidas puntuales, en vivo y sin persistencia de servidor.
Esta versión prioriza:
- experiencia estática y rápida
- despliegue simple en Vercel
- coordinación con Ably para eventos en vivo
- privacidad por diseño
- baja fricción para uso grupal y educativo

## Arquitectura
- `host.html` es la consola del anfitrión.
- `player.html` es la interfaz del participante.
- `preguntas.json` es el banco de preguntas.
- `estilos.css` contiene la identidad visual.

## Reglas de privacidad y seguridad
- No se deben guardar secretos en archivos HTML, CSS, JS ni en commits públicos.
- La clave de Ably se configura en Vercel como `ABLY_API_KEY` mediante variables de entorno.
- El frontend solo consume un endpoint seguro o una API de lectura limitada.
- No se publican imágenes externas ni URLs de terceros para identificar avatares.
- No se usa almacenamiento del navegador para guardar datos de partida.

## Modelo de identidad
- Cada jugador declara su nombre antes de entrar a la sala.
- El jugador elige su avatar de un catálogo largo de emojis, sin imágenes ni URLs externas.
- Al entrar, si el emoji elegido ya está tomado en la sala, el navegador lo corre a uno libre para que nadie se confunda en el marcador.
- El avatar se entrega al host por presencia y se renderiza en el leaderboard y en el podio.

## Contención de tráfico en Ably
- La aplicación no debe publicar respuestas por pregunta como una secuencia ilimitada de mensajes.
- La intención es enviar mensajes de inicio, selección y resultados finales de forma compacta.
- El host debe agrupar y resumir cada respuesta cuando llegue a la vista del ranking.
- Si la sala crece, se recomienda limitar eventos por jugador y consolidar respuestas de una sola pregunta.

## Dirección visual
- La interfaz debe sentirse premium, legible y cálida.
- El leaderboard debe parecer un tablero dinámico con podio y clasificación compacta.
- El podio final debe acompañar al ganador y al ranking completo.
- Se debe evitar sobrecarga visual de imágenes o iconografía pesada.
