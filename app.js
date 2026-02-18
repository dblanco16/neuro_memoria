(() => {
  "use strict";

  const STORAGE_CONFIG = "mt_config_v13";
  const STORAGE_RANKING = "mt_ranking_v13";
  const STORAGE_RANKING_VISIBLE = "mt_ranking_visible_v1";

  const PALETA_BASE = [
    "#FF0000",
    "#FF8C00",
    "#084808",
    "#FFFF00",
    "#9370D8",
    "#0000FF",
    "#FFB6C1",
    "#989898",
    "#34bbe9",
    "#8B4513"
  ];

  const CONFIG_DEFAULT = {
    tiempoTotal: 30,
    longitud: 4,
    cantColores: 4,
    tiempoVisible: 3,
    permitirRepetidos: false,
    modoFondo: "light"
  };

  let config = loadConfig();

  let jugando = false;
  let fase = "memoria";
  let score = 0;

  let coloresPartida = [];
  let coloresPartidaSet = null;

  let secuencia = [];
  let inputJugador = [];

  let timerInterval = null;
  let tiempoFin = 0;

  /* DOM */
  const body = document.body;

  const filaSecuencia = document.getElementById("filaSecuencia");
  const filaJugador = document.getElementById("filaJugador");
  const tablero = document.getElementById("tableroColores");

  const nombreInput = document.getElementById("nombre");
  const tiempoSpan = document.getElementById("tiempo");
  const puntajeSpan = document.getElementById("puntaje");

  const configTexto = document.getElementById("configTexto");
  const configPanel = document.getElementById("configPanel");

  const btnAccion = document.getElementById("btnAccion");
  const btnToggleConfig = document.getElementById("btnToggleConfig");
  const btnGuardarConfig = document.getElementById("btnGuardarConfig");

  const rankingBody = document.getElementById("ranking");
  const rankingContainer = document.getElementById("rankingContainer");
  const chkRanking = document.getElementById("chkRanking");

  const inputTiempoTotal = document.getElementById("tiempoTotal");
  const inputLongitud = document.getElementById("longitud");
  const inputCantColores = document.getElementById("cantColores");
  const inputTiempoVisible = document.getElementById("tiempoVisible");
  const inputRepetidos = document.getElementById("permitirRepetidos");
  const inputModoFondo = document.getElementById("modoFondo");

  /* CONFIG */
  function loadConfig() {
    const raw = localStorage.getItem(STORAGE_CONFIG);
    if (!raw) return CONFIG_DEFAULT;
    try { return { ...CONFIG_DEFAULT, ...JSON.parse(raw) }; }
    catch { return CONFIG_DEFAULT; }
  }

  function saveConfig() {
    config = {
      tiempoTotal: parseInt(inputTiempoTotal.value) || CONFIG_DEFAULT.tiempoTotal,
      longitud: parseInt(inputLongitud.value) || CONFIG_DEFAULT.longitud,
      cantColores: parseInt(inputCantColores.value) || CONFIG_DEFAULT.cantColores,
      tiempoVisible: parseInt(inputTiempoVisible.value) || CONFIG_DEFAULT.tiempoVisible,
      permitirRepetidos: inputRepetidos.checked,
      modoFondo: inputModoFondo.value
    };

    localStorage.setItem(STORAGE_CONFIG, JSON.stringify(config));
    aplicarTema();
    actualizarTextoConfig();
  }

  function aplicarTema() {
    body.classList.remove("light","dark");
    body.classList.add(config.modoFondo);
  }

  function actualizarTextoConfig() {
    configTexto.innerText =
      `Tiempo: ${config.tiempoTotal}s | Secuencia: ${config.longitud} | Colores: ${config.cantColores}`;
  }

  /* RANKING */
  function loadRanking() {
    const raw = localStorage.getItem(STORAGE_RANKING);
    if (!raw) return [];
    return JSON.parse(raw);
  }

  function saveRanking(data) {
    localStorage.setItem(STORAGE_RANKING, JSON.stringify(data.slice(0,10)));
  }

  function agregarRanking(scoreFinal) {
    const nombre = (nombreInput.value.trim() || "anonimo");
    const data = loadRanking();
    data.unshift({ nombre, score: scoreFinal });
    saveRanking(data);
    renderRanking();
  }

  function renderRanking() {
    const data = loadRanking();
    rankingBody.innerHTML="";
    data.forEach(item=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${item.nombre}</td><td>${item.score}</td>`;
      rankingBody.appendChild(tr);
    });
  }

  /* VISIBILIDAD RANKING */
  function loadRankingVisibility(){
    const saved = localStorage.getItem(STORAGE_RANKING_VISIBLE);
    if(saved === null) return true;
    return saved === "true";
  }

  function saveRankingVisibility(val){
    localStorage.setItem(STORAGE_RANKING_VISIBLE, val);
  }

  function aplicarVisibilidadRanking(){
    const visible = chkRanking.checked;
    rankingContainer.style.display = visible ? "block" : "none";
    saveRankingVisibility(visible);
  }

  /* UTIL */
  function shuffle(arr) {
    return [...arr].sort(()=>Math.random()-0.5);
  }

  function colorVacio() {
    return (config.modoFondo==="dark")?"#000000":"#FFFFFF";
  }

  /* PALETA FIJA */
  function prepararColoresPartida(){
    coloresPartida = shuffle(PALETA_BASE).slice(0,config.cantColores);
    coloresPartidaSet = new Set(coloresPartida);
  }

  function generarSecuencia(){
    secuencia=[];
    const disp=[...coloresPartida];
    for(let i=0;i<config.longitud;i++){
      const r=Math.floor(Math.random()*disp.length);
      secuencia.push(disp[r]);
      if(!config.permitirRepetidos) disp.splice(r,1);
    }
    return true;
  }

  function dibujarFilaVacia(contenedor,largo){
    contenedor.innerHTML="";
    for(let i=0;i<largo;i++){
      const div=document.createElement("div");
      div.className="cuadro";
      div.style.background=colorVacio();
      contenedor.appendChild(div);
    }
  }

  function mostrarSecuencia(){
    secuencia.forEach((c,i)=>{
      filaSecuencia.children[i].style.background=c;
    });
  }

  function crearTablero(){
    tablero.innerHTML="";
    coloresPartida.forEach(color=>{
      const div=document.createElement("div");
      div.className="cuadro colorBtn";
      div.style.background=color;
      div.addEventListener("click",()=>seleccionarColor(color));
      tablero.appendChild(div);
    });
  }

  function renderJugador(){
    dibujarFilaVacia(filaJugador,config.longitud);
    inputJugador.forEach((c,i)=>{
      filaJugador.children[i].style.background=c;
    });
  }

  function seleccionarColor(color){
    if(!jugando || fase!=="respuesta") return;
    if(inputJugador.length>=config.longitud) return;
    inputJugador.push(color);
    renderJugador();
    if(inputJugador.length===secuencia.length) validar();
  }

  function validar(){
    const correcta = secuencia.every((v,i)=>v===inputJugador[i]);
    if(correcta){
      score++;
      puntajeSpan.innerText=score;
    }
    iniciarRonda();
  }

  function iniciarRonda(){
    fase="memoria";
    generarSecuencia();

    dibujarFilaVacia(filaSecuencia,config.longitud);
    dibujarFilaVacia(filaJugador,config.longitud);
    crearTablero();

    filaJugador.style.visibility="hidden";
    tablero.style.visibility="hidden";

    mostrarSecuencia();

    setTimeout(()=>{
      dibujarFilaVacia(filaSecuencia,config.longitud);
      fase="respuesta";
      inputJugador=[];
      filaJugador.style.visibility="visible";
      tablero.style.visibility="visible";
    },config.tiempoVisible*1000);
  }

  function iniciarTimer(){
    tiempoFin=Date.now()+config.tiempoTotal*1000;
    timerInterval=setInterval(()=>{
      const restante=Math.max(0,Math.ceil((tiempoFin-Date.now())/1000));
      tiempoSpan.innerText=restante;
      if(restante<=0) detenerJuego(true);
    },250);
  }

  function iniciarJuego(){
    jugando=true;
    score=0;
    puntajeSpan.innerText=0;
    prepararColoresPartida();
    btnAccion.innerText="Detener";
    iniciarTimer();
    iniciarRonda();
  }

  function detenerJuego(guardar){
    jugando=false;
    clearInterval(timerInterval);
    btnAccion.innerText="Iniciar";
    if(guardar) agregarRanking(score);
  }

  /* EVENTOS */
  btnAccion.addEventListener("click",()=>{
    if(jugando) detenerJuego(true);
    else iniciarJuego();
  });

  btnToggleConfig.addEventListener("click",()=>{
    if(!jugando) configPanel.classList.toggle("oculto");
  });

  btnGuardarConfig.addEventListener("click",()=>{
    saveConfig();
    configPanel.classList.add("oculto");
  });

  chkRanking.addEventListener("change",aplicarVisibilidadRanking);

  /* INIT */
  aplicarTema();
  actualizarTextoConfig();
  renderRanking();

  chkRanking.checked = loadRankingVisibility();
  aplicarVisibilidadRanking();

})();
