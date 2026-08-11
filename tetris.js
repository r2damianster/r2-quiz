/* ---------------------------------------------------------
   Tetris de sala de espera — R2 Quiz
   Reescritura del clásico (base MIT de he-is-talha) adaptada a:
   - identidad visual de R2 Quiz (paleta y tipografías del proyecto)
   - uso en teléfono: controles táctiles además del teclado
   - convivencia con la partida: se monta y se destruye a pedido,
     sin listeners globales que sobrevivan al juego
   - sin almacenamiento del navegador, como el resto de la app
--------------------------------------------------------- */
const TetrisEspera = (function(){
  /* Pista corta y caída rápida: es un juego de espera en el teléfono, no una
     partida larga. Con 20 filas a 700 ms la pieza tardaba demasiado en bajar. */
  const COLUMNAS = 10;
  const FILAS = 16;
  const LADO = 20;                 // px por celda
  const VELOCIDAD_INICIAL = 460;   // ms por caída
  const VELOCIDAD_MINIMA = 110;
  const SALTO_POR_NIVEL = 45;      // ms que se recortan en cada nivel
  const LINEAS_POR_NIVEL = 4;

  /* Cada pieza es una lista de celdas [x, y] alrededor del origen. */
  const PIEZAS = [
    [[-1,0],[0,0],[1,0],[0,-1]],   // T
    [[-1,0],[0,0],[1,0],[2,0]],    // I
    [[-1,-1],[-1,0],[0,0],[1,0]],  // J
    [[1,-1],[-1,0],[0,0],[1,0]],   // L
    [[0,-1],[1,-1],[-1,0],[0,0]],  // S
    [[-1,-1],[0,-1],[0,0],[1,0]],  // Z
    [[0,-1],[1,-1],[0,0],[1,0]]    // O
  ];

  let contenedor = null;
  let celdas = [];          // divs fijos del tablero
  let celdasProximas = [];  // divs de la vista "siguiente"
  let tablero = [];         // COLUMNAS * FILAS, null o índice de pieza
  let piezaActual = null;
  let tipoActual = 0;
  let tipoProximo = 0;
  let bolsa = [];
  let x = 0, y = 0;
  let puntaje = 0, lineas = 0, nivel = 1;
  let velocidad = VELOCIDAD_INICIAL;
  let reloj = null;
  let enPausa = false;
  let terminado = false;
  let jugando = false;      // en reposo el tablero se ve, pero no corre ni toma el teclado
  let manejarTecla = null;

  const indice = (cx, cy) => cx + cy * COLUMNAS;
  const ocupada = (cx, cy) => tablero[indice(cx, cy)] != null;

  /* ---------- construcción del DOM ---------- */
  function construir(){
    contenedor.innerHTML = `
      <div class="tetris">
        <div class="tetris-pista">
          <div class="tetris-tablero" id="tetrisTablero"></div>
          <button class="tetris-velo" id="tetrisVelo" type="button">
            <span class="tetris-velo-icono">▶</span>
            <span class="tetris-velo-titulo" id="tetrisVeloTitulo">Tocá para jugar</span>
            <span class="tetris-velo-pista" id="tetrisVeloPista">Tetris para matar la espera</span>
          </button>
        </div>
        <div class="tetris-panel">
          <div class="tetris-dato">
            <span class="tetris-etiqueta">Puntaje</span>
            <span class="tetris-valor mono" id="tetrisPuntaje">0</span>
          </div>
          <div class="tetris-dato">
            <span class="tetris-etiqueta">Líneas</span>
            <span class="tetris-valor mono" id="tetrisLineas">0</span>
          </div>
          <div class="tetris-dato">
            <span class="tetris-etiqueta">Nivel</span>
            <span class="tetris-valor mono" id="tetrisNivel">1</span>
          </div>
          <div class="tetris-dato">
            <span class="tetris-etiqueta">Sigue</span>
            <div class="tetris-proxima" id="tetrisProxima"></div>
          </div>
          <button class="btn secondary tetris-pausa" id="tetrisPausa" type="button">Pausa</button>
        </div>
      </div>
      <div class="tetris-controles">
        <button class="tetris-tecla" data-accion="izquierda" type="button" aria-label="Izquierda">←</button>
        <button class="tetris-tecla" data-accion="rotar" type="button" aria-label="Rotar">⟳</button>
        <button class="tetris-tecla" data-accion="derecha" type="button" aria-label="Derecha">→</button>
        <button class="tetris-tecla" data-accion="bajar" type="button" aria-label="Bajar">↓</button>
        <button class="tetris-tecla ancha" data-accion="soltar" type="button" aria-label="Soltar">Soltar</button>
      </div>
      <p class="tetris-ayuda">Flechas para mover y rotar · Espacio para soltar · Esc para pausar</p>`;

    const grilla = contenedor.querySelector('#tetrisTablero');
    grilla.style.width = (COLUMNAS * LADO) + 'px';
    grilla.style.height = (FILAS * LADO) + 'px';
    celdas = [];
    for(let i = 0; i < COLUMNAS * FILAS; i++){
      const celda = document.createElement('div');
      celda.className = 'tetris-celda';
      grilla.appendChild(celda);
      celdas.push(celda);
    }

    const proxima = contenedor.querySelector('#tetrisProxima');
    celdasProximas = [];
    for(let i = 0; i < 16; i++){ // 4x4
      const celda = document.createElement('div');
      celda.className = 'tetris-celda';
      proxima.appendChild(celda);
      celdasProximas.push(celda);
    }

    contenedor.querySelector('#tetrisPausa')
      .addEventListener('click', alternarPausa);
    contenedor.querySelector('#tetrisVelo')
      .addEventListener('click', iniciar);
    contenedor.querySelectorAll('.tetris-tecla').forEach(boton => {
      boton.addEventListener('click', () => ejecutar(boton.dataset.accion));
    });
  }

  /* ---------- piezas ---------- */
  function sacarDeBolsa(){
    if(bolsa.length === 0){
      bolsa = PIEZAS.map((_, i) => i);
      for(let i = bolsa.length - 1; i > 0; i--){ // Fisher-Yates
        const j = Math.floor(Math.random() * (i + 1));
        [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]];
      }
    }
    return bolsa.pop();
  }

  function nuevaPieza(){
    tipoActual = tipoProximo;
    piezaActual = PIEZAS[tipoActual].map(celda => [...celda]);
    tipoProximo = sacarDeBolsa();
    x = Math.floor(COLUMNAS / 2) - 1;
    y = 1;
    if(choca(x, y, piezaActual)){ finDelJuego(); return; }
    pintarProxima();
  }

  function choca(nx, ny, pieza){
    return pieza.some(([cx, cy]) => {
      const px = nx + cx, py = ny + cy;
      if(px < 0 || px >= COLUMNAS || py >= FILAS) return true;
      if(py < 0) return false;
      return ocupada(px, py);
    });
  }

  /* ---------- movimiento ---------- */
  function mover(dx, dy){
    if(terminado || enPausa) return false;
    if(choca(x + dx, y + dy, piezaActual)) return false;
    x += dx; y += dy;
    pintar();
    return true;
  }

  function rotar(){
    if(terminado || enPausa || tipoActual === 6) return; // el cuadrado no rota
    const girada = piezaActual.map(([cx, cy]) => [-cy, cx]);
    // patadas laterales: permite girar pegado a la pared
    for(const desplazamiento of [0, -1, 1, -2, 2]){
      if(!choca(x + desplazamiento, y, girada)){
        piezaActual = girada;
        x += desplazamiento;
        pintar();
        return;
      }
    }
  }

  function soltar(){
    if(terminado || enPausa) return;
    while(!choca(x, y + 1, piezaActual)) y++;
    asentar();
  }

  function caer(){
    if(mover(0, 1)) return;
    asentar();
  }

  function asentar(){
    piezaActual.forEach(([cx, cy]) => {
      const py = y + cy;
      if(py >= 0) tablero[indice(x + cx, py)] = tipoActual;
    });
    sumar(10);
    limpiarLineas();
    nuevaPieza();
    pintar();
  }

  function limpiarLineas(){
    let completadas = 0;
    for(let fila = FILAS - 1; fila >= 0; fila--){
      let llena = true;
      for(let columna = 0; columna < COLUMNAS; columna++){
        if(!ocupada(columna, fila)){ llena = false; break; }
      }
      if(!llena) continue;
      tablero.splice(fila * COLUMNAS, COLUMNAS);
      tablero.unshift(...new Array(COLUMNAS).fill(null));
      completadas++;
      fila++; // la misma fila ahora tiene el contenido de arriba
    }
    if(completadas === 0) return;

    lineas += completadas;
    sumar([0, 100, 300, 500, 800][completadas] * nivel);

    const nivelNuevo = Math.floor(lineas / LINEAS_POR_NIVEL) + 1;
    if(nivelNuevo !== nivel){
      nivel = nivelNuevo;
      velocidad = Math.max(VELOCIDAD_MINIMA, VELOCIDAD_INICIAL - (nivel - 1) * SALTO_POR_NIVEL);
      reprogramar();
    }
    actualizarMarcador();
  }

  function sumar(puntos){
    puntaje += puntos;
    actualizarMarcador();
  }

  function actualizarMarcador(){
    contenedor.querySelector('#tetrisPuntaje').textContent = puntaje;
    contenedor.querySelector('#tetrisLineas').textContent = lineas;
    contenedor.querySelector('#tetrisNivel').textContent = nivel;
  }

  /* ---------- pintado ---------- */
  function pintar(){
    celdas.forEach((celda, i) => {
      celda.className = tablero[i] == null
        ? 'tetris-celda'
        : 'tetris-celda pieza tipo' + tablero[i];
    });
    if(terminado || !piezaActual) return;
    piezaActual.forEach(([cx, cy]) => {
      const px = x + cx, py = y + cy;
      if(py < 0 || py >= FILAS || px < 0 || px >= COLUMNAS) return;
      celdas[indice(px, py)].className = 'tetris-celda pieza viva tipo' + tipoActual;
    });
  }

  function pintarProxima(){
    celdasProximas.forEach(celda => { celda.className = 'tetris-celda'; });
    PIEZAS[tipoProximo].forEach(([cx, cy]) => {
      const px = cx + 1, py = cy + 2;
      const posicion = px + py * 4;
      if(celdasProximas[posicion]){
        celdasProximas[posicion].className = 'tetris-celda pieza tipo' + tipoProximo;
      }
    });
  }

  /* ---------- ciclo ---------- */
  function reprogramar(){
    clearInterval(reloj);
    if(terminado || enPausa) return;
    reloj = setInterval(caer, velocidad);
  }

  function alternarPausa(){
    if(terminado || !jugando) return;
    enPausa = !enPausa;
    contenedor.querySelector('#tetrisPausa').textContent = enPausa ? 'Seguir' : 'Pausa';
    reprogramar();
  }

  function finDelJuego(){
    terminado = true;
    jugando = false;
    clearInterval(reloj);
    mostrarVelo('▲', 'Fin del juego', `Hiciste ${puntaje} puntos · Tocá para otra`);
  }

  function mostrarVelo(icono, titulo, pista){
    const velo = contenedor.querySelector('#tetrisVelo');
    velo.querySelector('.tetris-velo-icono').textContent = icono;
    contenedor.querySelector('#tetrisVeloTitulo').textContent = titulo;
    contenedor.querySelector('#tetrisVeloPista').textContent = pista;
    velo.classList.remove('hidden');
  }

  function ejecutar(accion){
    if(!jugando) return;
    switch(accion){
      case 'izquierda': mover(-1, 0); break;
      case 'derecha':   mover(1, 0);  break;
      case 'bajar':     if(mover(0, 1)) sumar(1); break;
      case 'rotar':     rotar(); break;
      case 'soltar':    soltar(); break;
      case 'pausa':     alternarPausa(); break;
    }
  }

  /* Reposo: el tablero queda a la vista, vacío y quieto, con el velo encima. */
  function reposar(){
    tablero = new Array(COLUMNAS * FILAS).fill(null);
    puntaje = 0; lineas = 0; nivel = 1;
    velocidad = VELOCIDAD_INICIAL;
    terminado = false; enPausa = false; jugando = false;
    bolsa = [];
    piezaActual = null;
    clearInterval(reloj);
    celdasProximas.forEach(celda => { celda.className = 'tetris-celda'; });
    contenedor.querySelector('#tetrisPausa').textContent = 'Pausa';
    actualizarMarcador();
    pintar();
  }

  function iniciar(){
    reposar();
    jugando = true;
    contenedor.querySelector('#tetrisVelo').classList.add('hidden');
    tipoProximo = sacarDeBolsa();
    nuevaPieza();
    pintar();
    reprogramar();
  }

  /* ---------- API pública ---------- */
  function montar(elemento){
    if(contenedor) destruir();
    contenedor = elemento;
    construir();

    manejarTecla = (evento) => {
      const acciones = {
        ArrowLeft: 'izquierda', ArrowRight: 'derecha',
        ArrowDown: 'bajar', ArrowUp: 'rotar',
        ' ': 'soltar', Escape: 'pausa'
      };
      const accion = acciones[evento.key];
      if(!accion || !jugando) return; // en reposo las flechas siguen scrolleando la página
      evento.preventDefault();
      ejecutar(accion);
    };
    document.addEventListener('keydown', manejarTecla);

    reposar();
  }

  function destruir(){
    clearInterval(reloj);
    reloj = null;
    if(manejarTecla){
      document.removeEventListener('keydown', manejarTecla);
      manejarTecla = null;
    }
    if(contenedor) contenedor.innerHTML = '';
    contenedor = null;
    piezaActual = null;
    terminado = true;
    jugando = false;
  }

  function estaMontado(){ return contenedor !== null; }

  return { montar, destruir, estaMontado, iniciar, alternarPausa };
})();
