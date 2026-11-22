/* BeautiAI gallery — tiny vanilla app
   维度约定：模特 = faces/ 头像；分类 = 数据源（Beautyleg / Tukmo兔几盟 / …）；套图挂在各数据源下 */
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
    const t = String(s).trim();
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

  let DATA = null;
  const state = { source: null, face: null };

  /* 文生图接口：后端地址可由 window.BEAUTIAI_API 覆盖，暂留占位 */
  const API = {
    base: (window.BEAUTIAI_API && window.BEAUTIAI_API.base) || '/api',
    path: (window.BEAUTIAI_API && window.BEAUTIAI_API.generate) || '/generate'
  };

  const srcOf = id => DATA.sources.find(s => s.id === id);
  const scopeSets = () => (state.source ? DATA.sets.filter(s => s.source === state.source) : DATA.sets);

  /* ---------- render: sidebar (抽屉式分类：数据源 + 模特库) ---------- */
  let modelsRowHTML = '';

  function renderSide() {
    const row = (id, label, n, color) => `
      <button class="tab" role="tab" data-source="${esc(id)}" aria-selected="${(state.source || '') === id}" style="--c:${color}">
        <i></i><span>${esc(label)}</span><b>${n}</b>
      </button>`;

    if (!modelsRowHTML) {
      modelsRowHTML = DATA.models.map(m => `
        <button class="mface" data-mid="${esc(m.id)}" data-name="${esc(m.name)}" data-src="${esc(m.avatar)}"
                aria-pressed="${state.face && state.face.id === m.id}" title="${esc(m.name)}">
          <span class="mface__img"><img src="${esc(m.avatar)}" alt="${esc(m.name)}" loading="lazy" decoding="async" ${hideOnError}></span>
          <span class="mface__no">${esc(m.no)}</span>
        </button>`).join('');
    }

    return `
      <button class="side__close" id="sideClose" aria-label="收起分类">✕</button>
      <div class="side__hd">
        <span class="eyebrow">CATEGORY · 分类</span>
        <span class="side__num">${DATA.sources.length} 个数据源</span>
      </div>
      <div class="side__models">
        <div class="side__mh">
          <span class="eyebrow">MODEL · 模特</span>
          <span class="side__num">${DATA.models.length} 位</span>
          <span class="mrow__navs">
            <button class="mrow__nav" id="mrowPrev" aria-label="向左滚动模特">‹</button>
            <button class="mrow__nav" id="mrowNext" aria-label="向右滚动模特">›</button>
          </span>
        </div>
        <div class="mrow" id="mrow">
          <div class="mrow__track" id="mrowTrack">${modelsRowHTML}</div>
        </div>
      </div>
      <nav class="tabs" role="tablist" aria-orientation="vertical" aria-label="按数据源筛选">
        ${row('', '全部套图', DATA.stats.sets, 'var(--accent)')}
        ${DATA.sources.map(s => row(s.id, s.name, s.sets, s.color)).join('')}
      </nav>
      <p class="side__note">${DATA.stats.models} 位模特 · ${DATA.stats.sets} 套图 · ${DATA.stats.images} 张图片</p>`;
  }

  /* ---------- render: 模特轮播（收在创作卡片内） ---------- */
  function renderMarquee() {
    const faces = DATA.models;

    const who = (m, dup) => `
      <button class="who" data-face="${esc(m.avatar)}" data-no="${esc(m.no)}" ${dup ? 'aria-hidden="true" tabindex="-1"' : ''}>
        <span class="who__ava">
          <span class="ph" style="${phStyle(m.name)}"><span class="mono">${esc(mono(m.name))}</span></span>
          <img src="${esc(m.avatar)}" alt="${esc(m.name)}" loading="lazy" decoding="async" ${hideOnError}>
        </span>
        <span class="who__name">${esc(m.name)}</span>
        <span class="who__n">No.${esc(m.no)}</span>
      </button>`;

    /* 轮播速度固定 ~58px/s：一项 104px + 14px 间距，整段跑完即回到原点 */
    const dur = Math.max(60, Math.round((faces.length * 118) / 58));

    return `
      <div class="studio__cast">
        <div class="cast__hd">
          <span class="eyebrow">MODEL / 模特</span>
          <h2>模特</h2>
          <span class="hint">${faces.length} 位 · 悬停暂停 · 点击作为创作参考</span>
        </div>
        <div class="marq" style="--dur:${dur}s" role="group" aria-label="模特头像">
          <div class="marq__track">
            ${faces.map(m => who(m, false)).join('')}
            ${faces.map(m => who(m, true)).join('')}
          </div>
        </div>
      </div>`;
  }

  /* ---------- render: 创作区 ---------- */
  function facePreviewHTML() {
    if (!state.face) {
      return `<div class="ph" style="${phStyle('CREATE')}"><span class="mono">＋</span></div>`;
    }
    return `<img src="${esc(state.face.src)}" alt="${esc(state.face.name)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2">`;
  }

  function renderStudio() {
    return `
      <div class="studio__lead">
        <span class="eyebrow">CREATE · 创作</span>
        <h1 class="studio__name">创作区</h1>
        <p class="studio__sub">上传或挑选一位模特作为参考，输入提示词生成新图。</p>
        <div class="studio__ref">
          <div class="studio__ava" id="stAva">${facePreviewHTML()}</div>
          <div class="studio__refacts">
            <input type="file" id="stFile" accept="image/*" hidden>
            <label class="sbtn" for="stFile">上传头像</label>
            <button class="sbtn" id="stPick" type="button">从模特库选</button>
            <button class="sbtn" id="stClear" type="button" ${state.face ? '' : 'hidden'}>清除参考</button>
            <p class="studio__facename" id="stFaceName">${state.face ? esc(state.face.name) : '未选择参考模特'}</p>
          </div>
        </div>
      </div>
      <div class="studio__form">
        <label class="studio__lab" for="stPrompt">提示词</label>
        <textarea class="studio__ta" id="stPrompt" placeholder="描述你想生成的画面，例如：白衬衫、午后窗光、胶片颗粒感、竖构图…"></textarea>
        <div class="studio__row">
          <button class="sbtn sbtn--go" id="stGo" type="button">生成图片</button>
          <span class="studio__status" id="stStatus"></span>
        </div>
        <div class="studio__out" id="stOut"></div>
      </div>
      ${renderMarquee()}`;
  }

  function paintStudio() {
    const ava = $('#stAva');
    if (!ava) return;
    ava.innerHTML = facePreviewHTML();
    $('#stFaceName').textContent = state.face ? state.face.name : '未选择参考模特';
    $('#stClear').hidden = !state.face;
    markFace();
  }

  function selectFace(face) {
    state.face = face;
    paintStudio();
  }

  function scrollToStudio() {
    const el = $('#studio');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setStatus(text, tone) {
    const el = $('#stStatus');
    if (!el) return;
    el.textContent = text;
    if (tone) el.dataset.tone = tone; else delete el.dataset.tone;
  }

  async function runGenerate() {
    const ta = $('#stPrompt');
    const prompt = (ta.value || '').trim();
    if (!prompt) { setStatus('请先输入提示词', 'err'); ta.focus(); return; }
    const btn = $('#stGo');
    btn.disabled = true;
    setStatus('正在生成…');
    try {
      const payload = {
        prompt,
        reference: state.face ? state.face.src : '',
        model: state.face ? state.face.name : '',
        width: 1024,
        height: 1536
      };
      const res = await fetch(API.base + API.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json().catch(() => ({}));
      const urls = [].concat(data.images || [], data.url || data.image_url || []).filter(Boolean);
      if (!urls.length) throw new Error('接口未返回图片');
      $('#stOut').innerHTML = `<div class="studio__shot">${urls.map(u =>
        `<figure><img src="${esc(u)}" alt="生成结果" loading="lazy" ${hideOnError}></figure>`).join('')}</div>`;
      setStatus('生成完成', 'ok');
    } catch (err) {
      setStatus('创作接口暂未接入：' + (err && err.message ? err.message : '网络错误'), 'err');
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- render: gallery ---------- */
  function cardHTML(s) {
    const src = srcOf(s.source) || { color: 'var(--c-other)', name: '未分类' };
    const n = (s.images || []).length;
    const sub = s.models && s.models.length > 1 ? `${s.models.length} 位模特` : (s.model || src.name);
    return `
      <a class="card" href="#/set/${s.id}" style="--c:${src.color}">
        <div class="card__media">
          <div class="ph ph--card" style="${phStyle(s.title)}"><span class="mono">${esc(mono(src.name))}</span></div>
          ${s.images[0] ? `<img src="${esc(s.images[0])}" alt="${esc(s.title)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" ${hideOnError}>` : ''}
          <span class="card__count">${n} 张</span>
        </div>
        <div class="card__txt">
          <h4>${esc(s.title)}</h4>
          <p><i></i>${esc(sub)}${s.date ? `<em>·</em>${esc(s.date.slice(0, 10))}` : ''}</p>
        </div>
      </a>`;
  }

  function renderGallery() {
    const sets = scopeSets();
    const groups = DATA.sources
      .map(src => ({ src, sets: sets.filter(s => s.source === src.id) }))
      .filter(g => g.sets.length);

    if (!groups.length) {
      return `<div class="gallery"><p style="color:var(--muted);padding:40px 0">这里还没有套图。</p></div>`;
    }

    return `<div class="gallery">${groups.map(g => `
      <section class="group" style="--c:${g.src.color}">
        <div class="group__hd">
          <span class="group__dot"></span>
          <h3>${esc(g.src.name)}</h3>
          <span class="group__rule"></span>
          <span class="group__n">${g.sets.length} 套 · ${g.sets.reduce((n, s) => n + (s.images || []).length, 0)} 张</span>
        </div>
        <div class="grid">${g.sets.map(cardHTML).join('')}</div>
      </section>`).join('')}</div>`;
  }

  /* ---------- render: detail ---------- */
  function renderDetail(id) {
    const s = DATA.sets.find(x => x.id === id);
    if (!s) return `<div class="detail"><a class="back" href="#/">← 返回画廊</a><p style="margin-top:40px;color:var(--muted)">没有找到这套图。</p></div>`;
    const src = srcOf(s.source) || { name: '未分类', color: 'var(--c-other)' };
    const imgs = s.images || [];
    const others = DATA.sets.filter(x => x.source === s.source && x.id !== s.id).slice(0, 4);

    return `
      <article class="detail" style="--c:${src.color}">
        <div class="detail__bar">
          <a class="back" href="#/">← 返回画廊</a>
          <span class="detail__crumb"><a href="#/">图鉴</a><em>/</em><a href="#/" data-source="${esc(s.source)}">${esc(src.name)}</a></span>
        </div>
        <header class="detail__head">
          <p class="eyebrow" style="color:${src.color}">${esc(src.name)} / FULL SET</p>
          <h1>${esc(s.title)}</h1>
          <div class="detail__meta">
            <span>${imgs.length} 张</span>
            ${s.date ? `<span>${esc(s.date.slice(0, 10))}</span>` : ''}
            ${s.url ? `<span><a href="${esc(s.url)}" target="_blank" rel="noopener" style="border-bottom:1px solid var(--line)">原页面 ↗</a></span>` : ''}
          </div>
        </header>
        <div class="stack">
          ${imgs.map((u, i) => `
            <figure class="shot" data-i="${i}">
              <img src="${esc(u)}" alt="${esc(s.title)} ${i + 1}" loading="lazy" onerror="phSwap(this,'${esc(src.name).replace(/'/g, "\\'")}',${i})">
              <figcaption class="shot__no">${pad(i + 1)} / ${pad(imgs.length)}</figcaption>
            </figure>`).join('') || '<p style="color:var(--muted)">这套图暂无图片记录。</p>'}
        </div>
        ${others.length ? `
          <section class="more">
            <h3>同一数据源的其他套图</h3>
            <div class="grid">${others.map(cardHTML).join('')}</div>
          </section>` : ''}
      </article>`;
  }

  /* ---------- lightbox ---------- */
  let lb = { i: 0, list: [], cap: null };
  function openLB(i, list, cap = null) {
    lb = { i, list, cap };
    const el = $('#lb');
    el.dataset.open = 'true';
    el.setAttribute('aria-hidden', 'false');
    paintLB();
  }
  function paintLB() {
    const img = $('#lbImg');
    img.src = lb.list[lb.i] || '';
    img.alt = '';
    $('#lbCap').textContent = lb.cap ? `${lb.cap[lb.i] || ''}` : `${pad(lb.i + 1)} / ${pad(lb.list.length)}`;
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

  /* ---------- paint ---------- */
  function paintList() {
    $('#side').innerHTML = renderSide();
    $('#main').innerHTML = renderGallery();
    markFace();
    syncArrows($('#mrowTrack'));
    const src = state.source ? srcOf(state.source) : null;
    document.title = src ? `${src.name} · BeautiAI` : 'BeautiAI · 街拍图鉴';
  }

  function markFace() {
    $$('.mface').forEach(b =>
      b.setAttribute('aria-pressed', String(!!state.face && state.face.id === b.dataset.mid)));
  }

  function route() {
    const h = location.hash || '#/';
    const m = h.match(/^#\/set\/([\w-]+)/);
    const main = $('#main');
    const side = $('#side');
    const studio = $('#studio');
    const shell = $('#shell');

    if (m) {
      shell.dataset.view = 'detail';
      drawer.close();
      $('#sideBtn').hidden = true;
      side.hidden = true; side.innerHTML = '';
      studio.hidden = true;
      main.innerHTML = renderDetail(m[1]);
      document.title = `${DATA.sets.find(s => s.id === m[1])?.title || '套图'} · BeautiAI`;
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    } else {
      shell.dataset.view = 'list';
      side.hidden = false;
      $('#sideBtn').hidden = false;
      studio.hidden = false;
      paintList();
    }
  }

  /* ---------- drawer ---------- */
  const drawer = {
    open() {
      $('#side').dataset.open = 'true';
      $('#scrim').dataset.open = 'true';
      $('#sideBtn').setAttribute('aria-expanded', 'true');
      document.documentElement.style.overflow = 'hidden';
    },
    close() {
      $('#side').dataset.open = 'false';
      $('#scrim').dataset.open = 'false';
      $('#sideBtn').setAttribute('aria-expanded', 'false');
      document.documentElement.style.overflow = '';
    },
    get isOpen() { return $('#side').dataset.open === 'true'; }
  };

  function bind() {
    $('#sideBtn').addEventListener('click', () => (drawer.isOpen ? drawer.close() : drawer.open()));
    $('#scrim').addEventListener('click', () => drawer.close());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.isOpen) drawer.close();
    });

    document.addEventListener('click', e => {
      if (e.target.closest('#sideClose')) { drawer.close(); return; }

      const tab = e.target.closest('.tab');
      if (tab) {
        const v = tab.dataset.source || null;
        state.source = state.source === v ? null : v;
        paintList();
        drawer.close();
        return;
      }

      const crumb = e.target.closest('[data-source][href]');
      if (crumb) {
        state.source = crumb.dataset.source || null;
        return;
      }

      const mface = e.target.closest('.mface');
      if (mface) {
        selectFace({ id: mface.dataset.mid, name: mface.dataset.name, src: mface.dataset.src, kind: 'model' });
        drawer.close();
        scrollToStudio();
        return;
      }

      const who = e.target.closest('.who');
      if (who) {
        const m = DATA.models.find(x => x.avatar === who.dataset.face);
        if (m) {
          selectFace({ id: m.id, name: m.name, src: m.avatar, kind: 'model' });
          scrollToStudio();
        }
        return;
      }

      if (e.target.closest('#stPick')) { drawer.open(); return; }

      if (e.target.closest('#stClear')) { selectFace(null); setStatus(''); return; }

      if (e.target.closest('#stGo')) { runGenerate(); return; }

      const mrowNav = e.target.closest('#mrowPrev, #mrowNext');
      if (mrowNav) {
        const track = $('#mrowTrack');
        if (track) {
          const dir = mrowNav.id === 'mrowPrev' ? -1 : 1;
          track.scrollBy({ left: dir * Math.max(120, track.clientWidth * 0.62), behavior: 'smooth' });
        }
        return;
      }
    });

    document.addEventListener('change', e => {
      if (e.target.id !== 'stFile') return;
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const fr = new FileReader();
      fr.onload = () => selectFace({ id: 'upload', name: file.name || '上传头像', src: fr.result, kind: 'upload' });
      fr.readAsDataURL(file);
    });

    /* 抽屉里的模特横向列表：左右箭头 + 滚轮横滚（事件委托，抽屉重绘后依然有效） */
    const sideEl = $('#side');
    sideEl.addEventListener('wheel', e => {
      const t = e.target.closest('#mrowTrack');
      if (!t) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      t.scrollLeft += e.deltaY;
    }, { passive: false });
    sideEl.addEventListener('scroll', e => {
      const t = e.target.closest && e.target.closest('#mrowTrack');
      if (t) syncArrows(t);
    }, true);
  }

  function syncArrows(track) {
    const prev = $('#mrowPrev'), next = $('#mrowNext');
    if (!track || !prev || !next) return;
    const max = track.scrollWidth - track.clientWidth - 1;
    prev.disabled = track.scrollLeft <= 0;
    next.disabled = track.scrollLeft >= max;
  }

  function bindShots() {
    document.addEventListener('click', e => {
      const fig = e.target.closest('.shot');
      if (!fig) return;
      const s = DATA.sets.find(x => x.id === (location.hash.match(/^#\/set\/([\w-]+)/) || [])[1]);
      if (!s) return;
      openLB(Number(fig.dataset.i) || 0, s.images || [], null);
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
      $('#studio').innerHTML = renderStudio();
      paintList();
      bind();
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