'use strict';

(function bootWobbinSearchPanel(){
  if(window.__WOBBIN_SEARCH_PANEL_INSTALLED)return;
  if(
    typeof S==='undefined'||typeof render!=='function'||typeof all!=='function'||typeof matchesQuery!=='function'||
    !window.WOBBIN_TAXONOMY||!window.__WOBBIN_LAYOUT_INSTALLED||!window.__WOBBIN_LIBRARY_INSTALLED
  ){
    setTimeout(bootWobbinSearchPanel,80);
    return;
  }
  window.__WOBBIN_SEARCH_PANEL_INSTALLED=true;

  const SHOTS_APP=window.WOBBIN_LIBRARY_RESERVED?.shots||'__Wobbin Shots';
  const WEB_APP=window.WOBBIN_LIBRARY_RESERVED?.web||'__Wobbin Web';
  const PRODUCT_TYPES=window.WOBBIN_TAXONOMY.appTypes||[];
  const UI_ELEMENTS=window.WOBBIN_TAXONOMY.uiElements||[];
  let open=false;
  let panelQuery='';

  function kindFor(item){
    if(item?.app===SHOTS_APP)return 'shots';
    if(item?.app===WEB_APP)return 'web';
    return 'apps';
  }
  function sourceItems(){
    return all().filter(x=>!x.demo&&kindFor(x)===(S.libraryMode||'apps')&&(S.platform==='All'||x.platform===S.platform));
  }
  function itemProductTypes(item){
    if(typeof window.wobbinItemProductTypes==='function')return window.wobbinItemProductTypes(item);
    const direct=Array.isArray(item?.appTypes)?item.appTypes:[];
    const tagged=(item?.tags||[]).map(String).filter(x=>x.startsWith('type:')).map(x=>x.slice(5));
    return [...new Set([...direct,...tagged])];
  }
  function countTerms(list,getter,allowed){
    const counts=new Map();
    for(const item of list){
      for(const raw of getter(item)||[]){
        const value=String(raw||'').trim();
        if(!value||!allowed.includes(value))continue;
        counts.set(value,(counts.get(value)||0)+1);
      }
    }
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'en'));
  }
  function productRows(){return countTerms(sourceItems(),itemProductTypes,PRODUCT_TYPES)}
  function elementRows(){return countTerms(sourceItems(),x=>x.elements||[],UI_ELEMENTS)}
  function normalized(value){return String(value||'').trim().toLowerCase()}
  function aliasesFor(value){return [value,...(window.WOBBIN_LABEL_ALIASES?.[value]||[])].join(' ').toLowerCase()}
  function filteredRows(rows){
    const q=normalized(panelQuery);
    if(!q)return rows;
    return rows.filter(([name])=>aliasesFor(name).includes(q));
  }
  function libraryLabel(){return S.libraryMode==='shots'?'Shots':S.libraryMode==='web'?'Web':'Apps'}
  function resultCount(){
    const q=normalized(panelQuery);
    if(!q)return sourceItems().length;
    return sourceItems().filter(x=>matchesQuery(x,q)).length;
  }
  function searchIconMarkup(){return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>`}
  function filterButton(kind,name,count){
    const active=kind==='product'?S.productType===name:S.element===name;
    return `<button type="button" class="wobbin-search-filter ${active?'active':''}" data-search-filter-kind="${kind}" data-search-filter-value="${attr(name)}"><span>${esc(name)}</span><em>${count}</em></button>`;
  }
  function sectionMarkup(id,title,kind,rows){
    const filtered=filteredRows(rows);
    return `<section class="wobbin-search-section" id="${id}" data-search-section="${kind}"><div class="wobbin-search-section-head"><div><small>${title==='Product Types'?'PRODUCT CATEGORIES':'INTERFACE COMPONENTS'}</small><h3>${title}</h3></div>${(kind==='product'?S.productType:S.element)!=='All'?`<button type="button" data-clear-search-filter="${kind}">清除筛选</button>`:''}</div>${filtered.length?`<div class="wobbin-search-filter-grid ${kind==='element'?'is-elements':''}">${filtered.map(([name,count])=>filterButton(kind,name,count)).join('')}</div>`:`<div class="wobbin-search-no-match">没有匹配的${title}</div>`}</section>`;
  }
  function panelMarkup(){
    const products=productRows(),elements=elementRows(),q=String(panelQuery||'').trim(),count=resultCount();
    return `<div class="wobbin-search-backdrop" data-search-backdrop>
      <section class="wobbin-search-panel" role="dialog" aria-modal="true" aria-label="Wobbin search">
        <header class="wobbin-search-head">
          <label class="wobbin-search-input">${searchIconMarkup()}<input type="search" data-search-panel-input value="${attr(panelQuery)}" placeholder="搜索 App、截图、产品类型或 UI Elements…" autocomplete="off"><span>Esc</span></label>
          <button type="button" class="wobbin-search-close" data-search-close aria-label="关闭">×</button>
        </header>
        <div class="wobbin-search-body">
          <aside class="wobbin-search-rail">
            <div class="wobbin-search-context">${libraryLabel()}</div>
            <button type="button" data-search-jump="product"><i>▦</i><span>Product Types</span></button>
            <button type="button" data-search-jump="element"><i>◉</i><span>UI Elements</span></button>
          </aside>
          <main class="wobbin-search-content" data-search-content>
            ${q?`<button type="button" class="wobbin-search-all" data-run-text-search><div><small>SEARCH ALL ${libraryLabel().toUpperCase()}</small><strong>搜索“${esc(q)}”</strong></div><em>${count} results</em></button>`:''}
            ${sectionMarkup('wobbin-search-product','Product Types','product',products)}
            ${sectionMarkup('wobbin-search-element','UI Elements','element',elements)}
          </main>
        </div>
      </section>
    </div>`;
  }
  function ensureStyles(){
    if(document.getElementById('wobbin-search-panel-style'))return;
    const style=document.createElement('style');style.id='wobbin-search-panel-style';style.textContent=`
      body.wobbin-search-open{overflow:hidden}
      .wobbin-search-backdrop{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.58);backdrop-filter:blur(7px);padding:18px;display:flex;align-items:flex-start;justify-content:center}
      .wobbin-search-panel{width:min(1280px,calc(100vw - 36px));height:min(760px,calc(100vh - 36px));margin:0 auto;border:1px solid rgba(255,255,255,.055);border-radius:30px;background:#252525;color:#f7f7f7;box-shadow:0 32px 110px rgba(0,0,0,.55);overflow:hidden;display:grid;grid-template-rows:80px 1fr}
      .wobbin-search-head{display:flex;align-items:center;gap:12px;padding:14px 18px 13px 26px;border-bottom:1px solid rgba(255,255,255,.06)}
      .wobbin-search-input{min-width:0;flex:1;height:52px;display:flex;align-items:center;gap:14px;color:#8e8e8e}.wobbin-search-input svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:2;flex:none}.wobbin-search-input input{min-width:0;flex:1;border:0;outline:0;background:none;color:#f7f7f7;font:inherit;font-size:20px;letter-spacing:-.02em}.wobbin-search-input input::placeholder{color:#848484}.wobbin-search-input>span{height:26px;padding:0 9px;border-radius:7px;background:#333;color:#8f8f8f;display:flex;align-items:center;font-size:10px;font-weight:700}
      .wobbin-search-close{width:40px;height:40px;border:0;border-radius:12px;background:transparent;color:#aaa;font-size:27px;line-height:1;cursor:pointer}.wobbin-search-close:hover{background:#333;color:#fff}
      .wobbin-search-body{min-height:0;display:grid;grid-template-columns:250px 1fr}.wobbin-search-rail{padding:28px 18px;border-right:1px solid rgba(255,255,255,.055);display:flex;flex-direction:column;gap:8px}.wobbin-search-context{padding:0 15px 14px;color:#777;font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.08em}.wobbin-search-rail button{height:52px;padding:0 15px;border:0;border-radius:14px;background:transparent;color:#d8d8d8;display:flex;align-items:center;gap:13px;text-align:left;font-size:16px;font-weight:700;cursor:pointer}.wobbin-search-rail button:hover{background:#333;color:#fff}.wobbin-search-rail i{width:25px;text-align:center;color:#9b9b9b;font-style:normal;font-size:18px}
      .wobbin-search-content{min-height:0;overflow:auto;padding:28px 34px 60px;scroll-behavior:smooth}.wobbin-search-all{width:100%;min-height:72px;margin:0 0 32px;padding:14px 18px;border:1px solid rgba(255,255,255,.065);border-radius:16px;background:#303030;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:18px;text-align:left;cursor:pointer}.wobbin-search-all:hover{background:#363636}.wobbin-search-all div{display:grid;gap:5px}.wobbin-search-all small,.wobbin-search-section-head small{color:#888;font-size:9px;font-weight:750;letter-spacing:.09em}.wobbin-search-all strong{font-size:17px}.wobbin-search-all em{color:#888;font-size:11px;font-style:normal}
      .wobbin-search-section{scroll-margin-top:26px;margin-bottom:48px}.wobbin-search-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:19px}.wobbin-search-section-head>div{display:grid;gap:4px}.wobbin-search-section h3{margin:0;font-size:20px;letter-spacing:-.025em}.wobbin-search-section-head>button{border:0;background:none;color:#969696;font-size:11px;cursor:pointer}.wobbin-search-section-head>button:hover{color:#fff}
      .wobbin-search-filter-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.wobbin-search-filter-grid.is-elements{grid-template-columns:repeat(4,minmax(0,1fr))}.wobbin-search-filter{min-width:0;height:50px;padding:0 14px;border:1px solid rgba(255,255,255,.055);border-radius:14px;background:#303030;color:#f1f1f1;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;font-size:14px;font-weight:650}.wobbin-search-filter:hover{background:#373737}.wobbin-search-filter.active{border-color:#737373;background:#3a3a3a}.wobbin-search-filter span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wobbin-search-filter em{margin-left:auto;color:#828282;font-size:10px;font-style:normal;font-weight:600}.wobbin-search-no-match{min-height:74px;border:1px dashed rgba(255,255,255,.08);border-radius:14px;display:flex;align-items:center;justify-content:center;color:#777;font-size:13px}
      @media(max-width:980px){.wobbin-search-body{grid-template-columns:190px 1fr}.wobbin-search-filter-grid,.wobbin-search-filter-grid.is-elements{grid-template-columns:repeat(2,minmax(0,1fr))}.wobbin-search-content{padding-left:24px;padding-right:24px}}
      @media(max-width:680px){.wobbin-search-backdrop{padding:0}.wobbin-search-panel{width:100vw;height:100vh;border-radius:0;border:0;grid-template-rows:72px 1fr}.wobbin-search-head{padding:10px 14px}.wobbin-search-input input{font-size:16px}.wobbin-search-body{grid-template-columns:1fr}.wobbin-search-rail{padding:10px 14px;border-right:0;border-bottom:1px solid rgba(255,255,255,.055);display:grid;grid-template-columns:1fr 1fr}.wobbin-search-context{display:none}.wobbin-search-rail button{height:42px;justify-content:center}.wobbin-search-content{padding:22px 16px 50px}.wobbin-search-filter-grid,.wobbin-search-filter-grid.is-elements{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;document.head.append(style);
  }
  function mountPanel(){
    document.querySelector('[data-search-backdrop]')?.remove();
    document.body.insertAdjacentHTML('beforeend',panelMarkup());
    bindPanel();
  }
  function openPanel(){
    if(open)return;
    open=true;panelQuery=String(S.query||'');ensureStyles();document.body.classList.add('wobbin-search-open');mountPanel();
    setTimeout(()=>{const input=document.querySelector('[data-search-panel-input]');input?.focus();if(input&&panelQuery)input.setSelectionRange(panelQuery.length,panelQuery.length)},0);
  }
  function closePanel(){
    open=false;document.body.classList.remove('wobbin-search-open');document.querySelector('[data-search-backdrop]')?.remove();
  }
  function updatePanel(){if(open)mountPanel()}
  function applyTextSearch(){
    S.query=String(panelQuery||'').trim();S.view='home';S.app=null;closePanel();render();window.scrollTo({top:0,behavior:'smooth'});
  }
  function applyFilter(kind,value){
    if(kind==='product')S.productType=S.productType===value?'All':value;
    if(kind==='element')S.element=S.element===value?'All':value;
    S.query='';S.view='home';S.app=null;closePanel();render();window.scrollTo({top:0,behavior:'smooth'});
  }
  function bindPanel(){
    const backdrop=document.querySelector('[data-search-backdrop]'),input=backdrop?.querySelector('[data-search-panel-input]');
    backdrop?.addEventListener('mousedown',e=>{if(e.target===backdrop)closePanel()});
    backdrop?.querySelector('[data-search-close]')?.addEventListener('click',closePanel);
    input?.addEventListener('input',()=>{panelQuery=input.value;updatePanel();requestAnimationFrame(()=>{const next=document.querySelector('[data-search-panel-input]');next?.focus();if(next)next.setSelectionRange(next.value.length,next.value.length)})});
    input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyTextSearch()}if(e.key==='Escape'){e.preventDefault();closePanel()}});
    backdrop?.querySelector('[data-run-text-search]')?.addEventListener('click',applyTextSearch);
    backdrop?.querySelectorAll('[data-search-filter-kind]').forEach(btn=>btn.addEventListener('click',()=>applyFilter(btn.dataset.searchFilterKind,btn.dataset.searchFilterValue)));
    backdrop?.querySelectorAll('[data-clear-search-filter]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.clearSearchFilter==='product')S.productType='All';else S.element='All';S.query='';updatePanel()}));
    backdrop?.querySelectorAll('[data-search-jump]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.searchJump==='product'?'wobbin-search-product':'wobbin-search-element';backdrop.querySelector('#'+id)?.scrollIntoView({behavior:'smooth',block:'start'})}));
  }
  function bindHeaderSearch(){
    const bar=document.querySelector('.topbar .searchbar'),input=document.getElementById('global-search');
    if(bar&&bar.dataset.wobbinSearchPanelBound!=='1'){
      bar.dataset.wobbinSearchPanelBound='1';
      bar.addEventListener('click',e=>{e.preventDefault();openPanel()});
    }
    if(input){input.readOnly=true;input.setAttribute('aria-haspopup','dialog');input.title='点击打开搜索';}
  }

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&open){e.preventDefault();closePanel();return}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPanel()}
  });

  const baseRender=render;
  render=function(){baseRender();queueMicrotask(()=>{bindHeaderSearch();if(open)updatePanel()})};
  ensureStyles();bindHeaderSearch();
})();
