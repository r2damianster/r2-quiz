
/* ---------- Estado global ---------- */
let ably, channel;
let preguntas = [];
let indicePregunta = -1;
let jugadores = new Map();      // clientId -> { nombre, puntaje }
let respuestasPregunta = new Map(); // clientId -> { opcion, ms }
let tiempoInicioPregunta = 0;
let temporizador = null;
let segundosTotales = 0;

const $ = (id) => document.getElementById(id);

function mostrarPantalla(id){
  ['pantalla-setup','pantalla-lobby','pantalla-pregunta','pantalla-revelacion','pantalla-final']
    .forEach(p => $(p).classList.toggle('hidden', p !== id));
}

function generarCodigoSala(){
  return Math.floor(1000 + Math.random()*9000).toString();
}

async function obtenerApiKey(){
  try {
    const resp = await fetch('/api/ably-key');
    if (!resp.ok) {
      throw new Error('No se pudo obtener la API key del entorno seguro.');
    }
    const data = await resp.json();
    if (!data.ok || !data.key) {
      throw new Error('La API key de Ably no está disponible.');
    }
    return data.key;
  } catch (err) {
    $('setupEstado').textContent = 'Error cargando Ably: ' + err.message;
    $('setupEstado').className = 'estado error';
    return null;
  }
}

/* ---------- 1. Crear sala ---------- */
$('btnCrearSala').addEventListener('click', async () => {
  const key = await obtenerApiKey();
  if(!key){ return; }

  const ruta = $('archivoPreguntas').value.trim() || 'preguntas.json';

  try {
    const resp = await fetch(ruta);
    if(!resp.ok) throw new Error('No se pudo leer ' + ruta);
    const data = await resp.json();
    preguntas = data.preguntas || [];
    if(preguntas.length === 0) throw new Error('El JSON no tiene preguntas.');
  } catch(err){
    $('setupEstado').textContent = 'Error cargando preguntas: ' + err.message;
    $('setupEstado').className = 'estado error';
    return;
  }

  const codigo = generarCodigoSala();
  ably = new Ably.Realtime({ key, clientId: 'host-' + codigo });
  channel = ably.channels.get('r2quiz-' + codigo);

  ably.connection.on('connected', () => {
    $('codigoSala').innerHTML = codigo.split('').map(d => `<span class="digit">${d}</span>`).join('');
    mostrarPantalla('pantalla-lobby');
    escucharPresencia();
    escucharRespuestas();
  });
  ably.connection.on('failed', (e) => {
    $('setupEstado').textContent = 'No se pudo conectar a Ably: revisá la API key.';
    $('setupEstado').className = 'estado error';
  });
});

/* ---------- 2. Lobby: presencia de jugadores ---------- */
function escucharPresencia(){
  channel.presence.subscribe(['enter','leave'], () => {
    channel.presence.get((err, miembros) => {
      if(err) return;
      jugadores.clear();
      miembros.forEach(m => {
        if(!m.clientId.startsWith('host-')){
          jugadores.set(m.clientId, {
            nombre: m.data?.nombre || m.clientId,
            avatar: m.data?.avatar || '(▰)',
            genero: m.data?.genero || 'otro',
            puntaje: jugadores.get(m.clientId)?.puntaje || 0
          });
        }
      });
      $('contadorJugadores').textContent = jugadores.size;
      $('listaJugadores').innerHTML = [...jugadores.values()].map(j => `<li><span class="jugador-avatar">${j.avatar}</span> ${j.nombre}</li>`).join('');
      $('btnIniciarJuego').disabled = jugadores.size === 0;
    });
  });
}

$('btnIniciarJuego').addEventListener('click', () => {
  indicePregunta = -1;
  siguientePregunta();
});

/* ---------- 3. Ciclo de preguntas ---------- */
function siguientePregunta(){
  indicePregunta++;
  if(indicePregunta >= preguntas.length){
    mostrarResultadosFinales();
    return;
  }
  const p = preguntas[indicePregunta];
  respuestasPregunta.clear();
  segundosTotales = p.tiempo || 15;

  $('preguntaContador').textContent = `Pregunta ${indicePregunta+1} de ${preguntas.length}`;
  $('textoPregunta').textContent = p.pregunta;
  $('opcionesHost').innerHTML = p.opciones.map((op,i) =>
    `<div class="opcion-btn" data-i="${i}">${op}</div>`).join('');
  $('conteoRespuestas').textContent = '0';
  $('totalJugadores').textContent = jugadores.size;

  tiempoInicioPregunta = Date.now();
  channel.publish('pregunta', {
    index: indicePregunta,
    pregunta: p.pregunta,
    opciones: p.opciones,
    tiempo: segundosTotales
  });

  mostrarPantalla('pantalla-pregunta');
  iniciarCuentaAtras(segundosTotales);
});

