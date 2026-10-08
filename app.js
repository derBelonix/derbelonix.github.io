/* Shop-Logik – hier musst du normalerweise nichts ändern. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const euro = (n) => Number(n).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];
  const DEMO = !SHOP.bestellURL;  // ohne bestellURL kein Abgleich verkaufter Teile
  const soldRemote = new Set();
  const isSold = (p) => !!p.verkauft || soldRemote.has(p.id);
  const byId = (id) => PRODUKTE.find((x) => x.id === id);
  const SHIP = Number(SHOP.versandkosten || 0);
  const MAX_CART = 10;

  // ---------- Warenkorb (bleibt im Browser gespeichert) ----------
  const CART_KEY = 'belo_warenkorb';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]').filter((id) => typeof id === 'string'); } catch (e) { cart = []; }
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} };
  const inCart = (id) => cart.includes(id);
  const cartItems = () => cart.map(byId).filter(Boolean);
  function updateBadge(bump) {
    const n = cart.length, b = document.querySelector('#cart-btn');
    document.querySelector('#cart-n').textContent = n;
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
  // verkaufte oder gelöschte Teile automatisch aus dem Korb nehmen
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
  const marks = (SHOP.marken && SHOP.marken.length ? SHOP.marken : ['Vintage', 'Streetwear']);
  const one = '<span>' + marks.map((m) => esc(m) + ' <b>✦</b>').join(' ') + ' Einzelstücke <b>✦</b> Versand in 48h <b>✦</b></span>';
  $('#ticker').innerHTML = one + one;
  const c = [];
  if (SHOP.instagram) c.push(`<a href="https://instagram.com/${esc(SHOP.instagram)}" target="_blank" rel="noopener">Instagram @${esc(SHOP.instagram)}</a>`);
  if (SHOP.email) c.push(`<a href="mailto:${esc(SHOP.email)}">${esc(SHOP.email)}</a>`);
  $('#contact').innerHTML = c.join('');

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
    $('#live-n').textContent = PRODUKTE.filter((p) => !isSold(p)).length;
    const list = PRODUKTE.map((p, i) => ({ p, i }))
      .filter(({ p }) => (st.cat === 'Alle' || p.kategorie === st.cat) && (!st.size || p.groesse === st.size) && (!st.avail || !isSold(p)))
      .sort((a, b) => {
        if (isSold(a.p) !== isSold(b.p)) return isSold(a.p) ? 1 : -1;
        if (st.sort === 'preis-auf') return a.p.preis - b.p.preis;
        if (st.sort === 'preis-ab') return b.p.preis - a.p.preis;
        return (b.p.neu === true) - (a.p.neu === true) || a.i - b.i;
      });
    $('#grid').innerHTML = list.length ? list.map(({ p }) => {
      const sold = isSold(p);
      return `<button class="card${sold ? ' sold' : ''}" type="button" data-id="${esc(p.id)}" aria-label="${esc(p.titel)}, ${esc(euro(p.preis))}${sold ? ', verkauft' : ''}">
        <span class="media">
          <img src="${esc(p.bilder[0])}" alt="" loading="lazy">
          ${p.bilder[1] && !sold ? `<img class="alt" src="${esc(p.bilder[1])}" alt="" loading="lazy">` : ''}
          ${sold ? '<span class="pill">Sold</span>' : inCart(p.id) ? '<span class="pill incart">Im Warenkorb</span>' : p.neu ? '<span class="pill new">Neu</span>' : ''}
          <span class="size">${esc(p.groesse)}</span>
        </span>
        <span class="meta"><span class="b">${esc(p.marke)}</span><span class="t">${esc(p.titel)}</span><span class="p">${esc(euro(p.preis))}</span></span>
      </button>`;
    }).join('') : '<p class="empty">Gerade nichts in dieser Auswahl. Schau bald wieder rein.</p>';
  }
  $('#grid').addEventListener('click', (e) => { const b = e.target.closest('.card'); if (b) openItem(b.dataset.id, b); });

  // ---------- Verkaufsstatus vom Bestellsystem holen ----------
  async function syncSold() {
    if (DEMO) return;
    try {
      const r = await fetch(SHOP.bestellURL + (SHOP.bestellURL.includes('?') ? '&' : '?') + 't=' + Date.now());
      const d = await r.json();
      if (d && d.sold) {
        soldRemote.clear(); d.sold.forEach((id) => soldRemote.add(String(id))); render();
        const gone = pruneCart();
        if (gone.length) {
          toast((gone.length === 1 ? '„' + ((byId(gone[0]) || {}).titel || 'Ein Teil') + '“ wurde verkauft' : gone.length + ' Teile wurden verkauft') + ' und aus deinem Warenkorb entfernt.');
          if (!$('#drawer').hidden && !$('#step-checkout').hidden) renderCart();
        }
      }
    } catch (e) { /* offline oder noch nicht eingerichtet: Seite funktioniert trotzdem */ }
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
    $('#d-price').textContent = euro(p.preis);
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
    if (isSold(p)) { box.innerHTML = '<div class="soldbox">Schon verkauft – schnell sein lohnt sich beim nächsten Drop.</div>'; return; }
    if (inCart(p.id)) {
      box.innerHTML = `<button class="buy" type="button" data-act="cart">Im Warenkorb ✓ · Zur Kasse</button>
        <button class="buy ghost" type="button" data-act="more">Weiter stöbern</button>`;
    } else {
      box.innerHTML = `<button class="buy" type="button" data-act="add">In den Warenkorb · ${esc(euro(p.preis))}</button>
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

  // ---------- Galerie: Pfeile, Vorschaubilder, Zähler, Tastatur ----------
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
    const sub = items.reduce((s, p) => s + Number(p.preis), 0), total = sub + SHIP;
    $('#sum').innerHTML = `<span>${items.length} ${items.length === 1 ? 'Artikel' : 'Artikel'}</span><span>${euro(sub)}</span>
      <span>Versand <small>(nur einmal)</small></span><span>${euro(SHIP)}</span>
      <span class="tot">Gesamt</span><span class="tot">${euro(total)}</span>`;
    const btn = $('#pay-btn'); btn.disabled = false; btn.textContent = 'Zahlungspflichtig bestellen · ' + euro(total);
    $('#demo-note').hidden = LIVE;
  }
  $('#cartlist').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { const p = byId(rm.dataset.rm); removeFromCart([rm.dataset.rm]); renderCart(); if (p) toast('„' + p.titel + '“ entfernt'); return; }
    const op = e.target.closest('[data-open]'); if (op) openItem(op.dataset.open);
  });
  $('#cart-btn').addEventListener('click', () => openCart(false));
  $('#cart-shop').addEventListener('click', () => { closeDrawer(); document.querySelector('#shop').scrollIntoView({ behavior: 'smooth' }); });

  // ---------- Bezahlen (Stripe) ----------
  const LIVE = !!SHOP.bestellURL;
  async function api(body) {
    const r = await fetch(SHOP.bestellURL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    return r.json();
  }
  const ERR = {
    verkauft: 'Zu spät – ein Teil wurde gerade verkauft und aus deinem Warenkorb entfernt. Prüf kurz deinen Warenkorb.',
    unbekannt: 'Ein Teil in deinem Warenkorb ist gerade nicht kaufbar und wurde entfernt. Prüf kurz deinen Warenkorb.',
    leer: 'Dein Warenkorb ist leer.',
    zuviel: 'Maximal ' + MAX_CART + ' Teile pro Bestellung.',
    busy: 'Gerade ist viel los. Versuch es in ein paar Sekunden nochmal.',
    offen: 'Die Zahlung ist noch nicht abgeschlossen.'
  };
  const agreed = () => $('#c-agree').checked;
  $('#c-agree').addEventListener('change', () => { if (agreed()) $('#c-err').textContent = ''; });

  function finish(res) {
    const ids = res.ids || (res.id ? [res.id] : []);
    ids.forEach((id) => soldRemote.add(id));
    removeFromCart(ids); render();
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
    const total = items.reduce((s, p) => s + Number(p.preis), 0) + SHIP;
    if (!agreed()) { $('#c-err').textContent = 'Bitte bestätige zuerst die Checkbox.'; return; }
    const btn = $('#pay-btn'); btn.disabled = true; btn.textContent = 'Weiter zur Bezahlung …';
    if (!LIVE) {
      await new Promise((r) => setTimeout(r, 900));
      finish({ demo: true, bestellnr: 'DEMO-0001', gesamt: total, name: 'Max Muster', adresse: 'Musterweg 1, 50667 Köln', ids: items.map((p) => p.id) });
      return;
    }
    try {
      const res = await api({ action: 'create', ids: items.map((p) => p.id) });
      if (res.ok && res.url) { location.href = res.url; return; }
      if ((res.error === 'verkauft' || res.error === 'unbekannt') && res.ids && res.ids.length) {
        if (res.error === 'verkauft') res.ids.forEach((id) => soldRemote.add(id));
        removeFromCart(res.ids); renderCart();
      }
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
          $('#done-text').textContent = 'Deine Teile wurden kurz vor dir verkauft. Dein Geld wird automatisch erstattet – du bekommst eine Mail.';
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

  updateBadge();
  render();
  syncSold().then(async () => {
    if (await handleReturn()) return;
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === 'warenkorb') openCart(false);
    else if (h && PRODUKTE.some((p) => p.id === h)) openItem(h);
  });
  setInterval(syncSold, 60000);
})();
