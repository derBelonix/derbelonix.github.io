/* Shop-Logik – hier musst du normalerweise nichts ändern.
   Einstellungen fürs Rabatt-Spiel stehen direkt hier drunter. */
(function () {
  'use strict';

  /* ===== RABATT-SPIEL – Einstellungen ===== */
  const SPIEL = {
    prozent: 20,           // Rabatt in Prozent
    versuche: 0,           // 0 = unbegrenzt spielen, bis ein Treffer gelingt
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
  $('#ship-text').textContent = SHOP.versand;
  $('#ship-cost').textContent = euro(SHIP) + ' pro Bestellung, egal wie viele Teile';
  const chips = ['Karte', 'Apple Pay', 'Google Pay', 'Klarna', 'Lastschrift'].map((x) => `<span>${x}</span>`).join('');
  $('#pay-chips').innerHTML = chips; $('#cart-chips').innerHTML = chips;
  if (SHOP.instagram) $('#ask-link').innerHTML = `<a href="https://instagram.com/${esc(SHOP.instagram)}" target="_blank" rel="noopener">Instagram @${esc(SHOP.instagram)}</a>`;
  else if (SHOP.email) $('#ask-link').textContent = SHOP.email;
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
    const pool = (avail.length ? avail : PRODUKTE.filter((p) => p.bilder && p.bilder.length)).slice().reverse();
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
        return (b.p.neu === true) - (a.p.neu === true) || b.i - a.i; // neueste Einträge (unten in produkte.js) zuerst
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
  // Besucher-ID nur für diesen Tab (keine persönlichen Daten), damit dein Script live mitzählen kann
  let sid = '';
  try { sid = sessionStorage.getItem('belo_sid') || ''; if (!sid) { sid = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('belo_sid', sid); } } catch (e) { sid = Math.random().toString(36).slice(2, 12); }
  function showLive(n) {
    const ok = typeof n === 'number' && n >= 1;
    $('#lv').hidden = !ok; $('#lv-sep').hidden = !ok;
    if (ok) $('#live-v').textContent = n;
  }
  async function syncSold() {
    if (DEMO) return;
    try {
      const live = document.visibilityState === 'visible' ? '&live=' + encodeURIComponent(sid) : '';
      const r = await fetch(SHOP.bestellURL + (SHOP.bestellURL.includes('?') ? '&' : '?') + 't=' + Date.now() + live);
      const d = await r.json();
      if (d && 'live' in d) showLive(d.live);
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
    $('#card-btn').hidden = false;
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
      ${t.off ? `<span class="disc">Code ${esc(code)} (−${SPIEL.prozent}&nbsp;%)</span><span class="disc">−${euro(t.off)}</span>` : ''}
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
     HOLO-SAMMELKARTE: jedes Teil als holografische Karte
     ========================================================== */
  let tcP = null, tcFlip = 0, gyroOn = false;
  const tc = $('#tc'), tcWrap = $('#tc-wrap');
  function cardNo(p) { return 'Nº ' + String(PRODUKTE.indexOf(p) + 1).padStart(3, '0'); }
  function shortZustand(z) { z = String(z || ''); const m = z.match(/\d+\s*\/\s*10/); if (m) return m[0].replace(/\s/g, ''); if (/neu/i.test(z)) return 'Neu'; return z.split(/[\s–-]/)[0]; }
  function openCard(p) {
    tcP = p; tcFlip = 0; tc.style.setProperty('--flip', '0deg'); tilt(0, 0);
    const layers = '<span class="tc-holo"></span><span class="tc-glare"></span>';
    $('#tc-front').innerHTML = `<div class="tc-in">
        <div class="tc-head"><span>${esc(p.marke)}</span><span>${cardNo(p)}</span></div>
        <div class="tc-pic"><img src="${esc(p.bilder[0])}" alt="${esc(p.titel)}"><div class="tc-one">1/1<small>EINZEL</small></div></div>
        <div class="tc-name">${esc(p.titel)}</div>
        <div class="tc-stats"><div><small>Größe</small><b>${esc(p.groesse)}</b></div><div><small>Zustand</small><b>${esc(shortZustand(p.zustand))}</b></div><div><small>Preis</small><b>${esc(euro(p.preis))}</b></div></div>
      </div>${layers}`;
    const specs = { 'Größe': p.groesse, 'Zustand': p.zustand, ...(p.masse || {}) };
    $('#tc-back').innerHTML = `<div class="tc-in">
        <h4>${esc(SHOP.name)} · Datenblatt</h4>
        <dl>${Object.entries(specs).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        <div class="tc-big">${cardNo(p)}<br>1 von 1</div>
        <div class="tc-foot">${esc(p.marke)} · ${esc(p.kategorie)}${isSold(p) ? ' · Verkauft' : ''}</div>
      </div>${layers}`;
    tcWrap.hidden = false;
    $('#tc-gyro').hidden = !(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') || gyroOn;
    if (!reduceMotion && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') startGyro();
    $('#tc-close').focus();
  }
  function closeCard() { tcWrap.hidden = true; }
  // x, y von -1 bis 1
  function tilt(x, y) {
    x = Math.max(-1, Math.min(1, x)); y = Math.max(-1, Math.min(1, y));
    tc.style.setProperty('--ry', (x * 16).toFixed(2) + 'deg'); tc.style.setProperty('--rx', (-y * 14).toFixed(2) + 'deg');
    tc.style.setProperty('--px', (50 + x * 45).toFixed(1) + '%'); tc.style.setProperty('--py', (50 + y * 45).toFixed(1) + '%');
    tc.style.setProperty('--gx', (50 + x * 50).toFixed(1) + '%'); tc.style.setProperty('--gy', (35 + y * 50).toFixed(1) + '%');
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let downAt = null;
  $('#tc-stage').addEventListener('pointermove', (e) => {
    if (gyroOn && e.pointerType === 'touch') return;
    const r = $('#tc-stage').getBoundingClientRect();
    tilt(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  });
  $('#tc-stage').addEventListener('pointerleave', () => { if (!gyroOn) tilt(0, 0); });
  $('#tc-stage').addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  $('#tc-stage').addEventListener('pointerup', (e) => {
    if (downAt && Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y) < 12) {
      tcFlip += 180; tc.classList.add('flipping'); tc.style.setProperty('--flip', tcFlip + 'deg');
      setTimeout(() => tc.classList.remove('flipping'), 700);
    }
    downAt = null;
  });
  let base = null;
  function onOrient(e) {
    if (tcWrap.hidden || e.gamma == null) return;
    if (!base) base = { b: e.beta, g: e.gamma };
    tilt((e.gamma - base.g) / 25, (e.beta - base.b) / 25);
  }
  function startGyro() { if (gyroOn) return; gyroOn = true; base = null; window.addEventListener('deviceorientation', onOrient); }
  $('#tc-gyro').addEventListener('click', async () => {
    try { const r = await DeviceOrientationEvent.requestPermission(); if (r === 'granted') { startGyro(); $('#tc-gyro').hidden = true; } else toast('Ohne Sensor: einfach mit dem Finger über die Karte wischen.'); }
    catch (err) { toast('Ohne Sensor: einfach mit dem Finger über die Karte wischen.'); }
  });
  $('#card-btn').addEventListener('click', () => { if (cur) openCard(cur); });
  $('#tc-close').addEventListener('click', closeCard);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !tcWrap.hidden) { e.stopImmediatePropagation(); closeCard(); } }, true);

  /* ==========================================================
     RABATT-SPIEL: das Holo-Preisetikett anhalten
     ========================================================== */
  const today = new Date().toISOString().slice(0, 10);
  let gs = store.get('belo_spiel', { day: today, used: 0 });
  if (gs.day !== today) gs = { day: today, used: 0 };
  const stage = $('#stage'), cv = $('#gcv'), cx = cv.getContext('2d');
  let W = 0, H = 0, fly = null, parts = [], rings = [], zx = 0, tol = 6, frozen = null, anim = 0, visible = false;
  const INK = '#14120F';
  function size() {
    const r = stage.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
    tol = Math.max(4, W * SPIEL.toleranz);
  }
  const sc = () => (W < 520 ? 0.62 : 0.82);
  const dims = () => { const s = sc(); return { s, w: 150 * s, h: 86 * s }; };
  function tagPath(w, h) {
    const n = h * 0.34, r = 8;
    cx.beginPath(); cx.moveTo(-w / 2 + n, -h / 2); cx.lineTo(w / 2 - r, -h / 2); cx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    cx.lineTo(w / 2, h / 2 - r); cx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); cx.lineTo(-w / 2 + n, h / 2); cx.lineTo(-w / 2, 0); cx.closePath();
  }
  function holoGrad(x0, y0, x1, y1, shift) {
    const g = cx.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(shift + i * 55) % 360},88%,82%)`);
    return g;
  }
  // Etikett zeichnen: flip = Drehung um die Hochachse (3D), rot = Neigung
  function tag(x, y, rot, flip, a, shadow) {
    const { s, w, h } = dims(), c = Math.cos(flip), front = c >= 0, sx = Math.max(0.06, Math.abs(c));
    cx.save(); cx.globalAlpha = a; cx.translate(x, y); cx.rotate(rot); cx.scale(sx, 1);
    if (shadow) { cx.shadowColor = 'rgba(43,41,37,.28)'; cx.shadowBlur = 18 * s; cx.shadowOffsetY = 10 * s; }
    tagPath(w, h);
    cx.fillStyle = front ? holoGrad(-w / 2, -h / 2, w / 2, h / 2, ((flip * 57) % 360) + 360) : '#F8F6F2';
    cx.fill(); cx.shadowColor = 'transparent';
    // Glanzstreifen, wandert mit der Drehung
    cx.save(); tagPath(w, h); cx.clip();
    const k = ((Math.sin(flip * 1.3) + 1) / 2) * w * 1.6 - w * 0.8, g = cx.createLinearGradient(k - w * 0.3, -h, k + w * 0.3, h);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.fillRect(-w, -h, w * 2, h * 2); cx.restore();
    // Rand + Steppnaht
    cx.lineJoin = 'round'; cx.lineWidth = 2.4; cx.strokeStyle = INK; tagPath(w, h); cx.stroke();
    cx.save(); cx.scale(0.9, 0.82); cx.setLineDash([4 * s, 3 * s]); cx.lineWidth = 1.2; cx.strokeStyle = 'rgba(43,41,37,.45)'; tagPath(w, h); cx.stroke(); cx.restore();
    // Metallöse
    const ex = -w / 2 + h * 0.36, R = h * 0.13, mg = cx.createLinearGradient(ex - R, -R, ex + R, R);
    mg.addColorStop(0, '#F6E4A8'); mg.addColorStop(0.5, '#B48635'); mg.addColorStop(1, '#FBEDC2');
    cx.fillStyle = mg; cx.beginPath(); cx.arc(ex, 0, R, 0, 7); cx.fill(); cx.lineWidth = 1; cx.strokeStyle = 'rgba(43,41,37,.5)'; cx.stroke();
    cx.fillStyle = '#ECE8E1'; cx.beginPath(); cx.arc(ex, 0, R * 0.5, 0, 7); cx.fill();
    // Schrift
    cx.fillStyle = INK; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    const tx = w * 0.1;
    if (front) {
      cx.font = `500 ${Math.round(9 * s)}px 'JetBrains Mono',monospace`; cx.fillText('BELO VINTAGE', tx, -h * 0.29);
      cx.font = `900 ${Math.round(40 * s)}px 'Archivo','Arial Narrow',sans-serif`; cx.fillText('−' + SPIEL.prozent + '%', tx, h * 0.05);
      cx.font = `500 ${Math.round(8 * s)}px 'JetBrains Mono',monospace`; cx.fillText('NUR BEI TREFFER', tx, h * 0.31);
    } else {
      cx.font = `900 ${Math.round(24 * s)}px 'Archivo','Arial Narrow',sans-serif`; cx.fillText('ECHT', tx, -h * 0.08);
      cx.font = `500 ${Math.round(8 * s)}px 'JetBrains Mono',monospace`; cx.fillText('GEPRÜFT · GEMESSEN', tx, h * 0.2);
    }
    cx.restore();
  }
  // Weltposition der Öse (für die Schnur)
  function eye(q) {
    const { w, h } = dims(), lx = (-w / 2 + h * 0.36) * Math.max(0.06, Math.abs(Math.cos(q.flip)));
    return { x: q.x + lx * Math.cos(q.rot), y: q.y + lx * Math.sin(q.rot) };
  }
  function rope(pts) {
    if (pts.length < 2) return;
    cx.strokeStyle = 'rgba(43,41,37,.75)'; cx.lineWidth = 1.6; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2; cx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my); }
    const l = pts[pts.length - 1]; cx.lineTo(l.x, l.y); cx.stroke();
  }
  function star(x, y, r) {
    cx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.35 : r; cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } cx.closePath(); cx.fill();
  }
  function posAt(f, t) {
    const p = (t - f.t0) / f.dur, k2 = 2 * Math.PI * f.k;
    const xp = p + f.a * (Math.sin(k2 * p + f.ph) - Math.sin(f.ph)) / k2;
    return { p, x: f.from + (f.to - f.from) * xp, y: H * 0.5 + Math.sin(p * Math.PI * f.wv + f.ph2) * H * 0.17,
      rot: Math.sin(p * Math.PI * 2 + f.ph) * 0.28, flip: p * Math.PI * 2 * f.spin };
  }
  function idlePose(now) {
    const t = now / 1000;
    return { x: W * 0.2, y: H * 0.5 + Math.sin(t * 1.4) * 8, rot: Math.sin(t * 0.9) * 0.08, flip: Math.sin(t * 0.7) * 1.1 };
  }
  function draw(now) {
    cx.clearRect(0, 0, W, H);
    cx.strokeStyle = 'rgba(111,106,99,.14)'; cx.lineWidth = 1;
    for (let y = 20; y < H; y += 26) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
    // Zielzone in Holo
    const zg = cx.createLinearGradient(0, 0, 0, H); for (let i = 0; i <= 4; i++) zg.addColorStop(i / 4, `hsla(${(now / 20 + i * 70) % 360},90%,78%,.9)`);
    cx.fillStyle = 'rgba(43,41,37,.05)'; cx.fillRect(zx - W * 0.06, 0, W * 0.12, H);
    cx.fillStyle = zg; cx.fillRect(zx - tol, 0, tol * 2, H);
    cx.fillStyle = INK; cx.fillRect(zx - 1, 0, 2, H);
    cx.font = "12px 'JetBrains Mono',monospace"; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.fillText('HIER STOPPEN', zx, 16);
    cx.textAlign = 'left'; cx.fillStyle = '#6F6A63'; cx.fillText(fly ? (W < 520 ? 'JETZT TIPPEN' : 'TIPPEN · KLICKEN · LEERTASTE') : 'RABATT-SPIEL', 12, H - 12);
    if (fly && now < fly.t0) {
      const n = Math.ceil((fly.t0 - now) / 400), f = 1 - (((fly.t0 - now) % 400) / 400);
      cx.save(); cx.globalAlpha = 1 - f * 0.6; cx.fillStyle = INK; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.font = `900 ${Math.round(Math.min(W, H) * (0.42 + f * 0.12))}px 'Archivo','Arial Narrow',sans-serif`; cx.fillText(String(n), W / 2, H / 2); cx.restore();
    } else if (fly) {
      const pts = []; for (let i = 0; i <= 12; i++) { const q = posAt(fly, Math.max(fly.t0, now - i * 14)); pts.push(eye(q)); }
      for (let i = W < 520 ? 3 : 5; i >= 1; i--) { const q = posAt(fly, now - i * 18); if (q.p >= 0) tag(q.x, q.y, q.rot, q.flip, 0.06 + 0.04 * (5 - i), false); }
      rope(pts);
      const s = posAt(fly, now); tag(s.x, s.y, s.rot, s.flip, 1, true);
    } else if (frozen) {
      const e = eye(frozen); rope([e, { x: e.x - 30, y: e.y + 18 }, { x: e.x - 70, y: e.y + 26 }]);
      tag(frozen.x, frozen.y, frozen.rot, frozen.flip, 1, true);
      cx.strokeStyle = frozen.win ? '#2F6B4F' : '#B23A2E'; cx.lineWidth = 2; cx.setLineDash([4, 4]);
      cx.beginPath(); cx.moveTo(frozen.x, H * 0.12); cx.lineTo(frozen.x, H * 0.88); cx.stroke(); cx.setLineDash([]);
    } else {
      const q = idlePose(now), e = eye(q);
      rope([{ x: 0, y: q.y - 30 }, { x: e.x * 0.5, y: q.y + 14 }, e]);
      tag(q.x, q.y, q.rot, q.flip, 1, true);
    }
    rings.forEach((r) => { if (r.r <= 0) return; cx.globalAlpha = Math.max(0, r.l); cx.lineWidth = 3; cx.strokeStyle = `hsl(${(r.r * 3) % 360},85%,70%)`; cx.beginPath(); cx.arc(r.x, r.y, r.r, 0, 7); cx.stroke(); });
    parts.forEach((q) => { cx.globalAlpha = Math.max(0, q.l); cx.fillStyle = q.c; if (q.star) star(q.x, q.y, q.s); else cx.fillRect(q.x, q.y, q.s, q.s * 0.6); });
    cx.globalAlpha = 1;
  }
  function loop(now) {
    if (fly) {
      const s = posAt(fly, now);
      if (s.p >= 0 && Math.random() < 0.7) parts.push({ x: s.x - 20, y: s.y + (Math.random() - 0.5) * 30, vx: -1 - Math.random() * 2, vy: (Math.random() - 0.5) * 1.2, g: 0, l: 0.7, s: 2 + Math.random() * 3, star: true, c: `hsl(${Math.random() * 360},90%,75%)` });
      if (s.p >= 1) { const f = fly; fly = null; miss(null, f); }
    }
    parts.forEach((q) => { q.x += q.vx; q.y += q.vy; q.vy += q.g; q.l -= 0.018; });
    parts = parts.filter((q) => q.l > 0);
    rings.forEach((r) => { r.r += 6; r.l -= 0.03; }); rings = rings.filter((r) => r.l > 0);
    draw(now);
    const idle = !fly && !frozen && visible && !reduce;
    anim = fly || parts.length || rings.length || idle ? requestAnimationFrame(loop) : 0;
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kick = () => { if (!anim) anim = requestAnimationFrame(loop); };
  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) kick(); }).observe(stage);
  function burst(x, y, win) {
    if (win) { rings.push({ x, y, r: 10, l: 1 }, { x, y, r: -30, l: 1.3 }); }
    for (let i = 0; i < (win ? 120 : 26); i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * (win ? 8 : 3);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, g: 0.22, l: 1, s: 3 + Math.random() * 5, star: win && i % 3 === 0,
        c: win ? `hsl(${Math.random() * 360},85%,${60 + Math.random() * 20}%)` : (i % 2 ? '#6F6A63' : '#B23A2E') });
    }
    kick();
  }
  function triesUI() {
    const btn = $('#play-btn');
    if (code) { $('#tries').textContent = 'Gewonnen! Dein Code ist aktiv.'; btn.textContent = 'Zum Spaß nochmal'; btn.disabled = false; return; }
    const left = SPIEL.versuche > 0 ? SPIEL.versuche - gs.used : Infinity;
    $('#tries').innerHTML = SPIEL.versuche > 0
      ? Array.from({ length: SPIEL.versuche }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('') + `<span>${left > 0 ? left + (left === 1 ? ' Versuch' : ' Versuche') + ' übrig heute' : 'Morgen wieder'}</span>`
      : '<span>Unbegrenzt viele Versuche · bis du 20 % gewinnst</span>';
    btn.textContent = 'Spiel starten'; btn.disabled = SPIEL.versuche > 0 && left <= 0;
  }
  const overlay = (h) => { $('#res-in').innerHTML = h; $('#result').hidden = false; };
  const codeBox = () => `<div class="codebox"><span>${esc(code)}</span><button type="button" data-copy>Kopieren</button></div>`;
  function gameIdle() {
    triesUI();
    if (code) overlay(`<div class="big win">${SPIEL.prozent}&nbsp;% gesichert</div>${codeBox()}<div class="sub">${SPIEL.anKasse ? 'Wird im Warenkorb automatisch abgezogen' : 'Steht im Warenkorb, schick ihn mir nach der Bestellung'}</div><button class="btn line" type="button" data-start>Zum Spaß nochmal</button>`);
    else if (SPIEL.versuche > 0 && gs.used >= SPIEL.versuche) overlay(`<div class="big lose">Für heute vorbei</div><div class="sub">Morgen gibt es ${SPIEL.versuche} neue Versuche</div>`);
    else overlay(`<div class="big">Bereit?</div><div class="sub">Tipp, wenn das Etikett auf der Linie ist</div><button class="btn" type="button" data-start>Spiel starten</button>`);
  }
  function start() {
    if (fly) return;
    const practice = !!code;
    if (!practice) { if (SPIEL.versuche > 0 && gs.used >= SPIEL.versuche) return; gs.used++; store.set('belo_spiel', gs); triesUI(); }
    $('#result').hidden = true; frozen = null; parts = []; rings = []; size();
    zx = W * (0.3 + Math.random() * 0.4);
    const half = dims().w / 2, [a, b] = SPIEL.flugzeit;
    const base = a + Math.random() * (b - a) - (practice ? 0 : (gs.used - 1) * 0.07);
    fly = { t0: performance.now() + 1200, dur: base * 1000, from: -half - 40, to: W + half + 40,
      a: 0.35 + Math.random() * 0.3, k: 1 + Math.floor(Math.random() * 2), ph: Math.random() * 6.28,
      wv: 1 + Math.random() * 2, ph2: Math.random() * 6.28, spin: (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random()), practice };
    const r = stage.getBoundingClientRect();
    if (r.top < 70 || r.bottom > window.innerHeight) stage.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    stage.focus({ preventScroll: true }); kick();
  }
  function stop(t) {
    if (!fly || t < fly.t0) return;
    const f = fly; fly = null;
    const s = posAt(f, t), dist = Math.abs(s.x - zx), win = dist <= tol;
    frozen = { x: s.x, y: s.y, rot: s.rot, flip: win ? 0 : s.flip, win };
    burst(s.x, s.y, win);
    if (!win) { miss(dist, f); return; }
    if (!f.practice) {
      code = 'BELO' + SPIEL.prozent + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      store.set('belo_code', code); ticker(); render(); triesUI();
    }
    setTimeout(() => overlay(`<div class="big win">Treffer! −${SPIEL.prozent}&nbsp;%</div><div class="sub">Nur ${Math.round(dist)} px daneben</div>${f.practice ? '' : codeBox()}`), 750);
  }
  function miss(dist, f) {
    const left = SPIEL.versuche > 0 ? SPIEL.versuche - gs.used : Infinity;
    const tail = f.practice ? '' : SPIEL.versuche === 0 ? 'Du kannst es direkt nochmal versuchen.' : left > 0 ? 'Noch ' + left + (left === 1 ? ' Versuch' : ' Versuche') + ' heute' : 'Morgen hast du neue Versuche';
    const h = dist === null ? `<div class="big lose">Zu spät</div><div class="sub">Es ist durchgeflogen. ${tail}</div>`
      : dist < W * 0.06 ? `<div class="big near">So knapp!</div><div class="sub">${Math.round(dist)} px daneben. ${tail}</div>`
      : `<div class="big lose">Daneben</div><div class="sub">${Math.round(dist)} px daneben. ${tail}</div>`;
    const again = f.practice || SPIEL.versuche === 0 || left > 0 ? `<button class="btn" type="button" data-start>${f.practice ? 'Nochmal' : 'Nächster Versuch'}</button>` : '';
    setTimeout(() => overlay(h + again), dist === null ? 0 : 600);
    kick();
  }
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-copy]')) { copy(code); return; }
    if (e.target.closest('[data-start]')) { e.preventDefault(); start(); return; }
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
  setInterval(syncSold, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncSold(); });
})();