function iniciarCuentaAtras(segundos){
  clearInterval(temporizador);
  const circunf = 226;
  let restante = segundos;
  $('segundosRestantes').textContent = restante;
  $('anilloTiempo').style.strokeDashoffset = 0;

  temporizador = setInterval(() => {
    restante--;
    $('segundosRestantes').textContent = Math.max(restante,0);
    const pct = Math.max(restante,0) / segundos;
    $('anilloTiempo').style.strokeDashoffset = circunf * (1 - pct);
    if(restante <= 0){
      clearInterval(temporizador);
      revelarRespuesta();
    }
  }, 1000);
}

function escucharRespuestas(){
  channel.subscribe('respuesta', (msg) => {
    const { clientId, opcion } = msg.data;
    if(respuestasPregunta.has(clientId)) return; // solo la primera respuesta cuenta
    respuestasPregunta.set(clientId, { opcion, ms: Date.now() - tiempoInicioPregunta });
    $('conteoRespuestas').textContent = respuestasPregunta.size;
    if(respuestasPregunta.size >= jugadores.size && jugadores.size > 0){
      clearInterval(temporizador);
      revelarRespuesta();
    }
  });
}

$('btnRevelar').addEventListener('click', () => {
  clearInterval(temporizador);
  revelarRespuesta();
});

function revelarRespuesta(){
  const p = preguntas[indicePregunta];

  // calcular puntajes: 1000 base + bono por velocidad, solo si es correcta
  respuestasPregunta.forEach((r, clientId) => {
    const jugador = jugadores.get(clientId);
    if(!jugador) return;
    if(r.opcion === p.correcta){
      const bonoVelocidad = Math.max(0, 1 - r.ms / ((p.tiempo||15)*1000));
      jugador.puntaje += Math.round(500 + 500 * bonoVelocidad);
    }
  });

  // marcar visualmente en la pantalla del host
  document.querySelectorAll('#opcionesHost .opcion-btn').forEach(btn => {
    const i = Number(btn.dataset.i);
    btn.classList.toggle('correcta', i === p.correcta);
  });

  channel.publish('reveal', {
    correcta: p.correcta,
    opcionesTexto: p.opciones[p.correcta],
    puntajes: [...jugadores.entries()].map(([clientId, j]) => ({ clientId, nombre: j.nombre, puntaje: j.puntaje }))
  });

  $('respuestaCorrectaTexto').textContent = `Correcta: ${p.opciones[p.correcta]}`;
  const ranking = [...jugadores.values()].sort((a,b) => b.puntaje - a.puntaje);
  $('rankingParcial').innerHTML = ranking.map((j,i) =>
    `<li class="leaderboard-row">
      <span class="leaderboard-main">
        <span class="leaderboard-rank">${i+1}</span>
        <span class="leaderboard-avatar">${j.avatar || '(▰)'}</span>
        <span class="leaderboard-name">${j.nombre}</span>
      </span>
      <span class="mono leaderboard-score">${j.puntaje}</span>
    </li>`).join('');

  mostrarPantalla('pantalla-revelacion');
}

$('btnSiguiente').addEventListener('click', siguientePregunta);

function renderPodio(ranking){
  const top = ranking.slice(0, 3);
  const posiciones = [2, 1, 3];
  const podio = posiciones.map((pos, idx) => {
    const jugador = top.find(j => Number(j.puntaje) >= 0) || ranking[0];
    const candidate = ranking[pos - 1] || top[idx] || { nombre: '—', avatar: '(▰)', puntaje: 0 };
    return `<article class="podio-slot podio-${pos}">
      <span class="podio-label">Puesto ${pos}</span>
      <span class="podio-avatar">${candidate.avatar || '(▰)'}</span>
      <span class="podio-name">${candidate.nombre || 'Sin jugador'}</span>
      <span class="mono podio-score">${candidate.puntaje || 0}</span>
    </article>`;
  }).join('');

  $('podioFinal').innerHTML = podio;
}

function mostrarResultadosFinales(){
  const ranking = [...jugadores.values()].sort((a,b) => b.puntaje - a.puntaje);
  renderPodio(ranking);
  $('rankingFinal').innerHTML = ranking.map((j,i) =>
    `<li class="leaderboard-row">
      <span class="leaderboard-main">
        <span class="leaderboard-rank">${i+1}</span>
        <span class="leaderboard-avatar">${j.avatar || '(▰)'}</span>
        <span class="leaderboard-name">${j.nombre}</span>
      </span>
      <span class="mono leaderboard-score">${j.puntaje}</span>
    </li>`).join('');
  channel.publish('fin', { puntajes: ranking });
  mostrarPantalla('pantalla-final');
}
