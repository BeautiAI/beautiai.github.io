/* BeautiAI gallery — tiny vanilla app */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');

  /* curated placeholder palette — muted, editorial */
  const PALETTE = [
    ['#8c5a4a', '#573530'], ['#5b6a46', '#36432c'], ['#4c5f6b', '#2f3d46'],
    ['#6b5470', '#413049'], ['#8a6a3c', '#553f26'], ['#4f6a63', '#2f403a'],
    ['#7a4a5a', '#472a34'], ['#5a5a70', '#35354a']
  ];
  const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const pair = s => PALETTE[hash(s) % PALETTE.length];
  const mono = (s = '') => {
    const t = s.trim();
    const ascii = t.match(/^[A-Za-z][A-Za-z0-9]*/);
    if (ascii) return ascii[0].slice(0, 2).toUpperCase();
    return t.slice(0, 1) || '·';
  };
  const phStyle = seed => { const [a, b] = pair(seed); return `--p1:${a};--p2:${b}`; };

  window.phSwap = (img, label, idx) => {
    const d = document.createElement('div');
    d.className = 'ph';
    d.style.cssText = phStyle(label + idx);
    d.innerHTML = `<span class="mono">${esc(mono(label))}</span><span class="idx">${pad(idx + 1)}</span>`;
    img.replaceWith(d);
  };
  const hideOnError = `onerror="this.remove()"`;

  const CAT_ORDER = ['street', 'portrait', 'diva', 'legs', 'other'];

  let DATA = null;
  let state = { model: null };

  /* ---------- render: model area ---------- */
  function modelStats(sets) {
    return {
      sets: sets.length,
      images: sets.reduce((n, s) => n + (s.images || []).length, 0),
      cats: [...new Set(sets.map(s => s.cat))]
    };
  }

  function renderCast() {
    const all = DATA.sets;
    const models = DATA.models;
    const hero = state.model ? models.find(m => m.id === state.model) : null;
    const scope = hero ? all.filter(s => s.model === hero.id) : all;
    const st = modelStats(scope);

    const name = hero ? hero.name : '全部图集';
    const sub = hero
      ? `${CAT_ORDER.filter(c => st.cats.includes(c)).map(c => DATA.cats.find(x => x.id === c)?.name).filter(Boolean).join(' · ')}`
      : 'BeautiAI 收录的全部写真套图';

    const avaInner = hero
      ? `<div class="ph" style="${phStyle(hero.name)}"><span class="mono">${esc(mono(hero.name))}</span></div>
         ${hero.cover ? `<img src="${esc(hero.cover)}" alt="${esc(hero.name)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" ${hideOnError}>` : ''}`
      : `<div class="ph" style="${phStyle('all')}"><span class="mono">B</span></div>
         ${models.slice(0, 4).map((m, i) => m.cover
            ? `<img src="${esc(m.cover)}" alt="" style="position:absolute;width:50%;height:50%;object-fit:cover;left:${(i % 2) * 50}%;top:${Math.floor(i / 2) * 50}%" ${hideOnError}>`
            : '').join('')}`;

    const catTags = st.cats
      .map(id => ({ cat: DATA.cats.find(x => x.id === id), n: scope.filter(s => s.cat === id).length }))
      .filter(x => x.cat)
      .sort((a, b) => b.n - a.n)
      .map(x => `<span class="tagline" style="--c:${x.cat.color}"><i></i>${esc(x.cat.name)}<b>${x.n}</b></span>`)
      .join('');

    return `
      <section class="cast" aria-label="模特">
        <div class="cast__hd">
          <span class="eyebrow">MODEL / SERIES</span>
          <h2>模特</h2>
          <span class="hint">${models.length} 位 · 按套图数量排序</span>
        </div>
        <div class="hero">
          <div class="hero__ava">${avaInner}</div>
          <div class="hero__id">
            <p class="eyebrow">${hero ? 'SELECTED' : 'ALL COLLECTIONS'}</p>
            <h1 class="hero__name">${esc(name)}</h1>
            ${sub ? `<p class="hero__sub">${esc(sub)}</p>` : ''}
            <ul class="hero__stats">
              <li><b>${st.sets}</b><span>套图</span></li>
              <li><b>${st.images}</b><span>张图片</span></li>
              <li><b>${st.cats.length}</b><span>分类</span></li>
            </ul>
          </div>
          <div class="hero__cats">${catTags}</div>
        </div>
        <div class="rail" role="group" aria-label="切换模特">
          <button class="pill pill--all" data-model="" aria-pressed="${state.model ? 'false' : 'true'}">全部</button>
          ${models.map(m => `
            <button class="pill" data-model="${esc(m.id)}" aria-pressed="${state.model === m.id}">
              <span class="pill__ava">
                <span class="ph" style="${phStyle(m.name)}"><span class="mono">${esc(mono(m.name))}</span></span>
                ${m.cover ? `<img src="${esc(m.cover)}" alt="" ${hideOnError}>` : ''}
              </span>
              <span>${esc(m.name)}</span>
            </button>`).join('')}
        </div>
      </section>`;
  }

  /* ---------- render: gallery ---------- */
  function cardHTML(s) {
    const cat = DATA.cats.find(c => c.id === s.cat) || { color: 'var(--c-other)', name: '其他' };
    const n = (s.images || []).length;
    return `
      <a class="card" href="#/set/${s.id}" style="--c:${cat.color}">
        <div class="card__media">
          <div class="ph ph--card" style="${phStyle(s.title)}"><span class="mono">${esc(mono(DATA.models.find(m => m.id === s.model)?.name || s.title))}</span></div>
          ${s.images[0] ? `<img src="${esc(s.images[0])}" alt="${esc(s.title)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" ${hideOnError}>` : ''}
          <span class="card__count">${n} 张</span>
        </div>
        <div class="card__txt">
          <h4>${esc(s.title)}</h4>
          <p><i></i>${esc(DATA.models.find(m => m.id === s.model)?.name || '未分类')}${s.date ? `<em>·</em>${esc(s.date.slice(0, 10))}` : ''}</p>
        </div>
      </a>`;
  }

  function renderGallery() {
    const sets = state.model ? DATA.sets.filter(s => s.model === state.model) : DATA.sets;
    const groups = CAT_ORDER
      .map(id => ({ cat: DATA.cats.find(c => c.id === id), sets: sets.filter(s => s.cat === id) }))
      .filter(g => g.cat && g.sets.length)
      .sort((a, b) => b.sets.length - a.sets.length);

    if (!groups.length) return `<div class="gallery"><p style="color:var(--muted);padding:40px 0">该分类下暂无套图。</p></div>`;

    return `<div class="gallery">${groups.map(g => `
      <section class="group" style="--c:${g.cat.color}">
        <div class="group__hd">
          <span class="group__dot"></span>
          <h3>${esc(g.cat.name)}</h3>
          <span class="group__en">${esc(g.cat.en)}</span>
          <span class="group__rule"></span>
          <span class="group__n">${g.sets.length} 套</span>
        </div>
        <div class="grid">${g.sets.map(cardHTML).join('')}</div>
      </section>`).join('')}</div>`;
  }

  /* ---------- render: detail ---------- */
  function renderDetail(id) {
    const s = DATA.sets.find(x => x.id === id);
    if (!s) return `<div class="detail"><a class="back" href="#/">← 返回画廊</a><p style="margin-top:40px;color:var(--muted)">没有找到这套图。</p></div>`;
    const cat = DATA.cats.find(c => c.id === s.cat) || { name: '其他', en: 'OTHER', color: 'var(--c-other)' };
    const model = DATA.models.find(m => m.id === s.model);
    const imgs = s.images || [];
    const others = DATA.sets.filter(x => x.model === s.model && x.id !== s.id).slice(0, 4);
    const isOther = s.cat === 'other';
    const modelName = model && model.name !== '未分类' ? model.name : '';

    return `
      <article class="detail" style="--c:${cat.color}">
        <div class="detail__bar">
          <a class="back" href="#/">← 返回画廊</a>
          <span class="detail__crumb"><a href="#/">图鉴</a>${isOther ? '' : `<em>/</em>${esc(cat.name)}`}</span>
        </div>
        <header class="detail__head">
          <p class="eyebrow" style="color:${cat.color}">${isOther ? 'FULL SET' : `${esc(cat.name)} / FULL SET`}</p>
          <h1>${esc(s.title)}</h1>
          <div class="detail__meta">
            ${modelName ? `<span>模特 <b>${esc(modelName)}</b></span>` : ''}
            <span>${imgs.length} 张</span>
            ${s.date ? `<span>${esc(s.date.slice(0, 10))}</span>` : ''}
            ${s.price ? `<span>原站售价 ￥${esc(s.price)}</span>` : ''}
            <span><a href="${esc(s.url)}" target="_blank" rel="noopener" style="border-bottom:1px solid var(--line)">原页面 ↗</a></span>
          </div>
        </header>
        <div class="stack">
          ${imgs.map((u, i) => `
            <figure class="shot" data-i="${i}">
              <img src="${esc(u)}" alt="${esc(s.title)} ${i + 1}" loading="lazy" onerror="phSwap(this,'${esc(model ? model.name : s.title).replace(/'/g, "\\'")}',${i})">
              <figcaption class="shot__no">${pad(i + 1)} / ${pad(imgs.length)}</figcaption>
            </figure>`).join('') || '<p style="color:var(--muted)">这套图暂无图片记录。</p>'}
        </div>
        ${others.length ? `
          <section class="more" >
            <h3>同一位模特的其他套图</h3>
            <div class="grid">${others.map(cardHTML).join('')}</div>
          </section>` : ''}
      </article>`;
  }

  /* ---------- lightbox ---------- */
  let lb = { i: 0, list: [] };
  function openLB(i, list) {
    lb = { i, list };
    const el = $('#lb');
    el.dataset.open = 'true';
    el.setAttribute('aria-hidden', 'false');
    paintLB();
  }
  function paintLB() {
    const el = $('#lb');
    const src = lb.list[lb.i] || '';
    const img = $('#lbImg');
    img.src = src;
    img.alt = '';
    $('#lbCap').textContent = `${pad(lb.i + 1)} / ${pad(lb.list.length)}`;
    img.onerror = () => { img.style.opacity = 0; };
    img.onload = () => { img.style.opacity = 1; };
  }
  function closeLB() {
    const el = $('#lb');
    el.dataset.open = 'false';
    el.setAttribute('aria-hidden', 'true');
  }
  function step(d) {
    if (!lb.list.length) return;
    lb.i = (lb.i + d + lb.list.length) % lb.list.length;
    paintLB();
  }

  /* ---------- router ---------- */
  function route() {
    const h = location.hash || '#/';
    const m = h.match(/^#\/set\/([\w-]+)/);
    const main = $('#main');
    const cast = $('#cast');
    if (m) {
      /* 二级页面：收起模特区，让套图本身占据首屏 */
      if (cast) { cast.hidden = true; cast.innerHTML = ''; }
      main.innerHTML = renderDetail(m[1]);
      document.title = `${DATA.sets.find(s => s.id === m[1])?.title || '套图'} · BeautiAI`;
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    } else {
      if (cast) { cast.hidden = false; cast.innerHTML = renderCast(); }
      main.innerHTML = renderGallery();
      bindChips();
      document.title = 'BeautiAI · 街拍图鉴';
    }
  }

  function bindChips() {
    $$('.pill').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.model || null;
      state.model = v || null;
      $('#cast').innerHTML = renderCast();
      $('#main').innerHTML = renderGallery();
      bindChips();
    }));
  }

  function bindShots() {
    document.addEventListener('click', e => {
      const fig = e.target.closest('.shot');
      if (!fig) return;
      const s = DATA.sets.find(x => x.id === (location.hash.match(/^#\/set\/([\w-]+)/) || [])[1]);
      if (!s) return;
      openLB(Number(fig.dataset.i) || 0, s.images || []);
    });
    $('#lbPrev').addEventListener('click', e => { e.stopPropagation(); step(-1); });
    $('#lbNext').addEventListener('click', e => { e.stopPropagation(); step(1); });
    $('#lbClose').addEventListener('click', closeLB);
    $('#lb').addEventListener('click', e => { if (e.target.id === 'lb') closeLB(); });
    document.addEventListener('keydown', e => {
      if ($('#lb').dataset.open !== 'true') return;
      if (e.key === 'Escape') closeLB();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  /* ---------- boot ---------- */
  fetch('data.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(d => {
      DATA = d;
      $('#cast').innerHTML = renderCast();
      bindChips();
      bindShots();
      route();
      window.addEventListener('hashchange', route);
      document.body.dataset.ready = '1';
    })
    .catch(err => {
      console.error(err);
      $('#main').innerHTML = `<div class="gallery"><p style="color:var(--muted);padding:40px 0">数据加载失败：${esc(String(err))}</p></div>`;
    });
})();
