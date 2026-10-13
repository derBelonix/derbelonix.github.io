/* Shop-Logik – hier musst du normalerweise nichts ändern.
   Einstellungen fürs Rabatt-Spiel stehen direkt hier drunter. */
(function () {
  'use strict';

  /* ===== RABATT-SPIEL – Einstellungen ===== */
  const SPIEL = {
    prozent: 20,           // Rabatt in Prozent
    versuche: 3,           // Versuche pro Tag und Gerät
    toleranz: 0.014,       // Trefferbreite als Anteil des Spielfelds (kleiner = schwerer)
    flugzeit: [0.95, 1.25],// Sekunden für einmal quer (kleiner = schneller)
    anKasse: false         // true erst, wenn dein Apps Script den Code annimmt (siehe Anleitung)
  };
  if (typeof SHOP === 'object' && SHOP.spiel) Object.assign(SPIEL, SHOP.spiel);

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const euro = (n) => Number(n).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];
  const DEMO = !SHOP.bestellURL;
  const LIVE = !DEMO;
  const soldRemote = new Set();
  const isSold = (p) => !!p.verkauft || soldRemote.has(p.id);
  const byId = (id) => PRODUKTE.find((x) => x.id === id);
  const SHIP = Number(SHOP.versandkosten || 0);
  const MAX_CART = 10;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- Rabattcode ----------
  let code = store.get('belo_code', null);
  const rate = SPIEL.prozent / 100;
  const discounted = () => !!code && SPIEL.anKasse;
  const priceHTML = (p) => discounted() ? `<s>${esc(euro(p))}</s>${esc(euro(p * (1 - rate)))}` : esc(euro(p));

  // ---------- Warenkorb (bleibt im Browser gespeichert) ----------
  const CART_KEY = 'belo_warenkorb';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]').filter((id) => typeof id === 'string'); } catch (e) { cart = []; }
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} };
  const inCart = (id) => cart.includes(id);
  const cartItems = () => cart.map(byId).filter(Boolean);
  function updateBadge(bump) {
    const n = cart.length, b = $('#cart-btn');
    $('#cart-n').textContent = n;
    b.classList.toggle('has', n > 0);
    b.setAttribute('aria-label', 'Warenkorb öffnen, ' + n + (n === 1 ? ' Teil' : ' Teile'));
    if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  }
  function addToCart(id) {
    if (inCart(id)) return true;
    if (cart.length >= MAX_CART) { toast('Maximal ' + MAX_CART + ' Teile pro Bestellung.'); return false; }
    cart.push(id); saveCart(); updateBadge(true); render(); return true;
  }
  function removeFromCart(ids) {
    const before = cart.length; cart = cart.filter((id) => !ids.includes(id));
    if (cart.length !== before) { saveCart(); updateBadge(); render(); }
  }
  function pruneCart() {
    const gone = cart.filter((id) => { const p = byId(id); return !p || isSold(p); });
    if (!gone.length) return [];
    removeFromCart(gone); return gone;
  }
  window.addEventListener('storage', (e) => {
    if (e.key !== CART_KEY) return;
    try { cart = JSON.parse(e.newValue || '[]'); } catch (err) { cart = []; }
    updateBadge(); render();
    if (!$('#drawer').hidden && !$('#step-checkout').hidden) renderCart();
    if (!$('#drawer').hidden && !$('#step-item').hidden && cur) renderActions(cur);
  });

  // ---------- Grunddaten ----------
  document.title = SHOP.name + ' – Vintage & Streetwear';
  ['#logo', '#hero-name', '#foot-name'].forEach((s) => ($(s).textContent = SHOP.name));
  $('#hero-slogan').textContent = SHOP.slogan;
  $('#pay-text').textContent = SHOP.bezahlung;
  $('#ship-text').textContent = SHOP.versand;
  function ticker() {
    const marks = (SHOP.marken && SHOP.marken.length ? SHOP.marken : ['Vintage', 'Streetwear']);
    const extra = code ? 'Code ' + code + ' aktiv' : '−' + SPIEL.prozent + ' % im Spiel holen';
    const one = marks.map((m, i) => `<span class="m${i % 2 ? ' o' : ''}">${esc(m)}</span><span class="spark"></span>`).join('') +
      `<span class="note">${esc(extra)}</span><span class="spark"></span>`;
    $('#ticker').innerHTML = one + one + one + one;
  }
  ticker();
  const c = [];
  if (SHOP.instagram) c.push(`<a href="https://instagram.com/${esc(SHOP.instagram)}" target="_blank" rel="noopener">Instagram @${esc(SHOP.instagram)}</a>`);
  if (SHOP.email) c.push(`<a href="mailto:${esc(SHOP.email)}">${esc(SHOP.email)}</a>`);
  $('#contact').innerHTML = c.join('');

  // ---------- Wäscheleine im Hero ----------
  function leine() {
    const box = $('#leine');
    const avail = PRODUKTE.filter((p) => !isSold(p) && p.bilder && p.bilder.length);
    const pool = avail.length ? avail : PRODUKTE.filter((p) => p.bilder && p.bilder.length);
    const max = window.innerWidth < 600 ? 3 : 4, cards = [];
    for (let k = 0; cards.length < max && k < 6; k++) {
      pool.forEach((p) => { if (cards.length < max && p.bilder[k]) cards.push({ p, src: p.bilder[k] }); });
    }
    const n = cards.length;
    if (!n) { box.hidden = true; return; }
    const rots = [-4, 3, -2, 5, -3, 2];
    box.innerHTML = `<svg class="rope" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 8 Q50 74 100 8" vector-effect="non-scaling-stroke"/></svg>` +
      cards.map(({ p, src }, i) => {
        const t = (i + 0.5) / n, y = 8 + 132 * t * (1 - t);
        return `<button class="peg" type="button" data-id="${esc(p.id)}" style="left:calc(${(t * 100).toFixed(1)}% - clamp(50px,6vw,85px));top:${(y - 6).toFixed(0)}px;--r:${rots[i % rots.length]}deg;--d:${(4 + i * 0.7).toFixed(1)}s" aria-label="${esc(p.titel)} ansehen">
          <span class="pin" aria-hidden="true"></span>
          <span class="pic"><img src="${esc(src)}" alt="" loading="lazy"><span class="cap">${esc(p.marke)} · Gr. ${esc(p.groesse)}</span></span>
          <span class="price">${esc(euro(p.preis))}</span>
        </button>`;
      }).join('');
  }
  $('#leine').addEventListener('click', (e) => { const b = e.target.closest('.peg'); if (b) openItem(b.dataset.id, b); });

  // ---------- Holo-Schimmer im Namen: folgt Maus/Finger, sonst wandert er langsam ----------
  (function holo() {
    const h = $('#hero-name'), hero = $('.hero');
    if (!h || !hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let lastMove = 0, t0 = performance.now();
    const set = (x, y) => { h.style.setProperty('--mx', x.toFixed(1) + '%'); h.style.setProperty('--my', y.toFixed(1) + '%'); };
    hero.addEventListener('pointermove', (e) => {
      const r = h.getBoundingClientRect(); lastMove = performance.now();
      set(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    });
    (function drift(now) {
      if (now - lastMove > 1500) { const t = (now - t0) / 1000; set(50 + Math.sin(t * 0.6) * 45, 50 + Math.sin(t * 1.1) * 35); }
      requestAnimationFrame(drift);
    })(t0);
  })();

  // ---------- Filter ----------
  const st = { cat: 'Alle', size: '', sort: 'neu', avail: false };
  const cats = ['Alle', ...new Set(PRODUKTE.map((p) => p.kategorie))];
  $('#cats').innerHTML = cats.map((x) => `<button type="button" data-c="${esc(x)}" aria-pressed="${x === 'Alle'}">${esc(x)}</button>`).join('');
  $('#cats').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    st.cat = b.dataset.c; document.querySelectorAll('#cats button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render();
  });
  const sizes = [...new Set(PRODUKTE.map((p) => p.groesse))].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  $('#f-size').insertAdjacentHTML('beforeend', sizes.map((s) => `<option>${esc(s)}</option>`).join(''));
  $('#f-size').addEventListener('change', (e) => { st.size = e.target.value; render(); });
  $('#f-sort').addEventListener('change', (e) => { st.sort = e.target.value; render(); });
  $('#f-avail').addEventListener('change', (e) => { st.avail = e.target.checked; render(); });

  function render() {
    const free = PRODUKTE.filter((p) => !isSold(p)).length;
    $('#live-n').textContent = free;
    $('#drops-n').textContent = free;
    const list = PRODUKTE.map((p, i) => ({ p, i }))
      .filter(({ p }) => (st.cat === 'Alle' || p.kategorie === st.cat) && (!st.size || p.groesse === st.size) && (!st.avail || !isSold(p)))
      .sort((a, b) => {
        if (isSold(a.p) !== isSold(b.p)) return isSold(a.p) ? 1 : -1;
        if (st.sort === 'preis-auf') return a.p.preis - b.p.preis;
        if (st.sort === 'preis-ab') return b.p.preis - a.p.preis;
        return (b.p.neu === true) - (a.p.neu === true) || a.i - b.i;
      });
    $('#count').textContent = list.length + (list.length === 1 ? ' Teil' : ' Teile') + ' · ' + free + ' verfügbar';
    $('#grid').innerHTML = list.length ? list.map(({ p, i }) => {
      const sold = isSold(p);
      return `<button class="card${sold ? ' sold' : ''}" type="button" data-id="${esc(p.id)}" aria-label="${esc(p.titel)}, ${esc(euro(p.preis))}${sold ? ', verkauft' : ''}">
        <span class="media">
          <img src="${esc(p.bilder[0])}" alt="" loading="lazy">
          ${p.bilder[1] && !sold ? `<img class="alt" src="${esc(p.bilder[1])}" alt="" loading="lazy">` : ''}
          ${sold ? '<span class="pill">Verkauft</span>' : inCart(p.id) ? '<span class="pill incart">Im Warenkorb</span>' : p.neu ? '<span class="pill new">Neu</span>' : ''}
          <span class="size">${esc(p.groesse)}</span>
          <span class="sticker">${sold ? esc(euro(p.preis)) : priceHTML(p.preis)}</span>
        </span>
        <span class="meta"><span class="b">${esc(p.marke)}<span class="no">Nº ${String(i + 1).padStart(3, '0')}</span></span><span class="t">${esc(p.titel)}</span></span>
      </button>`;
    }).join('') : '<p class="empty">Gerade nichts in dieser Auswahl. Schau bald wieder rein.</p>';
  }
  $('#grid').addEventListener('click', (e) => { const b = e.target.closest('.card'); if (b) openItem(b.dataset.id, b); });
  // leichtes 3D-Kippen der Karten mit der Maus
  if (window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
    $('#grid').addEventListener('pointermove', (e) => {
      const m = e.target.closest('.media'); if (!m) return;
      const r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      m.style.setProperty('--ry', (x * 8).toFixed(2) + 'deg'); m.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
    });
    $('#grid').addEventListener('pointerout', (e) => {
      const m = e.target.closest('.media'); if (m && !m.contains(e.relatedTarget)) { m.style.setProperty('--ry', '0deg'); m.style.setProperty('--rx', '0deg'); }
    });
  }

  // ---------- Verkaufsstatus vom Bestellsystem holen ----------
  async function syncSold() {
    if (DEMO) return;
    try {
      const r = await fetch(SHOP.bestellURL + (SHOP.bestellURL.includes('?') ? '&' : '?') + 't=' + Date.now());
      const d = await r.json();
      if (d && d.sold) {
        soldRemote.clear(); d.sold.forEach((id) => soldRemote.add(String(id))); render(); leine();
        const gone = pruneCart();
        if (gone.length) {
          toast((gone.length === 1 ? '„' + ((byId(gone[0]) || {}).titel || 'Ein Teil') + '“ wurde verkauft' : gone.length + ' Teile wurden verkauft') + ' und aus deinem Warenkorb entfernt.');
          if (!$('#drawer').hidden && !$('#step-checkout').hidden) renderCart();
        }
      }
    } catch (e) { /* offline oder noch nicht eingerichtet */ }
  }

  // ---------- Drawer ----------
  let cur = null, lastFocus = null, cartFromItem = false;
  function step(name) {
    ['item', 'checkout', 'done'].forEach((s) => ($('#step-' + s).hidden = s !== name));
    $('#d-step').textContent = { item: 'Artikel', checkout: 'Warenkorb · Kasse', done: 'Bezahlt' }[name];
    $('#d-back').hidden = !(name === 'checkout' && cartFromItem);
    $('#step-' + name).scrollTop = 0;
  }
  function openDrawer() {
    if (!$('#drawer').hidden) return;
    $('#scrim').hidden = false; $('#drawer').hidden = false; document.body.style.overflow = 'hidden';
  }
  function openItem(id, from) {
    const p = byId(id); if (!p) return;
    cur = p; if (from) lastFocus = from;
    $('#carousel').innerHTML = p.bilder.map((src, i) => `<img src="${esc(src)}" alt="${esc(p.titel)} – Foto ${i + 1}">`).join('');
    $('#thumbs').innerHTML = p.bilder.length > 1 ? p.bilder.map((src, i) => `<button type="button" data-i="${i}" aria-label="Foto ${i + 1}"${i ? '' : ' aria-current="true"'}><img src="${esc(src)}" alt=""></button>`).join('') : '';
    const multi = p.bilder.length > 1;
    $('#g-prev').hidden = !multi; $('#g-next').hidden = !multi; $('#g-count').hidden = !multi;
    gal.n = p.bilder.length; gal.i = 0; updateGal();
    requestAnimationFrame(() => { $('#carousel').scrollLeft = 0; });
    $('#d-brand').textContent = p.marke + ' · ' + p.kategorie;
    $('#d-title').textContent = p.titel;
    $('#d-price').innerHTML = isSold(p) ? esc(euro(p.preis)) : priceHTML(p.preis);
    const specs = { 'Größe': p.groesse, 'Zustand': p.zustand, ...(p.masse || {}) };
    $('#d-specs').innerHTML = Object.entries(specs).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
    $('#d-desc').textContent = p.beschreibung || '';
    renderActions(p);
    step('item'); openDrawer();
    $('#d-close').focus();
    history.replaceState(null, '', '#' + p.id);
  }
  function renderActions(p) {
    const box = $('#d-actions');
    if (isSold(p)) { box.innerHTML = '<div class="soldbox">Schon verkauft. Beim nächsten Drop lohnt es sich, schnell zu sein.</div>'; return; }
    if (inCart(p.id)) {
      box.innerHTML = `<button class="buy" type="button" data-act="cart">Im Warenkorb ✓ · Zur Kasse</button>
        <button class="buy ghost" type="button" data-act="more">Weiter stöbern</button>`;
    } else {
      box.innerHTML = `<button class="buy" type="button" data-act="add">In den Warenkorb · ${esc(euro(discounted() ? p.preis * (1 - rate) : p.preis))}</button>
        <button class="buy ghost" type="button" data-act="now">Direkt kaufen</button>`;
    }
  }
  $('#d-actions').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b || !cur) return;
    const a = b.dataset.act;
    if (a === 'add') { if (addToCart(cur.id)) { toast('„' + cur.titel + '“ liegt im Warenkorb'); renderActions(cur); } }
    else if (a === 'now') { if (addToCart(cur.id)) openCart(true); }
    else if (a === 'cart') openCart(true);
    else if (a === 'more') closeDrawer();
  });

  // ---------- Galerie ----------
  const gal = { i: 0, n: 0 };
  function updateGal() {
    $('#g-count').textContent = (gal.i + 1) + ' / ' + gal.n;
    $('#g-prev').disabled = gal.i <= 0; $('#g-next').disabled = gal.i >= gal.n - 1;
    document.querySelectorAll('#thumbs button').forEach((t, j) => t.setAttribute('aria-current', String(j === gal.i)));
    const act = document.querySelector('#thumbs button[aria-current="true"]');
    if (act) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function goTo(i) {
    i = Math.max(0, Math.min(gal.n - 1, i)); const el = $('#carousel');
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); gal.i = i; updateGal();
  }
  $('#g-prev').addEventListener('click', () => goTo(gal.i - 1));
  $('#g-next').addEventListener('click', () => goTo(gal.i + 1));
  $('#thumbs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) goTo(+b.dataset.i); });
  $('#carousel').addEventListener('click', () => { if (gal.n > 1) goTo(gal.i + 1 < gal.n ? gal.i + 1 : 0); });
  let galT;
  $('#carousel').addEventListener('scroll', () => {
    clearTimeout(galT); galT = setTimeout(() => {
      const el = $('#carousel'); const i = Math.round(el.scrollLeft / el.clientWidth);
      if (i !== gal.i) { gal.i = i; updateGal(); }
    }, 60);
  }, { passive: true });
  document.addEventListener('keydown', (e) => {
    if ($('#drawer').hidden || $('#step-item').hidden) return;
    if (e.key === 'ArrowRight') goTo(gal.i + 1);
    if (e.key === 'ArrowLeft') goTo(gal.i - 1);
  });

  // ---------- Warenkorb-Ansicht ----------
  function openCart(fromItem) {
    cartFromItem = !!fromItem && !!cur;
    if (!fromItem) lastFocus = $('#cart-btn');
    pruneCart();
    renderCart();
    $('#c-err').textContent = '';
    step('checkout'); openDrawer();
    history.replaceState(null, '', '#warenkorb');
  }
  function totals(items) {
    const sub = items.reduce((s, p) => s + Number(p.preis), 0);
    const off = discounted() ? Math.round(sub * rate * 100) / 100 : 0;
    return { sub, off, total: sub - off + SHIP };
  }
  function renderCart() {
    const items = cartItems().filter((p) => !isSold(p));
    const empty = !items.length;
    $('#cart-empty').hidden = !empty; $('#cart-pay').hidden = empty; $('#cartlist').hidden = empty;
    if (empty) return;
    $('#cartlist').innerHTML = items.map((p) => `<div class="crow">
        <button type="button" class="crow-open" data-open="${esc(p.id)}" aria-label="${esc(p.titel)} ansehen"><img src="${esc(p.bilder[0])}" alt=""></button>
        <div class="crow-t"><b>${esc(p.titel)}</b><span>Gr. ${esc(p.groesse)} · ${esc(p.zustand)}</span><span class="cp">${esc(euro(p.preis))}</span></div>
        <button type="button" class="rm" data-rm="${esc(p.id)}" aria-label="${esc(p.titel)} entfernen">✕</button>
      </div>`).join('');
    const t = totals(items);
    $('#sum').innerHTML = `<span>${items.length} Artikel</span><span>${euro(t.sub)}</span>
      ${t.off ? `<span class="disc">Code ${esc(code)} (−${SPIEL.prozent} %)</span><span class="disc">−${euro(t.off)}</span>` : ''}
      <span>Versand <small>(nur einmal)</small></span><span>${euro(SHIP)}</span>
      <span class="tot">Gesamt</span><span class="tot">${euro(t.total)}</span>`;
    const ci = $('#codeinfo');
    if (code && !SPIEL.anKasse) {
      ci.hidden = false;
      ci.innerHTML = `Dein Rabattcode <b>${esc(code)}</b>: Bezahl ganz normal und schick mir den Code danach${SHOP.instagram ? ' per Instagram (@' + esc(SHOP.instagram) + ')' : ''}${SHOP.email ? ' oder an ' + esc(SHOP.email) : ''}. Du bekommst ${SPIEL.prozent} % vom Warenwert (${euro(t.sub * rate)}) zurückerstattet.`;
    } else ci.hidden = true;
    const btn = $('#pay-btn'); btn.disabled = false; btn.textContent = 'Zahlungspflichtig bestellen · ' + euro(t.total);
    $('#demo-note').hidden = LIVE;
  }
  $('#cartlist').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { const p = byId(rm.dataset.rm); removeFromCart([rm.dataset.rm]); renderCart(); if (p) toast('„' + p.titel + '“ entfernt'); return; }
    const op = e.target.closest('[data-open]'); if (op) openItem(op.dataset.open);
  });
  $('#cart-btn').addEventListener('click', () => openCart(false));
  $('#cart-shop').addEventListener('click', () => { closeDrawer(); $('#shop').scrollIntoView({ behavior: 'smooth' }); });

  // ---------- Bezahlen (Stripe über dein Apps Script) ----------
  async function api(body) {
    const r = await fetch(SHOP.bestellURL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    return r.json();
  }
  const ERR = {
    verkauft: 'Zu spät: Ein Teil wurde gerade verkauft und aus deinem Warenkorb entfernt. Prüf kurz deinen Warenkorb.',
    unbekannt: 'Ein Teil in deinem Warenkorb ist gerade nicht kaufbar und wurde entfernt. Prüf kurz deinen Warenkorb.',
    leer: 'Dein Warenkorb ist leer.',
    zuviel: 'Maximal ' + MAX_CART + ' Teile pro Bestellung.',
    busy: 'Gerade ist viel los. Versuch es in ein paar Sekunden nochmal.',
    offen: 'Die Zahlung ist noch nicht abgeschlossen.',
    code: 'Der Rabattcode ist ungültig oder schon benutzt. Er wurde entfernt, du kannst ohne Rabatt bezahlen.'
  };
  const agreed = () => $('#c-agree').checked;
  $('#c-agree').addEventListener('change', () => { if (agreed()) $('#c-err').textContent = ''; });

  function finish(res) {
    const ids = res.ids || (res.id ? [res.id] : []);
    ids.forEach((id) => soldRemote.add(id));
    removeFromCart(ids); render(); leine();
    if (res.codeBenutzt) { code = null; store.set('belo_code', null); ticker(); gameIdle(); }
    const items = ids.map(byId).filter(Boolean);
    $('#done-text').textContent = res.demo
      ? 'Demo-Modus: So sieht es nach einem Kauf aus. Mit verbundenem Stripe geht das Geld auf dein Konto und du bekommst eine Mail mit Name und Adresse.'
      : 'Deine Zahlung ist eingegangen. Eine Bestätigung ist per Mail unterwegs, dein Paket geht in 1–2 Werktagen raus.';
    const lines = items.length ? items.map((p) => `<div>${esc(p.titel)} · Gr. ${esc(p.groesse)}</div>`).join('') : `<div>${esc(res.titel || '')}</div>`;
    const ref = res.erstattet && res.erstattet.length
      ? `<div style="color:var(--bad)">Leider kurz vor dir verkauft und automatisch erstattet: ${esc(res.erstattet.join(', '))}</div>` : '';
    $('#done-card').innerHTML = `<div><span class="mono">Bestellnr.</span> <b>${esc(res.bestellnr)}</b></div>
      ${lines}<div><b>${euro(res.gesamt)}</b> bezahlt inkl. Versand</div>${ref}
      ${res.name ? `<div style="color:var(--muted)">Lieferung an ${esc(res.name)}${res.adresse ? ', ' + esc(res.adresse) : ''}</div>` : ''}`;
    step('done'); toast('Danke! Bestellung ' + res.bestellnr);
  }

  $('#pay-btn').addEventListener('click', async () => {
    const items = cartItems().filter((p) => !isSold(p));
    if (!items.length) { renderCart(); return; }
    const t = totals(items);
    if (!agreed()) { $('#c-err').textContent = 'Bitte bestätige zuerst die Checkbox.'; return; }
    const btn = $('#pay-btn'); btn.disabled = true; btn.textContent = 'Weiter zur Bezahlung …';
    if (!LIVE) {
      await new Promise((r) => setTimeout(r, 900));
      finish({ demo: true, bestellnr: 'DEMO-0001', gesamt: t.total, name: 'Max Muster', adresse: 'Musterweg 1, 50667 Köln', ids: items.map((p) => p.id) });
      return;
    }
    try {
      const body = { action: 'create', ids: items.map((p) => p.id) };
      if (discounted()) body.code = code;
      const res = await api(body);
      if (res.ok && res.url) { location.href = res.url; return; }
      if ((res.error === 'verkauft' || res.error === 'unbekannt') && res.ids && res.ids.length) {
        if (res.error === 'verkauft') res.ids.forEach((id) => soldRemote.add(id));
        removeFromCart(res.ids); renderCart();
      }
      if (res.error === 'code') { code = null; store.set('belo_code', null); ticker(); render(); gameIdle(); }
      $('#c-err').textContent = ERR[res.error] || 'Die Bezahlung konnte nicht gestartet werden. Versuch es gleich nochmal.';
    } catch (e) { $('#c-err').textContent = 'Keine Verbindung. Versuch es gleich nochmal.'; }
    if (!$('#cart-pay').hidden) renderCart();
  });
  $('#d-back').addEventListener('click', () => { if (cur) openItem(cur.id); });

  // Rückkehr von der Stripe-Bezahlseite: ?bezahlt=cs_...
  async function handleReturn() {
    const sid = new URLSearchParams(location.search).get('bezahlt');
    if (!sid || !LIVE) return false;
    history.replaceState(null, '', location.pathname);
    cartFromItem = false; step('done');
    $('#done-text').textContent = 'Zahlung wird bestätigt …'; $('#done-card').innerHTML = '';
    openDrawer();
    for (let i = 0; i < 4; i++) {
      try {
        const res = await api({ action: 'confirm', session: sid });
        if (res.ok) { finish(res); return true; }
        if (res.error === 'verkauft') {
          if (res.ids) { res.ids.forEach((id) => soldRemote.add(id)); removeFromCart(res.ids); render(); }
          $('#done-text').textContent = 'Deine Teile wurden kurz vor dir verkauft. Dein Geld wird automatisch erstattet, du bekommst eine Mail.';
          return true;
        }
      } catch (e) {}
      await new Promise((r) => setTimeout(r, 2500));
    }
    $('#done-text').textContent = 'Danke! Deine Zahlung wird noch verarbeitet. Die Bestätigung kommt in wenigen Minuten per Mail.';
    return true;
  }

  function closeDrawer() {
    $('#scrim').hidden = true; $('#drawer').hidden = true; document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }
  $('#d-close').addEventListener('click', closeDrawer);
  $('#done-close').addEventListener('click', closeDrawer);
  $('#scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#drawer').hidden) closeDrawer(); });

  let tt;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 3200); }
  function copy(text) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => toast('Code kopiert')).catch(() => toast('Dein Code: ' + text));
  }

  /* ==========================================================
     RABATT-SPIEL: Sneaker anhalten
     ========================================================== */
  const today = new Date().toISOString().slice(0, 10);
  let gs = store.get('belo_spiel', { day: today, used: 0 });
  if (gs.day !== today) gs = { day: today, used: 0 };
  const stage = $('#stage'), cv = $('#gcv'), cx = cv.getContext('2d');
  let W = 0, H = 0, fly = null, parts = [], zx = 0, tol = 6, frozen = null, anim = 0;
  const P = {
    upper: new Path2D('M16 64 C12 52 18 44 30 42 L72 30 C84 27 90 20 94 12 L122 10 C126 24 136 34 150 38 L180 48 C192 52 196 58 196 64 Z'),
    heel: new Path2D('M16 64 C12 52 18 44 30 42 L46 38 C40 47 40 56 46 64 Z'),
    toe: new Path2D('M152 38 L180 48 C192 52 196 58 196 64 L162 64 C162 52 158 45 152 38 Z'),
    mid: new Path2D('M10 64 L198 64 C199 70 198 74 194 76 L14 76 C10 74 9 70 10 64 Z'),
    out: new Path2D('M14 76 L194 76 C192 82 188 85 182 85 L22 85 C17 85 14 81 14 76 Z'),
    tab: new Path2D('M60 56 L104 50 L106 58 L62 64 Z'),
    laces: new Path2D('M100 22 L108 30 M108 18 L116 34 M116 24 L124 38 M124 28 L132 41 M98 26 L128 40')
  };
  function size() {
    const r = stage.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
    tol = Math.max(4, W * SPIEL.toleranz);
  }
  const sc = () => (W < 520 ? 0.42 : 0.58);
  function sneaker(x, y, rot, a) {
    const s = sc();
    cx.save(); cx.globalAlpha = a; cx.translate(x, y); cx.rotate(rot); cx.scale(s, s); cx.translate(-104, -48);
    cx.lineJoin = 'round'; cx.lineWidth = 3; cx.strokeStyle = '#2B2925';
    cx.fillStyle = '#F8F6F2'; cx.fill(P.upper);
    cx.fillStyle = '#FFD23F'; cx.fill(P.heel); cx.fill(P.toe);
    cx.fillStyle = '#2B2925'; cx.fill(P.tab);
    cx.stroke(P.upper);
    cx.fillStyle = '#FFFFFF'; cx.fill(P.mid); cx.stroke(P.mid);
    cx.fillStyle = '#B98B57'; cx.fill(P.out); cx.stroke(P.out);
    cx.lineWidth = 2.4; cx.stroke(P.laces);
    cx.restore();
  }
  function posAt(f, t) {
    const p = (t - f.t0) / f.dur, k2 = 2 * Math.PI * f.k;
    const xp = p + f.a * (Math.sin(k2 * p + f.ph) - Math.sin(f.ph)) / k2;
    return { p, x: f.from + (f.to - f.from) * xp, y: H * 0.5 + Math.sin(p * Math.PI * f.wv + f.ph2) * H * 0.16, rot: p * Math.PI * 2 * f.spin };
  }
  function draw(now) {
    cx.clearRect(0, 0, W, H);
    cx.strokeStyle = 'rgba(111,106,99,.16)'; cx.lineWidth = 1;
    for (let y = 20; y < H; y += 26) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
    cx.fillStyle = 'rgba(255,210,63,.35)'; cx.fillRect(zx - W * 0.06, 0, W * 0.12, H);
    cx.fillStyle = 'rgba(255,210,63,.95)'; cx.fillRect(zx - tol, 0, tol * 2, H);
    cx.fillStyle = '#2B2925'; cx.fillRect(zx - 1, 0, 2, H);
    cx.font = "12px 'JetBrains Mono',monospace"; cx.textAlign = 'center'; cx.fillText('HIER STOPPEN', zx, 16);
    cx.textAlign = 'left'; cx.fillStyle = '#6F6A63'; cx.fillText(fly ? 'TIPPEN · KLICKEN · LEERTASTE' : 'RABATT-SPIEL', 12, H - 12);
    if (fly) {
      for (let i = 7; i >= 1; i--) { const q = posAt(fly, now - i * 16); if (q.p >= 0) sneaker(q.x, q.y, q.rot, 0.05 + 0.03 * (7 - i)); }
      const s = posAt(fly, now);
      cx.strokeStyle = 'rgba(43,41,37,.25)'; cx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const yy = s.y - 14 + i * 14; cx.beginPath(); cx.moveTo(s.x - 90 * sc() - i * 10, yy); cx.lineTo(s.x - 150 * sc() - i * 18, yy); cx.stroke(); }
      sneaker(s.x, s.y, s.rot, 1);
    } else if (frozen) {
      sneaker(frozen.x, frozen.y, frozen.rot, 1);
      cx.strokeStyle = frozen.win ? '#2F6B4F' : '#B23A2E'; cx.lineWidth = 2; cx.setLineDash([4, 4]);
      cx.beginPath(); cx.moveTo(frozen.x, H * 0.18); cx.lineTo(frozen.x, H * 0.82); cx.stroke(); cx.setLineDash([]);
    } else sneaker(W * 0.18, H * 0.5, -0.25, 1);
    parts.forEach((q) => { cx.globalAlpha = Math.max(0, q.l); cx.fillStyle = q.c; cx.fillRect(q.x, q.y, q.s, q.s); });
    cx.globalAlpha = 1;
  }
  function loop(now) {
    parts.forEach((q) => { q.x += q.vx; q.y += q.vy; q.vy += 0.25; q.l -= 0.018; });
    parts = parts.filter((q) => q.l > 0);
    if (fly && posAt(fly, now).p >= 1) { const f = fly; fly = null; miss(null, f); }
    draw(now);
    anim = fly || parts.length ? requestAnimationFrame(loop) : 0;
  }
  const kick = () => { if (!anim) anim = requestAnimationFrame(loop); };
  function burst(x, y, win) {
    const cols = win ? ['#FFD23F', '#2F6B4F', '#2B2925', '#F8F6F2', '#B98B57'] : ['#6F6A63', '#B23A2E'];
    for (let i = 0; i < (win ? 90 : 24); i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * (win ? 7 : 3);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, l: 1, s: 3 + Math.random() * 4, c: cols[i % cols.length] });
    }
    kick();
  }
  function triesUI() {
    const btn = $('#play-btn');
    if (code) { $('#tries').textContent = 'Gewonnen! Dein Code ist aktiv.'; btn.textContent = 'Zum Spaß nochmal'; btn.disabled = false; return; }
    const left = SPIEL.versuche - gs.used;
    $('#tries').innerHTML = Array.from({ length: SPIEL.versuche }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('') +
      `<span>${left > 0 ? left + (left === 1 ? ' Versuch' : ' Versuche') + ' übrig heute' : 'Morgen wieder'}</span>`;
    btn.textContent = 'Spiel starten'; btn.disabled = left <= 0;
  }
  const overlay = (h) => { $('#res-in').innerHTML = h; $('#result').hidden = false; };
  const codeBox = () => `<div class="codebox"><span>${esc(code)}</span><button type="button" data-copy>Kopieren</button></div>`;
  function gameIdle() {
    triesUI();
    if (code) overlay(`<div class="big win">${SPIEL.prozent} % gesichert</div>${codeBox()}<div class="sub">${SPIEL.anKasse ? 'Wird im Warenkorb automatisch abgezogen' : 'Steht im Warenkorb, schick ihn mir nach der Bestellung'}</div>`);
    else if (gs.used >= SPIEL.versuche) overlay(`<div class="big lose">Für heute vorbei</div><div class="sub">Morgen gibt es ${SPIEL.versuche} neue Versuche</div>`);
    else overlay(`<div class="big">Bereit?</div><div class="sub">Starten, dann auf der Linie tippen</div>`);
  }
  function start() {
    if (fly) return;
    const practice = !!code;
    if (!practice) { if (gs.used >= SPIEL.versuche) return; gs.used++; store.set('belo_spiel', gs); triesUI(); }
    $('#result').hidden = true; frozen = null; parts = []; size();
    zx = W * (0.3 + Math.random() * 0.4);
    const half = 104 * sc(), [a, b] = SPIEL.flugzeit;
    const base = a + Math.random() * (b - a) - (practice ? 0 : (gs.used - 1) * 0.07);
    fly = { t0: performance.now() + 350, dur: base * 1000, from: -half - 20, to: W + half + 20,
      a: 0.35 + Math.random() * 0.3, k: 1 + Math.floor(Math.random() * 2), ph: Math.random() * 6.28,
      wv: 1 + Math.random() * 2, ph2: Math.random() * 6.28, spin: (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random()), practice };
    stage.focus({ preventScroll: true }); kick();
  }
  function stop(t) {
    if (!fly || t < fly.t0) return;
    const f = fly; fly = null;
    const s = posAt(f, t), dist = Math.abs(s.x - zx), win = dist <= tol;
    frozen = { x: s.x, y: s.y, rot: s.rot, win };
    burst(s.x, s.y, win);
    if (!win) { miss(dist, f); return; }
    if (!f.practice) {
      code = 'BELO' + SPIEL.prozent + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      store.set('belo_code', code); ticker(); render(); triesUI();
    }
    setTimeout(() => overlay(`<div class="big win">Treffer! −${SPIEL.prozent} %</div><div class="sub">Nur ${Math.round(dist)} px daneben</div>${f.practice ? '' : codeBox()}`), 650);
  }
  function miss(dist, f) {
    const left = SPIEL.versuche - gs.used;
    const tail = f.practice ? '' : left > 0 ? 'Noch ' + left + (left === 1 ? ' Versuch' : ' Versuche') + ' heute' : 'Morgen hast du neue Versuche';
    const h = dist === null ? `<div class="big lose">Zu spät</div><div class="sub">Er ist durchgeflogen. ${tail}</div>`
      : dist < W * 0.06 ? `<div class="big near">So knapp!</div><div class="sub">${Math.round(dist)} px daneben. ${tail}</div>`
      : `<div class="big lose">Daneben</div><div class="sub">${Math.round(dist)} px daneben. ${tail}</div>`;
    setTimeout(() => overlay(h), dist === null ? 0 : 600);
    kick();
  }
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-copy]')) { copy(code); return; }
    if (fly) { e.preventDefault(); stop(e.timeStamp || performance.now()); }
  });
  stage.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); fly ? stop(performance.now()) : start(); } });
  $('#play-btn').addEventListener('click', start);
  let rzT, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (!fly) { size(); draw(performance.now()); }
    clearTimeout(rzT); rzT = setTimeout(() => { if ((window.innerWidth < 600) !== (lastW < 600)) leine(); lastW = window.innerWidth; }, 200);
  });

  // ---------- Start ----------
  updateBadge();
  render();
  leine();
  size(); zx = W * 0.55; draw(performance.now()); gameIdle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!fly) draw(performance.now()); });
  syncSold().then(async () => {
    if (await handleReturn()) return;
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === 'warenkorb') openCart(false);
    else if (h && PRODUKTE.some((p) => p.id === h)) openItem(h);
  });
  setInterval(syncSold, 60000);
})();
