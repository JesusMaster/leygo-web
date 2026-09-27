/* leygo.cl: demo de rutas, tarjeta de aprobación, manifiesto que se escribe solo y botones de copiar. */
(() => {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ─── Escenas de la demo (todas son cosas que leygo hace) ─────────────────
  const ESCENAS = {
    agenda: {
      canal: 'telegram', encabezado: 'En Telegram',
      pasos: [
        { t: 'msg', de: 'tu', texto: '¿Qué tengo mañana?' },
        { t: 'viaje', de: 'telegram', a: 'coord' },
        { t: 'paso', de: 'Coordinador', a: 'Cuenta Google', texto: 'revisa tu calendario' },
        { t: 'viaje', de: 'coord', a: 'google' },
        { t: 'pausa', ms: 500 },
        { t: 'viaje', de: 'google', a: 'coord' },
        { t: 'viaje', de: 'coord', a: 'telegram' },
        { t: 'msg', de: 'leygo', texto: 'Mañana tienes tres reuniones: 09:30 comité de producto, 12:00 1:1 con Martín y 16:00 demo con un cliente. La de las 12 choca con tu bloque de foco.' },
      ],
    },
    correo: {
      canal: 'chat', encabezado: 'En el chat web',
      pasos: [
        { t: 'msg', de: 'tu', texto: 'Mándale a Camila el resumen del comité de hoy' },
        { t: 'viaje', de: 'chat', a: 'coord' },
        { t: 'paso', de: 'Coordinador', a: 'Memoria', texto: 'busca la minuta del comité' },
        { t: 'viaje', de: 'coord', a: 'memoria' },
        { t: 'viaje', de: 'memoria', a: 'coord' },
        { t: 'paso', de: 'Coordinador', a: 'Cuenta Google', texto: 'redacta el correo' },
        { t: 'viaje', de: 'coord', a: 'google' },
        { t: 'viaje', de: 'google', a: 'tu', tuyo: true },
        { t: 'ok', texto: '¿Envío el correo a Camila? Asunto: "Resumen del comité de producto"', si: 'Enviar', no: 'No enviar' },
        { t: 'viaje', de: 'tu', a: 'google', tuyo: true },
        { t: 'viaje', de: 'google', a: 'coord' },
        { t: 'viaje', de: 'coord', a: 'chat' },
        { t: 'msg', de: 'leygo', si: 'Listo, se lo envié a Camila con las tres decisiones del comité.', no: 'No lo envié. Te dejo el borrador acá por si quieres cambiar algo.' },
      ],
    },
    nami: {
      canal: 'telegram', encabezado: 'En Telegram',
      pasos: [
        { t: 'msg', de: 'tu', texto: '@nami ¿cuántas millas náuticas son 120 km?' },
        { t: 'paso', de: 'Telegram', a: '@nami', texto: 'va directo, sin pasar por el coordinador' },
        { t: 'viaje', de: 'telegram', a: 'nami' },
        { t: 'pausa', ms: 400 },
        { t: 'viaje', de: 'nami', a: 'telegram' },
        { t: 'msg', de: 'leygo', quien: 'Nami', texto: '120 km son 64,79 millas náuticas. Recuerda: 1 NM son 1,852 km.' },
      ],
    },
    alerta: {
      canal: 'webhook', encabezado: 'Llega un webhook de Sentry',
      pasos: [
        { t: 'msg', de: 'fuera', quien: 'Sentry', texto: 'Error 500 en /api/pagos: 212 eventos en 5 minutos' },
        { t: 'viaje', de: 'webhook', a: 'coord' },
        { t: 'paso', texto: 'Modo "solo si importa": el coordinador decide si vale la pena interrumpirte' },
        { t: 'pausa', ms: 1100 },
        { t: 'paso', texto: 'Pagos caído es urgente: te avisa por Telegram' },
        { t: 'viaje', de: 'coord', a: 'telegram' },
        { t: 'msg', de: 'leygo', quien: 'leygo, en Telegram', texto: 'Pagos responde con error 500 desde las 14:02: 212 eventos en 5 minutos. Te dejo el enlace al issue.' },
      ],
    },
    a2a: {
      canal: 'a2a', encabezado: 'Pregunta otro agente, por A2A',
      pasos: [
        { t: 'msg', de: 'fuera', quien: 'Agente de soporte', texto: '¿Cuándo sale la versión 4.2 de la app?' },
        { t: 'viaje', de: 'a2a', a: 'coord' },
        { t: 'paso', texto: 'Su token solo ve la memoria pública: ni tu correo ni tu calendario' },
        { t: 'paso', de: 'Coordinador', a: 'Memoria', texto: 'busca en las minutas' },
        { t: 'viaje', de: 'coord', a: 'memoria' },
        { t: 'viaje', de: 'memoria', a: 'coord' },
        { t: 'viaje', de: 'coord', a: 'a2a' },
        { t: 'msg', de: 'leygo', texto: 'La 4.2 está planificada para el 14 de octubre, según la minuta del comité de producto.' },
      ],
    },
  };
  const ORDEN = Object.keys(ESCENAS);

  // Conexiones del mapa. tipo: cable (continuo, orto), ruta (punteada, delegación), directo (punteada, curva).
  const CANALES = ['telegram', 'chat', 'webhook', 'a2a'];
  const AGENTES = ['nami', 'google', 'memoria', 'compromisos'];
  const CONEXIONES = [
    ...CANALES.map((c) => ({ de: c, a: 'coord', tipo: 'cable' })),
    ...AGENTES.filter((a) => a !== 'nami').map((a) => ({ de: 'coord', a, tipo: 'ruta' })),
    { de: 'coord', a: 'nami', tipo: 'ruta' },
    ...['google', 'compromisos'].map((a) => ({ de: a, a: 'tu', tipo: 'cable' })),
    { de: 'telegram', a: 'nami', tipo: 'directo' },
  ];

  const demo = $('#demo');
  const mapa = $('.mapa', demo);
  const svg = $('.mapa-lineas', demo);
  const lista = $('.relato-lista', demo);
  const cabRelato = $('.relato-canal', demo);
  const btnPausa = $('.pausa', demo);
  const tabs = $$('.escena', demo);
  const NS = 'http://www.w3.org/2000/svg';
  const paths = new Map(); // "de>a" → { el, tipo }

  const nodo = (id) => $(`[data-nodo="${id}"]`, mapa);
  const centro = (id) => {
    const i = $('i', nodo(id)).getBoundingClientRect();
    const m = mapa.getBoundingClientRect();
    return { x: i.left + i.width / 2 - m.left, y: i.top + i.height / 2 - m.top };
  };
  const vertical = () => matchMedia('(max-width: 640px)').matches;

  /** Codo ortogonal con esquinas redondeadas, como las líneas del logo. */
  function codo(p, q) {
    const r = 14;
    if (!vertical()) {
      const mx = (p.x + q.x) / 2, dy = Math.sign(q.y - p.y), dx = Math.sign(q.x - p.x);
      if (Math.abs(q.y - p.y) < 2) return `M${p.x},${p.y}H${q.x}`;
      const rr = Math.min(r, Math.abs(q.y - p.y) / 2, Math.abs(mx - p.x));
      return `M${p.x},${p.y}H${mx - dx * rr}Q${mx},${p.y} ${mx},${p.y + dy * rr}V${q.y - dy * rr}Q${mx},${q.y} ${mx + dx * rr},${q.y}H${q.x}`;
    }
    const my = (p.y + q.y) / 2, dx = Math.sign(q.x - p.x), dy = Math.sign(q.y - p.y);
    if (Math.abs(q.x - p.x) < 2) return `M${p.x},${p.y}V${q.y}`;
    const rr = Math.min(r, Math.abs(q.x - p.x) / 2, Math.abs(my - p.y));
    return `M${p.x},${p.y}V${my - dy * rr}Q${p.x},${my} ${p.x + dx * rr},${my}H${q.x - dx * rr}Q${q.x},${my} ${q.x},${my + dy * rr}V${q.y}`;
  }
  function curva(p, q) {
    if (!vertical()) {
      const alto = Math.min(p.y, q.y) - 70;
      return `M${p.x},${p.y}C${p.x + 60},${alto} ${q.x - 60},${alto} ${q.x},${q.y}`;
    }
    const lado = Math.min(p.x, q.x) - 40;
    return `M${p.x},${p.y}C${lado},${p.y + 40} ${lado},${q.y - 40} ${q.x},${q.y}`;
  }

  function dibujar() {
    const activos = new Set([...paths.entries()].filter(([, v]) => v.el.classList.contains('activo')).map(([k]) => k));
    svg.replaceChildren();
    paths.clear();
    const m = mapa.getBoundingClientRect();
    for (const c of CONEXIONES) {
      let p = centro(c.de);
      const q = centro(c.a);
      // Del especialista a "Tu OK" la línea sale después de la etiqueta, no a través de ella.
      if (c.a === 'tu') {
        const r = nodo(c.de).getBoundingClientRect();
        p = vertical() ? { x: p.x, y: r.bottom - m.top + 6 } : { x: r.right - m.left + 10, y: p.y };
      }
      // En móvil la etiqueta "Coordinador" queda bajo el anillo: las delegaciones salen por debajo de ella.
      if (c.de === 'coord' && vertical()) p = { x: p.x, y: nodo('coord').getBoundingClientRect().bottom - m.top + 4 };
      const el = document.createElementNS(NS, 'path');
      el.setAttribute('d', c.tipo === 'cable' ? codo(p, q) : c.tipo === 'directo' ? curva(p, q) : `M${p.x},${p.y}L${q.x},${q.y}`);
      el.setAttribute('class', c.tipo === 'cable' ? 'cable' : 'ruta');
      const k = `${c.de}>${c.a}`;
      if (activos.has(k)) el.classList.add('activo');
      svg.appendChild(el);
      paths.set(k, { el, tipo: c.tipo });
    }
    paquete = document.createElementNS(NS, 'circle');
    paquete.setAttribute('r', '8');
    paquete.setAttribute('class', 'paquete');
    paquete.style.display = 'none';
    svg.appendChild(paquete);
  }
  let paquete;

  // ─── Reloj que respeta la pausa y se cancela al cambiar de escena ─────────
  let pausado = false;
  let fuera = false; // la demo no está en pantalla
  let corrida = 0;
  const cancelada = (id) => id !== corrida;
  function avanzar(ms, id, cada) {
    return new Promise((ok, no) => {
      let t = 0, prev = performance.now();
      const tick = (ahora) => {
        if (cancelada(id)) return no('cancelada');
        const dt = ahora - prev; prev = ahora;
        if (!pausado && !fuera) t += Math.min(dt, 64);
        const f = Math.min(t / ms, 1);
        cada?.(f);
        f >= 1 ? ok() : requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  const suave = (f) => (f < .5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2);

  function marcarNodos(...ids) {
    $$('.nodo', mapa).forEach((n) => n.classList.toggle('activo', ids.includes(n.dataset.nodo)));
  }

  async function viajar(p, id) {
    const k1 = `${p.de}>${p.a}`, k2 = `${p.a}>${p.de}`;
    const inv = !paths.has(k1);
    const ruta = paths.get(inv ? k2 : k1);
    if (!ruta) return;
    ruta.el.classList.add('activo');
    marcarNodos(p.de);
    if (reducido) { marcarNodos(p.a); return; }
    const largo = ruta.el.getTotalLength();
    paquete.classList.toggle('tuyo', !!p.tuyo);
    paquete.style.display = '';
    await avanzar(Math.max(450, Math.min(1100, largo * 2.2)), id, (f) => {
      const pt = ruta.el.getPointAtLength(largo * (inv ? 1 - suave(f) : suave(f)));
      paquete.setAttribute('cx', pt.x);
      paquete.setAttribute('cy', pt.y);
    });
    paquete.style.display = 'none';
    marcarNodos(p.a);
  }

  function agregar(li) { lista.appendChild(li); return li; }
  function mensaje(p, decision) {
    const li = document.createElement('li');
    li.className = `r-msg de-${p.de}`;
    const texto = p.texto ?? (decision === 'no' ? p.no : p.si);
    if (p.quien) { const q = document.createElement('span'); q.className = 'quien'; q.textContent = p.quien; li.appendChild(q); }
    li.appendChild(document.createTextNode(texto));
    return agregar(li);
  }
  function paso(p) {
    const li = document.createElement('li');
    li.className = 'r-paso';
    if (p.de) {
      li.innerHTML = '<b></b><svg viewBox="0 0 26 8" aria-hidden="true"><line x1="1" y1="4" x2="25" y2="4"/></svg><b></b><span></span>';
      const [b1, b2] = li.querySelectorAll('b');
      b1.textContent = p.de; b2.textContent = p.a; li.querySelector('span').textContent = p.texto;
    } else li.textContent = p.texto;
    return agregar(li);
  }
  /** Tarjeta de aprobación dentro de la demo. Se aprueba sola si nadie la toca. */
  async function aprobar(p, id) {
    const li = document.createElement('li');
    li.className = 'r-ok';
    li.innerHTML = '<p></p><div class="fila"><button class="si" type="button"></button><button class="no" type="button"></button><small>Tu OK</small></div>';
    li.querySelector('p').textContent = p.texto;
    const si = li.querySelector('.si'), no = li.querySelector('.no');
    si.textContent = p.si; no.textContent = p.no;
    agregar(li);
    if (reducido) { li.classList.add('resuelto'); li.querySelector('p').textContent += ' Aprobado.'; return 'si'; }
    let decision = null;
    si.onclick = () => { decision = 'si'; };
    no.onclick = () => { decision = 'no'; };
    let t = 0; const total = 5200;
    while (!decision) {
      await avanzar(100, id);
      t += 100;
      si.style.setProperty('--espera', Math.min(t / total, 1));
      if (t >= total) decision = 'si';
    }
    li.classList.add('resuelto');
    li.querySelector('p').textContent = decision === 'si' ? 'Aprobaste el envío.' : 'Dijiste que no.';
    return decision;
  }

  async function reproducir(nombre) {
    const id = ++corrida;
    const esc = ESCENAS[nombre];
    tabs.forEach((b) => { const on = b.dataset.escena === nombre; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; b.style.setProperty('--avance', 0); });
    const tab = tabs.find((b) => b.dataset.escena === nombre);
    const barra = tab.parentElement; // deja visible la pestaña activa sin mover la página
    const izq = tab.offsetLeft - barra.offsetLeft, der = izq + tab.offsetWidth;
    if (izq < barra.scrollLeft || der > barra.scrollLeft + barra.clientWidth) barra.scrollTo({ left: izq - 8, behavior: reducido ? 'auto' : 'smooth' });
    lista.replaceChildren();
    cabRelato.innerHTML = '<i></i>';
    cabRelato.append(esc.encabezado);
    paths.forEach((v) => v.el.classList.remove('activo'));
    marcarNodos(esc.canal);
    if (paquete) paquete.style.display = 'none';
    let decision = 'si';
    try {
      await avanzar(reducido ? 0 : 350, id);
      for (let i = 0; i < esc.pasos.length; i++) {
        const p = esc.pasos[i];
        tab.style.setProperty('--avance', i / esc.pasos.length);
        if (p.t === 'msg') { mensaje(p, decision); await avanzar(reducido ? 0 : 700, id); }
        else if (p.t === 'paso') { paso(p); await avanzar(reducido ? 0 : 650, id); }
        else if (p.t === 'viaje') await viajar(p, id);
        else if (p.t === 'pausa') await avanzar(reducido ? 0 : p.ms, id);
        else if (p.t === 'ok') decision = await aprobar(p, id);
        if (decision === 'no' && p.t === 'viaje' && p.de === 'tu') {
          // Sin aprobación el correo no sale: se salta el regreso y va directo a la respuesta.
          const resto = esc.pasos.slice(i + 1).filter((x) => x.t === 'msg');
          for (const m of resto) mensaje(m, decision);
          break;
        }
      }
      tab.style.setProperty('--avance', 1);
      if (reducido) return;
      await avanzar(3200, id);
      reproducir(ORDEN[(ORDEN.indexOf(nombre) + 1) % ORDEN.length]);
    } catch (e) { if (e !== 'cancelada') throw e; }
  }

  // Pestañas: clic y flechas
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => reproducir(b.dataset.escena));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const j = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      tabs[j].focus(); reproducir(tabs[j].dataset.escena);
    });
  });
  btnPausa.addEventListener('click', () => {
    pausado = !pausado;
    btnPausa.setAttribute('aria-pressed', pausado);
    btnPausa.setAttribute('aria-label', pausado ? 'Reanudar la demostración' : 'Pausar la demostración');
  });
  if (reducido) btnPausa.hidden = true;

  // Pausa sola fuera de pantalla o con la pestaña oculta
  new IntersectionObserver(([e]) => { fuera = !e.isIntersecting; }, { threshold: .15 }).observe(demo);
  document.addEventListener('visibilitychange', () => { fuera = document.hidden; });

  let rTimer;
  addEventListener('resize', () => { clearTimeout(rTimer); rTimer = setTimeout(dibujar, 120); });

  const iniciar = () => { dibujar(); setTimeout(() => reproducir('agenda'), reducido ? 0 : 1100); };
  (document.fonts?.ready || Promise.resolve()).then(iniciar);

  // ─── Tarjeta "Nada importante sin tu OK" ─────────────────────────────────
  const tarjeta = $('.tarjeta-ok');
  const resultado = $('.tarjeta-resultado', tarjeta);
  const CHECK = '<svg viewBox="0 0 26 26" aria-hidden="true"><path class="check" d="M6 13.5l4.5 4.5L20 8.5"/></svg>';
  const EQUIS = '<svg viewBox="0 0 26 26" aria-hidden="true"><path class="check" d="M8 8l10 10M18 8 8 18"/></svg>';
  $$('.boton-tarjeta', tarjeta).forEach((b) => b.addEventListener('click', () => {
    const si = b.dataset.decision === 'si';
    const hora = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    tarjeta.dataset.estado = si ? 'si' : 'no';
    resultado.innerHTML = (si ? CHECK : EQUIS) + `<span>${si ? `Enviado a las ${hora}` : 'No se envió. El borrador queda en el chat.'}</span><button type="button">Volver a ver</button>`;
    $('button', resultado).addEventListener('click', () => { tarjeta.dataset.estado = 'esperando'; $('.boton-tarjeta.si', tarjeta).focus(); });
    $('button', resultado).focus();
  }));

  // ─── Manifiesto que se escribe al entrar en pantalla ─────────────────────
  const MANIFIESTO = [
    ['p', '{\n  '], ['k', '"name"'], ['p', ': '], ['s', '"nami"'], ['p', ',\n  '],
    ['k', '"displayName"'], ['p', ': '], ['s', '"Nami"'], ['p', ',\n  '],
    ['k', '"description"'], ['p', ': '], ['s', '"Instructora de vuelo: conversiones aeronáuticas y cálculo del descenso"'], ['p', ',\n  '],
    ['k', '"soul"'], ['p', ': '], ['s', '"Eres Nami, instructora de vuelo metódica y didáctica…"'], ['p', ',\n  '],
    ['k', '"tools"'], ['p', ': [{\n    '],
    ['k', '"name"'], ['p', ': '], ['s', '"km_a_millas_nauticas"'], ['p', ',\n    '],
    ['k', '"parameters"'], ['p', ': { '], ['k', '"km"'], ['p', ': { '], ['k', '"type"'], ['p', ': '], ['s', '"number"'], ['p', ' } },\n    '],
    ['k', '"code"'], ['p', ': '], ['s', '"return { millas_nauticas: Math.round(args.km / 1.852 * 100) / 100 };"'], ['p', ',\n    '],
    ['k', '"network"'], ['p', ': '], ['n', 'false'], ['p', ',\n    '],
    ['k', '"tests"'], ['p', ': [{ '], ['k', '"args"'], ['p', ': { '], ['k', '"km"'], ['p', ': '], ['n', '18.52'], ['p', ' }, '], ['k', '"expect"'], ['p', ': { '], ['k', '"millas_nauticas"'], ['p', ': '], ['n', '10'], ['p', ' } }]\n  }],\n  '],
    ['k', '"channels"'], ['p', ': ['], ['s', '"telegram"'], ['p', ', '], ['s', '"api"'], ['p', ']\n}'],
  ];
  const codigo = $('#manifiesto-codigo');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const pintar = (n) => {
    let quedan = n, html = '';
    for (const [c, t] of MANIFIESTO) {
      if (quedan <= 0) break;
      const trozo = t.slice(0, quedan); quedan -= trozo.length;
      html += `<span class="${c}">${esc(trozo)}</span>`;
    }
    return html;
  };
  const total = MANIFIESTO.reduce((n, [, t]) => n + t.length, 0);
  if (reducido) codigo.innerHTML = pintar(total);
  else {
    codigo.innerHTML = '<span class="cursor"></span>';
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let n = 0;
      const escribir = () => {
        n = Math.min(total, n + 5);
        codigo.innerHTML = pintar(n) + '<span class="cursor"></span>';
        if (n < total) requestAnimationFrame(escribir);
      };
      requestAnimationFrame(escribir);
    }, { threshold: .35 });
    obs.observe(codigo);
  }

  // ─── Copiar comandos ─────────────────────────────────────────────────────
  $$('.copiar').forEach((b) => b.addEventListener('click', async () => {
    const texto = b.previousElementSibling.textContent;
    try { await navigator.clipboard.writeText(texto); b.textContent = 'Copiado'; }
    catch { b.textContent = 'Selecciona y copia'; }
    b.classList.add('listo');
    setTimeout(() => { b.textContent = 'Copiar'; b.classList.remove('listo'); }, 1800);
  }));

  // ─── Modo claro / oscuro ─────────────────────────────────────────────────
  const raiz = document.documentElement;
  const btnTema = $('.tema');
  const sistemaOscuro = matchMedia('(prefers-color-scheme: dark)');
  const temaActual = () => raiz.dataset.theme || (sistemaOscuro.matches ? 'dark' : 'light');
  const pintarTema = () => {
    const oscuro = temaActual() === 'dark';
    const txt = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    btnTema.setAttribute('aria-label', txt); btnTema.title = txt;
    $('meta[name="theme-color"]').setAttribute('content', oscuro ? '#121130' : '#F2F3F9');
  };
  btnTema.addEventListener('click', () => {
    const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
    // Si coincide con el del sistema, se olvida la preferencia y vuelve a seguir al sistema.
    if (nuevo === (sistemaOscuro.matches ? 'dark' : 'light')) { delete raiz.dataset.theme; try { localStorage.removeItem('leygo-tema'); } catch {} }
    else { raiz.dataset.theme = nuevo; try { localStorage.setItem('leygo-tema', nuevo); } catch {} }
    pintarTema();
    requestAnimationFrame(dibujar); // el mapa toma los colores nuevos
  });
  sistemaOscuro.addEventListener('change', pintarTema);
  pintarTema();

  // ─── Cabecera fija: borde al bajar y sección activa ──────────────────────
  const fija = $('.cabecera-fija');
  const alBajar = () => fija.classList.toggle('con-borde', scrollY > 8);
  addEventListener('scroll', alBajar, { passive: true }); alBajar();
  const enlaces = $$('.nav a[href^="#"]');
  const secciones = enlaces.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const visibles = new Map();
  const obsSec = new IntersectionObserver((entradas) => {
    for (const e of entradas) visibles.set(e.target.id, e.isIntersecting);
    const actual = secciones.find((s) => visibles.get(s.id));
    enlaces.forEach((a) => a.classList.toggle('activo', !!actual && a.getAttribute('href') === '#' + actual.id));
  }, { rootMargin: '-45% 0px -50% 0px' });
  secciones.forEach((s) => obsSec.observe(s));

  // ─── Interfaz: pestañas de pantallas ─────────────────────────────────────
  const NOTAS = {
    chat: 'Cada respuesta muestra qué agentes trabajaron, cuánto tardó y cuánto costó. Con @nami le hablas directo a un agente tuyo.',
    compromisos: 'Lo que debes y lo que te deben, con su fuente (Meet, Gmail o Chat), fecha y un botón para escribirle a la persona.',
    agentes: 'Tus agentes, creados con IA o a mano: canales, modelo, herramientas y variables. "Probar" abre un chat directo con cada uno.',
    memoria: 'Lo que sabe de ti, lo que recuerda de reuniones y correos, y lo que te propone guardar después de leer tus conversaciones.',
  };
  const vistas = $$('.vista');
  const [imgClaro, imgOscuro] = $$('.marco-pantalla img');
  const nota = $('.vista-nota');
  function mostrarVista(b) {
    const v = b.dataset.vista;
    vistas.forEach((x) => { const on = x === b; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
    nota.textContent = NOTAS[v];
    for (const [img, tema] of [[imgClaro, 'light'], [imgOscuro, 'dark']]) {
      const src = `img/${v}-${tema}.webp`;
      if (img.getAttribute('src') === src) continue;
      const nuevo = new Image(); nuevo.src = src;
      img.classList.add('cambiando');
      const poner = () => { img.src = src; img.classList.remove('cambiando'); };
      (nuevo.decode ? nuevo.decode() : Promise.resolve()).then(() => setTimeout(poner, reducido ? 0 : 150), poner);
    }
    const alt = { chat: 'Chat de leygo con una tabla de pendientes del comité y una respuesta directa del agente Nami', compromisos: 'Lista de compromisos con estados, responsables, fechas y contexto', agentes: 'Agentes personalizados Nami, Revisor, Banano y Viajes con sus canales y herramientas', memoria: 'Memoria: Descubrir con IA, datos que leygo propone guardar e ideas' }[v];
    imgClaro.alt = imgOscuro.alt = alt;
  }
  vistas.forEach((b, i) => {
    b.addEventListener('click', () => mostrarVista(b));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const j = (i + (e.key === 'ArrowRight' ? 1 : vistas.length - 1)) % vistas.length;
      vistas[j].focus(); mostrarVista(vistas[j]);
    });
  });

  // ─── Enlaces que abren una escena de la demo ─────────────────────────────
  $$('[data-ir-escena]').forEach((a) => a.addEventListener('click', () => reproducir(a.dataset.irEscena)));

  // ─── Local: animación del túnel ──────────────────────────────────────────
  (() => {
    const caja = $('#tunel-demo');
    if (!caja) return;
    const esc = $('.tun-escenario', caja), lin = $('.tun-lineas', caja), nota = $('.tun-nota', caja);
    const sw = $('.interruptor', caja), swTxt = $('.int-texto', caja), bloqueo = $('.tun-bloqueo', caja);
    const URLS = { cloudflared: 'https://tu-agente.trycloudflare.com', ngrok: 'https://tu-agente.ngrok-free.app' };
    let prov = 'cloudflared', abierto = false, token = 0, fueraT = false;
    const P = {};
    let paq;
    const t = (id) => $(`[data-t="${id}"]`, esc);
    const rel = (el) => { const r = el.getBoundingClientRect(), m = esc.getBoundingClientRect(); return { x: r.left - m.left, y: r.top - m.top, w: r.width, h: r.height }; };
    const cen = (id) => { const r = rel($('i', t(id))); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };
    const codoT = (p, q) => {
      if (Math.abs(q.x - p.x) >= Math.abs(q.y - p.y)) { const mx = (p.x + q.x) / 2; return `M${p.x},${p.y}H${mx}V${q.y}H${q.x}`; }
      const my = (p.y + q.y) / 2; return `M${p.x},${p.y}V${my}H${q.x}V${q.y}`;
    };
    function muro() {
      const b = rel($('.tun-caja', esc)), o = cen('otro');
      if (o.x > b.x + b.w) return { x: b.x + b.w, y: Math.min(Math.max(o.y, b.y + 20), b.y + b.h - 20) };
      return { x: Math.min(Math.max(o.x, b.x + 20), b.x + b.w - 20), y: b.y + b.h };
    }
    function dibujarT() {
      lin.replaceChildren();
      const L = cen('leygo'), S = cen('servicios'), B = cen('borde'), O = cen('otro'), M = muro();
      const mk = (id, d, cls) => { const e = document.createElementNS(NS, 'path'); e.setAttribute('d', d); e.setAttribute('class', cls); lin.appendChild(e); P[id] = e; };
      mk('sal', codoT(L, S), 't-cable');
      mk('muro', `M${O.x},${O.y}L${M.x},${M.y}`, 't-muro');
      mk('tubo', codoT(L, B), 't-tubo');
      mk('borde', `M${O.x},${O.y}V${B.y}H${B.x}`, 't-cable'); // baja primero: no se confunde con el intento directo
      paq = document.createElementNS(NS, 'circle'); paq.setAttribute('r', '8'); paq.setAttribute('class', 't-paquete'); paq.style.display = 'none'; lin.appendChild(paq);
      const bw = bloqueo.offsetWidth, ew = esc.clientWidth;
      bloqueo.style.left = Math.min(Math.max(M.x, bw / 2 + 6), ew - bw / 2 - 6) + 'px'; bloqueo.style.top = M.y + 'px';
    }
    const cancel = (id) => id !== token;
    function esperar(ms, id, cada) {
      return new Promise((ok, no) => {
        let tt = 0, prev = performance.now();
        const tick = (now) => {
          if (cancel(id)) return no('cancelada');
          const dt = now - prev; prev = now;
          if (!fueraT) tt += Math.min(dt, 64);
          const f = Math.min(tt / ms, 1); cada?.(f);
          f >= 1 ? ok() : requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }
    const marcar = (...ids) => $$('.tnodo', esc).forEach((n) => n.classList.toggle('activo', ids.includes(n.dataset.t)));
    async function viaje(path, id, { inverso = false, hasta = 1, rebote = false } = {}) {
      const len = path.getTotalLength();
      paq.classList.toggle('rebote', rebote);
      if (reducido) return;
      paq.style.display = '';
      await esperar(Math.max(500, Math.min(1100, len * 2.4 * hasta)), id, (f) => {
        const k = suave(f) * hasta;
        const pt = path.getPointAtLength(len * (inverso ? 1 - k : k));
        paq.setAttribute('cx', pt.x); paq.setAttribute('cy', pt.y);
      });
      paq.style.display = 'none';
    }
    function ponerTunel(on) {
      abierto = on;
      caja.classList.toggle('abierto', on);
      sw.setAttribute('aria-pressed', on);
      swTxt.textContent = on ? 'Túnel abierto' : 'Túnel apagado';
    }
    const decir = (txt) => { nota.textContent = txt; };

    async function sinTunel(id) {
      ponerTunel(false); bloqueo.classList.remove('visible');
      decir('Telegram, Google y los modelos funcionan sin nada más: es leygo el que sale a buscarlos.');
      P.sal.classList.add('activo'); marcar('leygo');
      await viaje(P.sal, id); marcar('servicios'); await esperar(250, id);
      await viaje(P.sal, id, { inverso: true }); marcar('leygo'); P.sal.classList.remove('activo');
      await esperar(700, id);
      decir('Pero cuando el leygo de Camila intenta consultarte por A2A, no te encuentra: tu computador no tiene una dirección pública.');
      marcar('otro');
      await viaje(P.muro, id, { rebote: true, hasta: 0.96 });
      bloqueo.classList.add('visible'); marcar();
      await esperar(1900, id);
      bloqueo.classList.remove('visible');
    }
    async function conTunel(id) {
      bloqueo.classList.remove('visible');
      decir(`Abres el túnel con ${prov}. Es una conexión de salida, así que no abres puertos en tu router, y te da una URL pública.`);
      ponerTunel(true); marcar('leygo', 'borde');
      await esperar(2200, id);
      decir(`Ahora el leygo de Camila le escribe a ${URLS[prov]} con su token, y el túnel se lo entrega a tu leygo.`);
      P.borde.classList.add('activo'); marcar('otro');
      await viaje(P.borde, id); marcar('borde');
      await viaje(P.tubo, id, { inverso: true }); marcar('leygo');
      await esperar(500, id);
      decir('Tu leygo responde por el mismo camino, con solo lo que ese token puede ver.');
      await viaje(P.tubo, id); marcar('borde');
      await viaje(P.borde, id, { inverso: true }); marcar('otro');
      P.borde.classList.remove('activo');
      await esperar(2400, id);
    }
    async function ciclo() {
      const id = ++token;
      try {
        if (reducido) { ponerTunel(true); decir(`Con el túnel abierto (${prov}), tu leygo tiene una URL pública y otros agentes lo pueden consultar con un token.`); return; }
        for (;;) { await sinTunel(id); await conTunel(id); }
      } catch (e) { if (e !== 'cancelada') throw e; }
    }
    sw.addEventListener('click', async () => {
      const id = ++token;
      try { if (abierto) { await sinTunel(id); } else { await conTunel(id); } } catch (e) { if (e !== 'cancelada') throw e; }
    });
    $('.tun-repetir', caja).addEventListener('click', ciclo);
    $$('.proveedor-tunel button', caja).forEach((b) => b.addEventListener('click', () => {
      prov = b.dataset.prov;
      $$('.proveedor-tunel button', caja).forEach((x) => x.setAttribute('aria-checked', x === b));
      $('.tn-borde-nombre', caja).textContent = prov;
      $('.tn-url', caja).textContent = URLS[prov];
      for (const p of ['cloudflared', 'ngrok']) {
        $$(`.tun-texto-${p}, .tun-cmd-${p}`).forEach((el) => { el.hidden = p !== prov; });
      }
      $('.tun-env').textContent = `A2A_BASE_URL=${URLS[prov]}\nPUBLIC_BASE_URL=${URLS[prov]}`;
      requestAnimationFrame(dibujarT);
    }));
    let empezo = false;
    new IntersectionObserver(([e]) => {
      fueraT = !e.isIntersecting;
      if (e.isIntersecting && !empezo) { empezo = true; dibujarT(); ciclo(); }
    }, { threshold: .3 }).observe(caja);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(dibujarT, 120); });
    (document.fonts?.ready || Promise.resolve()).then(dibujarT);
  })();
})();
