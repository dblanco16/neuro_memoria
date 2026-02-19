(() => {
  "use strict";

  const STORAGE_CONFIG = "mt_config_v13";
  const STORAGE_RANKING = "mt_ranking_v13";
  const STORAGE_RANKING_VISIBLE = "mt_ranking_visible_v1";
  const overlay = document.getElementById("overlayCountdown");
  const countdownNumero = document.getElementById("countdownNumero");

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
    cantColores: 6,
    tiempoVisible: 3,
    permitirRepetidos: false,
    modoFondo: "light"
  };

  let config = loadConfig();

  let jugando = false;
  let fase = "memoria";
  let score = 0;

  let coloresPartida = [];
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

  /* =========================
     CONFIG
  ========================= */
  function loadConfig() {
    const raw = localStorage.getItem(STORAGE_CONFIG);
    if (!raw) return { ...CONFIG_DEFAULT };
    try {
      return { ...CONFIG_DEFAULT, ...JSON.parse(raw) };
    } catch {
      return { ...CONFIG_DEFAULT };
    }
  }

  function clampInt(n, min, max, fallback) {
    const x = parseInt(n, 10);
    if (!Number.isFinite(x)) return fallback;
    return Math.max(min, Math.min(max, x));
  }

  function aplicarConfigUI() {
    // ✅ Esto es lo que faltaba: setear inputs con la config actual
    inputTiempoTotal.value = config.tiempoTotal;
    inputLongitud.value = config.longitud;
    inputCantColores.value = config.cantColores;
    inputTiempoVisible.value = config.tiempoVisible;
    inputRepetidos.checked = !!config.permitirRepetidos;
    inputModoFondo.value = (config.modoFondo === "dark") ? "dark" : "light";
  }

  function saveConfig() {
    const tiempoTotal = clampInt(inputTiempoTotal.value, 10, 3600, CONFIG_DEFAULT.tiempoTotal);
    const cantColores = clampInt(inputCantColores.value, 3, 10, CONFIG_DEFAULT.cantColores);
    const longitud = clampInt(inputLongitud.value, 2, 20, CONFIG_DEFAULT.longitud);
    const tiempoVisible = clampInt(inputTiempoVisible.value, 1, 10, CONFIG_DEFAULT.tiempoVisible);

    config = {
      tiempoTotal,
      cantColores,
      longitud,
      tiempoVisible,
      permitirRepetidos: !!inputRepetidos.checked,
      modoFondo: (inputModoFondo.value === "dark") ? "dark" : "light"
    };

    localStorage.setItem(STORAGE_CONFIG, JSON.stringify(config));
    aplicarTema();
    aplicarConfigUI();
    actualizarTextoConfig();
  }

  function aplicarTema() {
    body.classList.remove("light", "dark");
    body.classList.add(config.modoFondo);
  }

  function actualizarTextoConfig() {
    configTexto.innerText =
      `Tiempo: ${config.tiempoTotal} seg | Secuencia: ${config.longitud} | Colores: ${config.cantColores} | Visible: ${config.tiempoVisible} seg | Repetidos: ${config.permitirRepetidos ? "Sí" : "No"} | Fondo: ${config.modoFondo === "light" ? "Blanco" : "Negro"}`;
  }

  /* =========================
     RANKING
  ========================= */
  function loadRanking() {
    const raw = localStorage.getItem(STORAGE_RANKING);
    if (!raw) return [];
    try { return JSON.parse(raw) || []; }
    catch { return []; }
  }

  function saveRanking(data) {
    localStorage.setItem(STORAGE_RANKING, JSON.stringify(data.slice(0, 10)));
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
    rankingBody.innerHTML = "";
    data.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(item.nombre)}</td><td>${item.score}</td>`;
      rankingBody.appendChild(tr);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* VISIBILIDAD RANKING */
  function loadRankingVisibility() {
    const saved = localStorage.getItem(STORAGE_RANKING_VISIBLE);
    if (saved === null) return false;
    return saved === "true";
  }

  function saveRankingVisibility(val) {
    localStorage.setItem(STORAGE_RANKING_VISIBLE, String(val));
  }

  function aplicarVisibilidadRanking() {
    const visible = chkRanking.checked;
    rankingContainer.style.display = visible ? "block" : "none";
    saveRankingVisibility(visible);
  }

  /* =========================
     UTIL
  ========================= */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

  function colorVacio() {
    return (config.modoFondo === "dark") ? "#000000" : "#FFFFFF";
  }

  /* =========================
     JUEGO
  ========================= */
  function prepararColoresPartida() {
    const cant = Math.max(3, Math.min(config.cantColores, PALETA_BASE.length));
    coloresPartida = shuffle(PALETA_BASE).slice(0, cant);
  }

  function generarSecuencia() {
    secuencia = [];
    const disp = [...coloresPartida];

    if (!config.permitirRepetidos && config.longitud > disp.length) {
      return false;
    }

    for (let i = 0; i < config.longitud; i++) {
      const r = Math.floor(Math.random() * disp.length);
      secuencia.push(disp[r]);
      if (!config.permitirRepetidos) disp.splice(r, 1);
    }
    return true;
  }

  function dibujarFilaVacia(contenedor, largo) {
    contenedor.innerHTML = "";
    for (let i = 0; i < largo; i++) {
      const div = document.createElement("div");
      div.className = "cuadro";
      div.style.background = colorVacio();
      contenedor.appendChild(div);
    }
  }

  function mostrarSecuencia() {
    secuencia.forEach((c, i) => {
      filaSecuencia.children[i].style.background = c;
    });
  }

  function crearTablero() {
    tablero.innerHTML = "";
    coloresPartida.forEach(color => {
      const div = document.createElement("div");
      div.className = "cuadro colorBtn";
      div.style.background = color;
      div.addEventListener("click", () => seleccionarColor(color));
      tablero.appendChild(div);
    });
  }

  /* BORRADO MOBILE (FIABLE) */
  function attachDeleteGestures(cell, index) {
    // Desktop
    cell.addEventListener("dblclick", (e) => {
      e.preventDefault();
      eliminarColor(index);
    });

    // Mobile: doble tap + long press
    let lastTapTime = 0;
    let longPressTimer = null;

    cell.addEventListener("touchstart", () => {
      longPressTimer = setTimeout(() => {
        eliminarColor(index);
      }, 450);
    }, { passive: true });

    cell.addEventListener("touchend", () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      const now = Date.now();
      if (now - lastTapTime < 320) {
        eliminarColor(index);
        lastTapTime = 0;
      } else {
        lastTapTime = now;
      }
    }, { passive: true });

    cell.addEventListener("touchmove", () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }, { passive: true });

    cell.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function renderJugador() {
    dibujarFilaVacia(filaJugador, config.longitud);

    inputJugador.forEach((c, i) => {
      const cell = filaJugador.children[i];
      cell.style.background = c;
      attachDeleteGestures(cell, i);
    });
  }

  function seleccionarColor(color) {
    if (!jugando || fase !== "respuesta") return;
    if (inputJugador.length >= config.longitud) return;

    inputJugador.push(color);
    renderJugador();

    if (inputJugador.length === secuencia.length) validar();
  }

  function eliminarColor(index) {
    if (!jugando || fase !== "respuesta") return;
    if (index < 0 || index >= inputJugador.length) return;

    inputJugador.splice(index, 1);
    renderJugador();
  }

  function validar() {
    const correcta = secuencia.every((v, i) => v === inputJugador[i]);
    if (correcta) {
      score++;
      puntajeSpan.innerText = String(score);
    }
    iniciarRonda();
  }

  function iniciarRonda() {
    fase = "memoria";

    if (!generarSecuencia()) {
      alert("Configuración inválida: sin repetidos, la longitud no puede superar la cantidad de colores.");
      detenerJuego(true);
      return;
    }

    dibujarFilaVacia(filaSecuencia, config.longitud);
    dibujarFilaVacia(filaJugador, config.longitud);
    crearTablero();

    // Ocultar durante memoria
    filaJugador.style.visibility = "hidden";
    tablero.style.visibility = "hidden";

    mostrarSecuencia();

    setTimeout(() => {
      dibujarFilaVacia(filaSecuencia, config.longitud);
      fase = "respuesta";
      inputJugador = [];
      renderJugador();

      filaJugador.style.visibility = "visible";
      tablero.style.visibility = "visible";
    }, config.tiempoVisible * 1000);
  }

  function iniciarTimer() {
    tiempoFin = Date.now() + config.tiempoTotal * 1000;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const restante = Math.max(0, Math.ceil((tiempoFin - Date.now()) / 1000));
      tiempoSpan.innerText = String(restante);
      if (restante <= 0) detenerJuego(true);
    }, 250);
  }

	function iniciarJuego() {
	  if (jugando) return;

	  jugando = true;
	  fase = "memoria";
	  score = 0;

	  puntajeSpan.innerText = "0";
	  btnAccion.innerText = "Detener";

	  btnToggleConfig.disabled = true;
	  nombreInput.disabled = true;

	  prepararColoresPartida();

	  iniciarCuentaRegresiva();
	}

  function detenerJuego(guardar) {
    jugando = false;
    fase = "memoria";

    clearInterval(timerInterval);
    timerInterval = null;

    btnAccion.innerText = "Iniciar";
    btnToggleConfig.disabled = false;
    nombreInput.disabled = false;

    filaJugador.style.visibility = "visible";
    tablero.style.visibility = "visible";

    if (guardar) agregarRanking(score);
  }

	function iniciarCuentaRegresiva() {
	  let contador = 3;

	  overlay.classList.remove("oculto");
	  countdownNumero.innerText = contador;

	  const intervalo = setInterval(() => {
		contador--;

		if (contador > 0) {
		  countdownNumero.innerText = contador;
		} else {
		  clearInterval(intervalo);
		  overlay.classList.add("oculto");

		  iniciarTimer();
		  iniciarRonda();
		}
	  }, 1000);
	}

  /* =========================
     EVENTOS UI
  ========================= */
  btnAccion.addEventListener("click", () => {
    if (jugando) detenerJuego(true);
    else iniciarJuego();
  });

  btnToggleConfig.addEventListener("click", () => {
    if (jugando) return;

    // ✅ IMPORTANTÍSIMO: cuando abrís configuración, precargar inputs actuales
    aplicarConfigUI();

    configPanel.classList.toggle("oculto");
  });

  btnGuardarConfig.addEventListener("click", () => {
    if (jugando) return;
    saveConfig();
    configPanel.classList.add("oculto");
  });

  chkRanking.addEventListener("change", aplicarVisibilidadRanking);

  /* =========================
     INIT
  ========================= */
  aplicarTema();
  aplicarConfigUI();
  actualizarTextoConfig();
  renderRanking();

  chkRanking.checked = loadRankingVisibility();
  aplicarVisibilidadRanking();

})();
