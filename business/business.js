// leygo.cl/business: tema, precios por puesto (USD/CLP), prueba gratis y compra.
// Los precios y la pasarela los decide licencias.leygo.cl; aquí solo se muestran y se piden.
(() => {
  'use strict';
  const API = 'https://licencias.leygo.cl';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const raiz = document.documentElement;

  // ─── Tema (igual que la portada) ───────────────────────
  const btnTema = $('.tema');
  const sistemaOscuro = matchMedia('(prefers-color-scheme: dark)');
  const temaActual = () => raiz.dataset.theme || (sistemaOscuro.matches ? 'dark' : 'light');
  const pintarTema = () => {
    const oscuro = temaActual() === 'dark';
    const t = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    btnTema?.setAttribute('aria-label', t); btnTema?.setAttribute('title', t);
    $('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#121130' : '#F2F3F9');
  };
  btnTema?.addEventListener('click', () => {
    const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
    if (nuevo === (sistemaOscuro.matches ? 'dark' : 'light')) { delete raiz.dataset.theme; try { localStorage.removeItem('leygo-tema'); } catch {} }
    else { raiz.dataset.theme = nuevo; try { localStorage.setItem('leygo-tema', nuevo); } catch {} }
    pintarTema();
  });
  sistemaOscuro.addEventListener('change', pintarTema);
  pintarTema();
  const fija = $('.cabecera-fija');
  const alBajar = () => fija?.classList.toggle('con-borde', scrollY > 8);
  addEventListener('scroll', alBajar, { passive: true }); alBajar();

  // ─── Precios ───────────────────────────────────────────
  // Valores por defecto; licencias.leygo.cl/v1/precios manda los vigentes.
  const precios = { USD: 9, CLP: 8900, minimo: 1, maximo: 500 };
  const enChile = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/Santiago' || /-CL$/i.test(navigator.language); } catch { return false; } })();
  let moneda = enChile ? 'CLP' : 'USD';
  try { const m = localStorage.getItem('leygo-moneda'); if (m === 'USD' || m === 'CLP') moneda = m; } catch {}
  const inPuestos = $('#puestos');
  const fmt = (n, mon) => mon === 'CLP' ? '$' + Math.round(n).toLocaleString('es-CL') : 'US$' + (Number.isInteger(n) ? n : n.toFixed(2));
  const puestos = () => Math.min(precios.maximo, Math.max(precios.minimo, Math.round(Number(inPuestos.value) || precios.minimo)));
  const pintarPrecio = () => {
    for (const b of $$('.moneda button')) b.setAttribute('aria-checked', String(b.dataset.moneda === moneda));
    $('#precio-cifra').textContent = fmt(precios[moneda], moneda);
    $('#precio-nota').textContent = moneda === 'CLP'
      ? 'Más IVA. Pagas con tarjeta de crédito o débito a través de Mercado Pago.'
      : 'Más impuestos según tu país. Pagas con tarjeta a través de Paddle, que emite el recibo.';
    $('#total').textContent = fmt(precios[moneda] * puestos(), moneda);
    const r = $('#resumen-compra');
    if (r) r.textContent = `${puestos()} ${puestos() === 1 ? 'puesto' : 'puestos'} · ${fmt(precios[moneda] * puestos(), moneda)} al mes${moneda === 'CLP' ? ' + IVA' : ''} · ${moneda === 'CLP' ? 'Mercado Pago' : 'Paddle'}`;
  };
  for (const b of $$('.moneda button')) b.addEventListener('click', () => { moneda = b.dataset.moneda; try { localStorage.setItem('leygo-moneda', moneda); } catch {} pintarPrecio(); });
  for (const b of $$('.stepper button')) b.addEventListener('click', () => { inPuestos.value = String(Math.min(precios.maximo, Math.max(precios.minimo, puestos() + Number(b.dataset.paso)))); pintarPrecio(); });
  inPuestos.addEventListener('input', pintarPrecio);
  inPuestos.addEventListener('change', () => { inPuestos.value = String(puestos()); pintarPrecio(); });
  pintarPrecio();
  fetch(`${API}/v1/precios`).then((r) => (r.ok ? r.json() : null)).then((p) => {
    if (!p) return;
    if (Number(p.USD) > 0) precios.USD = Number(p.USD);
    if (Number(p.CLP) > 0) precios.CLP = Number(p.CLP);
    if (Number(p.maximo) > 0) { precios.maximo = Number(p.maximo); inPuestos.max = String(p.maximo); }
    pintarPrecio();
  }).catch(() => {});

  // ─── Formularios ───────────────────────────────────────
  const estado = (form, texto, tipo = '') => { const e = $('.form-estado', form); e.textContent = texto; e.className = 'form-estado' + (tipo ? ' ' + tipo : ''); };
  const validar = (form) => {
    let ok = true;
    for (const i of $$('input[required]', form)) {
      const bien = i.value.trim() && (i.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value.trim()));
      i.setAttribute('aria-invalid', String(!bien));
      if (!bien && ok) { i.focus(); ok = false; }
    }
    return ok;
  };
  const enviar = async (ruta, datos) => {
    const r = await fetch(`${API}${ruta}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(datos) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'No pudimos procesarlo. Prueba en un rato.');
    return j;
  };

  // Prueba gratis
  const fPrueba = $('#form-prueba');
  fPrueba?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!validar(fPrueba)) { estado(fPrueba, 'Completa los tres campos.', 'mal'); return; }
    const d = Object.fromEntries(new FormData(fPrueba));
    const b = $('button[type="submit"]', fPrueba);
    b.disabled = true; estado(fPrueba, 'Enviando…');
    try {
      const r = await enviar('/v1/prueba', d);
      estado(fPrueba, r.mensaje || `Listo: revisa ${d.email}. El código llega en un par de minutos.`, 'ok');
      fPrueba.reset();
    } catch (e) { estado(fPrueba, e.message, 'mal'); }
    finally { b.disabled = false; }
  });

  // Compra
  const fCompra = $('#form-compra');
  $('#abrir-compra')?.addEventListener('click', () => { fCompra.hidden = false; for (const x of $$('.campos, .form-pie, .form-resumen', fCompra)) x.hidden = false; $('h3', fCompra).textContent = 'Comprar la cuenta empresa'; $('.form-ayuda', fCompra).textContent = 'Al correo llegan el código de activación y los recibos. Si ya tienes una prueba, usa el mismo correo: tu red sigue igual.'; pintarPrecio(); $('input', fCompra).focus(); fCompra.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  $('#cerrar-compra')?.addEventListener('click', () => { fCompra.hidden = true; estado(fCompra, ''); });
  fCompra?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!validar(fCompra)) { estado(fCompra, 'Completa el nombre de la empresa y el correo.', 'mal'); return; }
    const d = Object.fromEntries(new FormData(fCompra));
    const b = $('button[type="submit"]', fCompra);
    b.disabled = true; estado(fCompra, 'Preparando el pago…');
    try {
      const r = await enviar('/v1/checkout', { empresa: d.empresa, email: d.email, puestos: puestos(), moneda });
      if (r.url) { location.href = r.url; return; }          // Mercado Pago (o una suscripción que solo se ajustó)
      if (r.paddle) { await abrirPaddle(r.paddle, d.email); estado(fCompra, ''); return; }
      estado(fCompra, r.mensaje || 'Listo.', 'ok');
    } catch (e) { estado(fCompra, e.message, 'mal'); }
    finally { b.disabled = false; }
  });

  // Paddle: se carga solo al pagar en dólares.
  const cargarScript = (src) => new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar el pago. Revisa tu conexión.')); document.head.appendChild(s); });
  async function abrirPaddle(p, email) {
    if (!window.Paddle) await cargarScript('https://cdn.paddle.com/paddle/v2/paddle.js');
    if (p.entorno === 'sandbox') window.Paddle.Environment.set('sandbox');
    if (!abrirPaddle.listo) { window.Paddle.Initialize({ token: p.token }); abrirPaddle.listo = true; }
    window.Paddle.Checkout.open({
      items: [{ priceId: p.precio, quantity: p.cantidad }],
      customer: { email },
      customData: { pedido: p.pedido },
      settings: { locale: 'es', successUrl: `${location.origin}/business?pago=ok#precios` },
    });
  }

  // Vuelta desde la pasarela
  const pago = new URLSearchParams(location.search).get('pago');
  if (pago) {
    fCompra.hidden = false;
    $('h3', fCompra).textContent = pago === 'ok' ? 'Pago recibido' : 'El pago no se completó';
    $('.campos', fCompra).hidden = true; $('.form-pie', fCompra).hidden = true; $('.form-resumen', fCompra).hidden = true;
    $('.form-ayuda', fCompra).textContent = pago === 'ok'
      ? 'En unos minutos te llega por correo el código de activación (o, si ya tenías la red, la confirmación de tus puestos nuevos).'
      : 'No se hizo ningún cobro. Puedes intentarlo de nuevo cuando quieras.';
    setTimeout(() => $('#precios').scrollIntoView(), 50);
  }
})();
