/* Rammo prototype: landmark trail, tree view and compare over a real sample of the v8 tree. */
(async () => {
  const data = await (await fetch('data.json')).json();
  const N = data.nodes;
  const view = document.getElementById('view');
  const layer = document.getElementById('layer');
  const landmarks = new Set(['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']);
  const italic = new Set(['genus', 'subgenus', 'species', 'subspecies']);
  const ranks = { kingdom: 'reino', phylum: 'filo', subphylum: 'subfilo', superclass: 'superclasse', class: 'classe', subclass: 'subclasse', infraclass: 'infraclasse', superorder: 'superordem', order: 'ordem', suborder: 'subordem', infraorder: 'infraordem', superfamily: 'superfamília', family: 'família', subfamily: 'subfamília', tribe: 'tribo', genus: 'gênero', subgenus: 'subgênero', species: 'espécie', subspecies: 'subespécie', 'no rank': 'sem categoria' };
  const masc = new Set(['kingdom', 'phylum', 'genus']);
  const refs = [['Panthera leo', 'Leão'], ['Panthera tigris', 'Tigre'], ['Felis catus', 'Gato'], ['Smilodon', 'Dente-de-sabre'], ['Crocuta crocuta', 'Hiena'], ['Canis', 'Lobos e cães'], ['Homo sapiens', 'Humano'], ['Pan troglodytes', 'Chimpanzé'], ['Mammuthus', 'Mamute'], ['Balaenoptera musculus', 'Baleia-azul'], ['Pteropus vampyrus', 'Morcego'], ['Gallus gallus', 'Galinha'], ['Tyrannosaurus rex', 'T. rex'], ['Danio rerio', 'Peixe-zebra'], ['Octopus vulgaris', 'Polvo'], ['Apis mellifera', 'Abelha']].filter(([s]) => data.signposts[s]);
  const pairs = [['Tyrannosaurus rex', 'Gallus gallus', 'T. rex × galinha'], ['Panthera leo', 'Panthera tigris', 'leão × tigre'], ['Homo sapiens', 'Octopus vulgaris', 'humano × polvo'], ['Felis catus', 'Smilodon', 'gato × dente-de-sabre'], ['Balaenoptera musculus', 'Pteropus vampyrus', 'baleia × morcego']].filter(([a, b]) => data.signposts[a] && data.signposts[b]);

  // tree links
  const parent = {};
  for (const [id, n] of Object.entries(N)) for (const k of n.k || []) parent[k] ??= id;
  for (const list of Object.values(data.signposts)) list.forEach((id, i) => { if (i) parent[id] ??= list[i - 1]; });
  const tip = (sci) => data.signposts[sci].at(-1);
  // reference labels are Portuguese names for leaves without one
  for (const [id, p] of Object.entries(parent)) if (N[id].n && N[id].n === N[p]?.n) delete N[id].n;
  for (const [sci, label] of refs) N[tip(sci)].n ??= label;

  const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sciHtml = (id) => (italic.has(N[id].r) ? `<i>${esc(N[id].s)}</i>` : esc(N[id].s));
  const name = (id) => (N[id].n ? esc(N[id].n) : sciHtml(id));
  const plain = (id) => N[id].n || N[id].s;
  const second = (id) => (N[id].n ? sciHtml(id) : esc(ranks[N[id].r] || N[id].r || ''));
  const rank = (id) => ranks[N[id].r] || N[id].r || '';
  const imgOf = (id) => { const n = N[id]; if (n.im) return { src: `img/${n.im}.jpg`, of: id }; if (n.ri && N[n.ri].im) return { src: `img/${N[n.ri].im}.jpg`, of: n.ri }; return null; };
  const img = (id, cls = '') => { const im = imgOf(id); return im ? `<img src="${im.src}" alt="" loading="lazy" decoding="async" class="${cls}" onload="this.classList.add('ok')">` : `<span class="noimg ${cls}"></span>`; };
  const path = (id) => { const out = []; let c = id; const seen = new Set(); while (c && !seen.has(c)) { seen.add(c); out.unshift(c); c = parent[c]; } return out; };
  const junk = /environmental sample| x |unclassified|incertae sedis/i;
  const kidsOf = (id) => {
    const seen = new Map();
    for (const k of N[id]?.k || []) { const c = N[k]; if (!c || junk.test(c.s)) continue; const prev = seen.get(c.s); if (!prev || (c.k?.length || 0) > (N[prev].k?.length || 0)) seen.set(c.s, k); }
    const all = [...seen.values()]; const byPop = (a, b) => (N[b].p || 0) - (N[a].p || 0) || N[a].s.localeCompare(N[b].s);
    return { living: all.filter((k) => N[k].st === 'living').sort(byPop), unknown: all.filter((k) => !N[k].st).sort(byPop), extinct: all.filter((k) => N[k].st === 'extinct').sort(byPop), all };
  };
  const single = (id) => N[id]?.k && kidsOf(id).all.length === 1 && (N[id].t ?? 1) <= 1;
  const back = (id) => { let c = parent[id]; while (c && parent[c] && single(c)) c = parent[c]; return c; };
  const toast = (text) => { document.querySelector('.toast')?.remove(); const t = document.createElement('div'); t.className = 'toast'; t.textContent = text; document.body.append(t); setTimeout(() => t.remove(), 2900); };
  const icon = { tree: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v5M12 12l-6 5M12 12l6 5"/></svg>', cmp: '<svg viewBox="0 0 24 24"><path d="M7 4v16M17 4v16M7 8h10M7 16h10"/></svg>', up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>', x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>' };

  // routing with view transitions
  let depth = 0; let first = true;
  const go = (hash, dir = 'fwd') => { if (location.hash === hash) return render(dir); history.pushState({ d: ++depth }, '', hash); render(dir); };
  window.addEventListener('popstate', (e) => { const d = e.state?.d ?? 0; const dir = d < depth ? 'bwd' : 'fwd'; depth = d; closeLayer(); render(dir); });
  function render(dir = 'fwd') {
    const draw = () => { const [, kind, a, b] = location.hash.split('/'); if (kind === 'compare') drawCompare(a, b); else drawGroup(N[a] ? a : data.root); view.focus({ preventScroll: true }); };
    if (!document.startViewTransition || first || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) { first = false; draw(); window.scrollTo(0, 0); return; }
    document.documentElement.classList.remove('fwd', 'bwd'); document.documentElement.classList.add(dir);
    const vt = document.startViewTransition(() => { draw(); window.scrollTo(0, 0); });
    vt.ready.catch(() => {}); vt.finished.catch(() => {}); vt.updateCallbackDone.catch(() => {});
  }
  const openGroup = (id, dir) => {
    const skipped = []; let c = id;
    if (dir !== 'bwd') while (single(c)) { skipped.push(plain(c)); c = kidsOf(c).all[0]; }
    go(`#/g/${c}`, dir); if (skipped.length) toast(`Atravessei ${skipped.join(', ')}: só um ramo`);
  };

  // landmark trail
  let showMid = false; let open = {};
  function drawGroup(id) {
    const n = N[id]; const p = path(id); const anc = p.slice(0, -1); const g = kidsOf(id); const im = imgOf(id); const b = back(id);
    let trail = ''; let gap = [];
    const flush = () => { if (!gap.length) return; trail += showMid ? gap.map((x) => `<button class="mid press" data-g="${x}" data-dir="bwd">${name(x)}</button><span class="sep">›</span>`).join('') : `<button class="gap" data-act="mid">+${gap.length}</button><span class="sep">›</span>`; gap = []; };
    anc.forEach((a, i) => { if (i === 0 || landmarks.has(N[a].r)) { flush(); trail += `<button class="press" data-g="${a}" data-dir="bwd">${name(a)}</button><span class="sep">›</span>`; } else gap.push(a); });
    flush();
    const card = (k) => { const ki = imgOf(k); return `<button class="card press" data-g="${k}"><span class="ph">${img(k)}${ki && ki.of !== k ? `<span class="ex">ex.: ${esc(plain(ki.of))}</span>` : ''}</span><span class="tx"><strong>${name(k)}</strong><span>${second(k)}</span>${N[k].t ? `<span>${N[k].t} ${N[k].t === 1 ? 'ramo' : 'ramos'}</span>` : ''}</span></button>`; };
    const rows = (list) => `<ul>${list.map((k) => `<li><button class="row" data-g="${k}"><span>${N[k].st === 'extinct' ? '† ' : ''}${name(k)}</span><span>${rank(k)}${N[k].t ? ` · ${N[k].t} ramos` : ''}</span></button></li>`).join('')}</ul>`;
    const acc = (key, title, list) => (list.length ? `<section class="acc"><button data-act="acc" data-key="${key}" aria-expanded="${!!open[key]}"><span>${title} (${list.length})</span><span>${open[key] ? 'fechar' : 'abrir'}</span></button>${open[key] ? rows(list) : ''}</section>` : '');
    const firstCards = g.living.length ? g.living : g.unknown.slice(0, 8);
    const restUnknown = g.living.length ? g.unknown : g.unknown.slice(8);
    view.innerHTML = `
      <div class="topline">${b ? `<button class="back" data-g="${b}" data-dir="bwd">‹ <span>${name(b)}</span></button>` : '<span></span>'}
        <span style="display:flex;gap:6px"><button class="chipbtn press" data-act="tree">${icon.tree}Ver árvore</button><button class="chipbtn press" data-act="cmp">${icon.cmp}Comparar</button></span></div>
      <nav class="path" aria-label="Caminho">${trail}<button class="here" aria-current="page">${name(id)}</button></nav>
      <section class="hero">${im ? `<img src="${im.src}" alt="">` : ''}${im && im.of !== id ? `<span class="cap">ex.: ${esc(plain(im.of))}</span>` : ''}
        <div class="veil"><div class="tags">${n.st === 'living' ? '<span class="tag living">vivo</span>' : n.st === 'extinct' ? '<span class="tag extinct">† extinto</span>' : ''}<span class="tag">${rank(id)}</span></div>
        <h1>${name(id)}</h1>${n.n ? `<div class="sci">${sciHtml(id)}</div>` : ''}</div></section>
      ${n.k ? `<p class="stats"><span><b>${g.living.length}</b> vivos</span><span><b>${g.extinct.length}</b> extintos</span>${g.unknown.length ? `<span><b>${g.unknown.length}</b> sem status</span>` : ''}</p>` : ''}
      ${n.d ? `<p class="lead">${esc(n.d)}</p>` : ''}
      ${firstCards.length ? `<h2 class="sec">${g.living.length ? 'Ramos vivos' : 'Ramos'}<span>mais procurados primeiro</span></h2><div class="cards">${firstCards.map(card).join('')}</div>` : ''}
      ${acc('unknown', 'Sem status confirmado', restUnknown)}
      ${acc('extinct', '† Linhagens extintas', g.extinct)}
      ${!n.k && n.t ? `<p class="note">${n.t} ramos abaixo, fora desta amostra do protótipo.</p>` : ''}
      ${!n.t && !n.k ? '<p class="note">Fim do ramo nesta amostra.</p>' : ''}
      <button class="peek press" data-act="sheet">${im ? `<img src="${im.src}" alt="">` : '<span class="noimg"></span>'}<div><strong>Ficha de ${name(id)}</strong><small>descrição, fatos e fontes</small></div>${icon.up}</button>`;
    view.dataset.id = id;
    view.querySelector('.path').scrollLeft = 9999;
  }

  // bottom sheet
  function openSheet(id) {
    const n = N[id]; const im = imgOf(id);
    const facts = [['Categoria', rank(id)], ['Status', n.st === 'living' ? 'Vivo' : n.st === 'extinct' ? 'Extinto' : 'Sem status nas fontes'], ['Ramos', n.t != null ? `${n.t}` : '—'], ...(n.f || []).map(([k, v]) => [k === 'Described by' ? 'Descrito por' : k === 'Environment' ? 'Ambiente' : k === 'Records' ? 'Registros' : k, v])];
    layer.innerHTML = `<div class="scrim" data-act="close"></div><section class="sheet" role="dialog" aria-label="Ficha"><div class="grip" data-act="grow"><span></span></div><div class="body">
      <div class="tags">${n.st === 'living' ? '<span class="tag living">vivo</span>' : n.st === 'extinct' ? '<span class="tag extinct">† extinto</span>' : ''}<span class="tag">${rank(id)}</span></div>
      <h3>${name(id)}</h3>${n.n ? `<div class="sci" style="color:var(--ink-2)">${sciHtml(id)}</div>` : ''}
      ${n.d ? `<p class="desc">${esc(n.d)}</p>` : '<p class="desc" style="color:var(--ink-3)">Sem descrição publicada para este grupo.</p>'}
      <dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${im ? `<p class="credit">${im.of !== id ? `Foto de um membro: ${sciHtml(im.of)} · ` : 'Foto · '}${esc(N[im.of].by || 'autor na fonte')}${N[im.of].lic ? ' · ' + esc(N[im.of].lic) : ''} · Wikimedia Commons</p>` : ''}
    </div></section>`;
    const sheet = layer.querySelector('.sheet'); const grip = sheet.querySelector('.grip');
    let y0 = 0; let h0 = 0; let moved = false;
    grip.addEventListener('pointerdown', (e) => { y0 = e.clientY; h0 = sheet.offsetHeight; moved = false; sheet.style.transition = 'none'; grip.setPointerCapture(e.pointerId); });
    grip.addEventListener('pointermove', (e) => { if (!grip.hasPointerCapture(e.pointerId)) return; const dy = y0 - e.clientY; if (Math.abs(dy) > 4) moved = true; sheet.style.height = `${Math.max(120, h0 + dy)}px`; });
    grip.addEventListener('pointerup', () => { sheet.style.transition = ''; const h = sheet.offsetHeight; sheet.style.height = ''; if (!moved) { sheet.classList.toggle('full'); return; } if (h < innerHeight * 0.38) closeLayer(); else sheet.classList.toggle('full', h > innerHeight * 0.75); });
  }
  const closeLayer = () => { layer.innerHTML = ''; document.body.style.overflow = ''; };

  // tree view, generated from the current group
  function openTree(id) {
    const wide = innerWidth >= 900; const R = 22; const dStep = 92; const bStep = 76; const maxRow = 12;
    const anc = path(id).slice(0, -1); const par = anc.at(-1);
    const trunk = anc.filter((a, i) => i === 0 || landmarks.has(N[a].r) || a === par);
    const limit = (list, keep) => { if (list.length <= maxRow) return { shown: list, more: 0 }; const shown = list.slice(0, maxRow - 1); if (keep && !shown.includes(keep)) shown[shown.length - 1] = keep; return { shown, more: list.length - shown.length }; };
    const sib = limit(par ? kidsOf(par).all : [id], id); if (!sib.shown.includes(id)) sib.shown.unshift(id);
    const kid = limit(kidsOf(id).all);
    const ci = sib.shown.indexOf(id); const kidCount = kid.shown.length + (kid.more ? 1 : 0);
    const kidStart = Math.max(0, ci - (kidCount - 1) / 2);
    const slots = Math.max(sib.shown.length + (sib.more ? 1 : 0), kidStart + kidCount, 1); const center = (slots - 1) / 2;
    const nodes = [];
    trunk.forEach((t, d) => nodes.push({ id: t, d, b: center }));
    const sd = trunk.length;
    sib.shown.forEach((s, i) => nodes.push({ id: s, d: sd, b: i, cur: s === id }));
    if (sib.more) nodes.push({ more: sib.more, d: sd, b: sib.shown.length });
    kid.shown.forEach((k, i) => nodes.push({ id: k, d: sd + 1, b: kidStart + i }));
    if (kid.more) nodes.push({ more: kid.more, d: sd + 1, b: kidStart + kid.shown.length });
    const pos = (e) => { const along = 40 + e.b * bStep; const deep = 52 + e.d * dStep; return wide ? { x: deep, y: along } : { x: along, y: deep }; };
    const depthCount = sd + (kidCount ? 2 : 1);
    const W = wide ? 140 + depthCount * dStep + 120 : 80 + slots * bStep; const H = wide ? 80 + slots * bStep : 120 + depthCount * dStep;
    const curve = (a, b) => { const p = pos(a); const q = pos(b); return wide ? `M${p.x},${p.y} C${(p.x + q.x) / 2},${p.y} ${(p.x + q.x) / 2},${q.y} ${q.x},${q.y}` : `M${p.x},${p.y} C${p.x},${(p.y + q.y) / 2} ${q.x},${(p.y + q.y) / 2} ${q.x},${q.y}`; };
    const edges = [];
    for (let i = 1; i < trunk.length; i += 1) edges.push([nodes[i - 1], nodes[i]]);
    const parentNode = trunk.length ? nodes[trunk.length - 1] : null; const curNode = nodes.find((e) => e.cur);
    if (parentNode) nodes.filter((e) => e.d === sd).forEach((e) => edges.push([parentNode, e]));
    if (curNode) nodes.filter((e) => e.d === sd + 1).forEach((e) => edges.push([curNode, e]));
    let svg = edges.map(([a, b]) => `<path d="${curve(a, b)}" fill="none" stroke="${N[b.id]?.st === 'extinct' ? 'rgba(231,173,95,.6)' : 'rgba(190,220,205,.3)'}" stroke-width="2.5" stroke-linecap="round" ${N[b.id]?.st === 'extinct' ? 'stroke-dasharray="5 4"' : ''}/>`).join('');
    nodes.forEach((e, i) => {
      const { x, y } = pos(e);
      if (e.more) { svg += `<circle cx="${x}" cy="${y}" r="${R - 4}" fill="var(--bg-2)" stroke="var(--line-2)"/><text x="${x}" y="${y + 4}" text-anchor="middle" fill="var(--ink-3)" font-size="12">+${e.more}</text>`; return; }
      const n = N[e.id]; const im = imgOf(e.id); const st = n.st;
      const stroke = st === 'extinct' ? 'var(--fossil)' : st === 'living' ? 'var(--living)' : 'rgba(150,170,165,.5)';
      const label = plain(e.id); const short = label.length > 16 ? `${label.slice(0, 15)}…` : label;
      svg += `<g class="tn" data-g="${e.id}" role="button" tabindex="0"><circle cx="${x}" cy="${y}" r="${R}" fill="var(--bg-3)" stroke="${stroke}" stroke-width="2" ${st === 'extinct' ? 'stroke-dasharray="4 3"' : ''}/>`;
      if (im) svg += `<clipPath id="c${i}"><circle cx="${x}" cy="${y}" r="${R - 1}"/></clipPath><image href="${im.src}" x="${x - R}" y="${y - R}" width="${R * 2}" height="${R * 2}" clip-path="url(#c${i})" preserveAspectRatio="xMidYMid slice" ${st === 'extinct' ? 'opacity=".55"' : ''}/>`;
      if (e.cur) svg += `<circle cx="${x}" cy="${y}" r="${R + 5}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`;
      if (st === 'extinct') svg += `<text x="${x + R - 2}" y="${y - R + 6}" fill="var(--fossil)" font-weight="700" font-size="14">†</text>`;
      svg += `<text x="${x}" y="${y + R + 15}" text-anchor="middle" fill="${e.cur ? 'var(--ink)' : 'var(--ink-2)'}" font-size="11.5" font-weight="${e.cur ? 700 : 400}" paint-order="stroke" stroke="var(--bg)" stroke-width="3" ${!n.n && italic.has(n.r) ? 'font-style="italic"' : ''}>${esc(short)}</text><text x="${x}" y="${y + R + 28}" text-anchor="middle" fill="var(--ink-3)" font-size="9.5">${esc(rank(e.id))}</text></g>`;
    });
    document.body.style.overflow = 'hidden';
    layer.innerHTML = `<section class="screen" role="dialog" aria-label="Árvore até aqui"><header><div><small>Árvore até aqui</small><strong>${name(id)}</strong></div><button class="close" data-act="close" aria-label="Fechar">${icon.x}</button></header>
      <div class="legend"><span><i style="background:var(--living)"></i>vivo</span><span><i style="border:1.5px dashed var(--fossil)"></i>† extinto</span><span><i style="background:#56645f"></i>sem status</span></div>
      <div class="canvas"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg></div>
      <p class="hint">Toque num grupo para ir até ele. Vivos e extintos ficam na mesma árvore.</p></section>`;
    const canvas = layer.querySelector('.canvas'); const cp = pos(curNode || nodes.at(-1));
    canvas.scrollTo(cp.x - canvas.clientWidth / 2, cp.y - canvas.clientHeight / 2);
  }

  // search over the sample
  const index = Object.entries(N).map(([id, n]) => [id, `${n.s} ${n.n || ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()]);
  function openSearch(onPick) {
    document.body.style.overflow = 'hidden';
    layer.innerHTML = `<section class="screen" role="dialog" aria-label="Buscar"><header><div><small>Buscar na amostra</small><strong>${onPick ? 'Escolha um ser' : 'Buscar'}</strong></div><button class="close" data-act="close" aria-label="Fechar">${icon.x}</button></header>
      <label class="searchbox"><input id="q" type="search" placeholder="leão, Felidae, polvo, galinha…" autocomplete="off" enterkeyhint="search"></label><ul class="results" id="res"></ul></section>`;
    const input = layer.querySelector('#q'); const res = layer.querySelector('#res');
    const show = () => {
      const q = input.value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
      const hits = q.length < 2 ? refs.map(([s]) => tip(s)) : index.filter(([, t]) => t.includes(q)).map(([id]) => id).sort((a, b) => (N[b].p || 0) - (N[a].p || 0)).slice(0, 30);
      res.innerHTML = hits.map((id) => `<li><button data-pick="${id}">${img(id)}<div><strong>${name(id)}</strong><small>${rank(id)} · ${path(id).slice(0, -1).filter((a) => landmarks.has(N[a].r)).slice(-2).map(plain).map(esc).join(' › ')}</small></div></button></li>`).join('');
    };
    input.addEventListener('input', show); show(); setTimeout(() => input.focus(), 60);
    res.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; closeLayer(); if (onPick) onPick(b.dataset.pick); else openGroup(b.dataset.pick); });
  }

  // compare
  function drawCompare(a, b) {
    a = N[a] ? a : tip('Tyrannosaurus rex'); b = N[b] ? b : tip('Gallus gallus');
    const la = path(a); const lb = path(b); let m = 0; while (m < la.length && m < lb.length && la[m] === lb[m]) m += 1;
    const mrca = la[m - 1]; const shared = la.slice(0, m); const marks = shared.filter((x, i) => i === 0 || landmarks.has(N[x].r));
    const side = (l) => l.slice(m, -1).filter((x) => landmarks.has(N[x].r)).slice(-4);
    const W = 360; const H = 330; const top = 64; const my = 250; const cx = W / 2; const xa = 78; const xb = W - 78;
    const ya = N[a].st === 'extinct' ? top + 44 : top; const yb = N[b].st === 'extinct' ? top + 44 : top;
    const along = (t, x, y) => ({ x: cx + (x - cx) * t, y: my + (y - my) * t - Math.sin(t * Math.PI) * 10 });
    let svg = `<line x1="20" x2="${W - 20}" y1="${top}" y2="${top}" stroke="rgba(111,214,156,.3)" stroke-dasharray="2 4"/><text x="20" y="${top + 40}" fill="var(--living)" font-size="9" letter-spacing="1">HOJE</text>
      <path d="M${cx},${H - 8} L${cx},${my}" stroke="rgba(190,220,205,.35)" stroke-width="5" stroke-linecap="round"/>
      <path d="M${cx},${my} Q${cx},${ya + 30} ${xa},${ya + 22}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>
      <path d="M${cx},${my} Q${cx},${yb + 30} ${xb},${yb + 22}" fill="none" stroke="var(--compare-b)" stroke-width="4" stroke-linecap="round"/>`;
    const dots = (list, x, y, anchor, color) => list.forEach((id, i, arr) => { const p = along((i + 1) / (arr.length + 1), x, y + 22); svg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${color}"/><text x="${p.x + (anchor === 'end' ? -7 : 7)}" y="${p.y + 3}" text-anchor="${anchor}" fill="var(--ink-3)" font-size="9.5">${esc(plain(id))}</text>`; });
    dots(side(la), xa, ya, 'end', 'var(--accent)'); dots(side(lb), xb, yb, 'start', 'var(--compare-b)');
    const tipSvg = (id, x, y, color, key) => { const im = imgOf(id); return `${im ? `<clipPath id="t${key}"><circle cx="${x}" cy="${y}" r="26"/></clipPath><image href="${im.src}" x="${x - 26}" y="${y - 26}" width="52" height="52" clip-path="url(#t${key})" preserveAspectRatio="xMidYMid slice"/>` : `<circle cx="${x}" cy="${y}" r="26" fill="var(--bg-3)"/>`}<circle cx="${x}" cy="${y}" r="26" fill="none" stroke="${color}" stroke-width="2.5"/>${N[id].st === 'extinct' ? `<text x="${x + 22}" y="${y - 18}" fill="var(--fossil)" font-weight="700">†</text>` : ''}<text x="${x}" y="${y - 34}" text-anchor="middle" fill="var(--ink)" font-size="12.5" font-weight="650">${esc(plain(id))}</text>`; };
    svg += tipSvg(a, xa, ya, 'var(--accent)', 'a') + tipSvg(b, xb, yb, 'var(--compare-b)', 'b');
    svg += `<circle cx="${cx}" cy="${my}" r="9" fill="var(--bg)" stroke="var(--ink)" stroke-width="2.5"/><text x="${cx}" y="${my + 26}" text-anchor="middle" fill="var(--ink)" font-size="13.5" font-weight="700">${esc(plain(mrca))}</text><text x="${cx}" y="${my + 41}" text-anchor="middle" fill="var(--ink-3)" font-size="10">ancestral comum · ${esc(rank(mrca))}</text>`;
    const same = landmarks.has(N[mrca].r) ? `${masc.has(N[mrca].r) ? 'do mesmo' : 'da mesma'} ${rank(mrca)}` : 'do mesmo clado';
    const slot = (id, c, key) => `<button class="slot press" style="--c:${c}" data-act="slot" data-key="${key}">${img(id)}<div><strong>${name(id)}</strong><small>trocar</small></div></button>`;
    view.innerHTML = `<div class="compare"><h1>Onde as linhagens se encontram?</h1><p class="sub">Escolha dois seres. O app mostra o ancestral comum e o que eles compartilham.</p>
      <div class="slots">${slot(a, 'var(--accent)', 'a')}${slot(b, 'var(--compare-b)', 'b')}</div>
      <div class="pairs">${pairs.map(([x, y, t]) => `<button class="press" data-pair="${tip(x)}|${tip(y)}">${t}</button>`).join('')}</div>
      <div class="reel">${refs.map(([s, label]) => `<button class="press ${tip(s) === a ? 'a' : tip(s) === b ? 'b' : ''}" data-ref="${tip(s)}">${img(tip(s))}<span>${esc(label)}</span></button>`).join('')}</div>
      ${a === b ? '<p class="note">Escolha dois seres diferentes.</p>' : `<svg class="fork" viewBox="0 0 ${W} ${H}" role="img" aria-label="Linhagens se encontram em ${esc(plain(mrca))}">${svg}</svg>
      <div class="verdict"><strong>${name(a)} e ${name(b)} são ${same}: ${name(mrca)}.</strong><p>É o grupo mais restrito que contém os dois. O quanto são próximos depende do tempo desde esse ancestral, não do número de grupos no caminho.</p><button class="go press" data-g="${mrca}">Explorar ${name(mrca)}</button></div>
      <div class="shared"><small>Os dois são:</small><div>${marks.map((x) => `<span>${name(x)}</span>`).join('')}${shared.length > marks.length ? `<span>+${shared.length - marks.length} clados</span>` : ''}</div></div>`}</div>`;
    view.dataset.a = a; view.dataset.b = b;
  }

  // events
  document.addEventListener('click', (e) => {
    const t = e.target;
    const g = t.closest('[data-g]');
    if (g) { e.preventDefault(); closeLayer(); if (g.dataset.dir === 'bwd') { showMid = false; open = {}; go(`#/g/${g.dataset.g}`, 'bwd'); } else { showMid = false; open = {}; openGroup(g.dataset.g); } return; }
    const act = t.closest('[data-act]')?.dataset.act;
    if (act === 'mid') { showMid = true; drawGroup(view.dataset.id); return; }
    if (act === 'acc') { const k = t.closest('[data-act]').dataset.key; open[k] = !open[k]; const y = scrollY; drawGroup(view.dataset.id); scrollTo(0, y); return; }
    if (act === 'sheet') return openSheet(view.dataset.id);
    if (act === 'tree') return openTree(view.dataset.id);
    if (act === 'cmp') return go(`#/compare/${view.dataset.id}/${tip('Homo sapiens')}`);
    if (act === 'close') return closeLayer();
    if (act === 'slot') { const key = t.closest('[data-act]').dataset.key; return openSearch((id) => go(key === 'a' ? `#/compare/${id}/${view.dataset.b}` : `#/compare/${view.dataset.a}/${id}`, 'fwd')); }
    const pair = t.closest('[data-pair]'); if (pair) { const [x, y] = pair.dataset.pair.split('|'); return go(`#/compare/${x}/${y}`); }
    const ref = t.closest('[data-ref]'); if (ref) { const id = ref.dataset.ref; const { a, b } = view.dataset; if (id !== a && id !== b) go(`#/compare/${b}/${id}`); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLayer(); if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.tn')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  document.getElementById('openSearch').addEventListener('click', () => openSearch());
  document.getElementById('openCompare').addEventListener('click', () => go(`#/compare/${tip('Tyrannosaurus rex')}/${tip('Gallus gallus')}`));
  document.getElementById('home').addEventListener('click', () => go(`#/g/${data.root}`, 'bwd'));
  history.replaceState({ d: 0 }, '', location.hash || `#/g/${data.root}`);
  render('fwd');
})();
