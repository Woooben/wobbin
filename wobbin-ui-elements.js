'use strict';

(function bootWobbinUiElements(){
  if(window.__WOBBIN_UI_ELEMENTS_INSTALLED)return;
  if(!window.WOBBIN_TAXONOMY||typeof quickElements!=='function'||typeof home!=='function'||typeof render!=='function'){
    setTimeout(bootWobbinUiElements,80);
    return;
  }
  window.__WOBBIN_UI_ELEMENTS_INSTALLED=true;

  const groups=[
    ['Control',['Accordion','Button','Checkbox','Color Picker','Radio Button','Rating Control','Segmented Control','Slider','Stepper','Switch']],
    ['Navigation',['Bottom Navigation','Navigation Bar','Tab Bar','Tabs','Breadcrumb','Pagination']],
    ['Input',['Search Bar','Text Field','Text Area','Select','Dropdown','Date Picker']],
    ['Overlay',['Action Sheet','Bottom Sheet','Dialog','Modal','Sheet','Alert','Toast','Tooltip']],
    ['Content & Data',['Avatar','Badge','Card','Carousel','Chip','Divider','Icon','Image','List','Table','Map','Chart','Video']],
    ['Status',['Empty State','Progress Bar','Skeleton']]
  ];

  function elementCount(key){
    return all().filter(x=>(S.platform==='All'||x.platform===S.platform)&&(x.elements||[]).includes(key)&&matchesQuery(x,S.query)).length;
  }
  function elementLabel(key){
    const aliases=window.WOBBIN_LABEL_ALIASES?.[key]||[];
    return aliases[0]||key;
  }
  function filterMarkup(){
    const selected=S.element==='All'?'UI Elements':S.element;
    const selectedCount=S.element==='All'?all().length:elementCount(S.element);
    return `<div class="wobbin-element-filter" data-element-filter>
      <button type="button" class="wobbin-element-trigger ${S.element!=='All'?'active':''}" data-element-filter-toggle>
        <span>${esc(selected)}</span><span class="wobbin-element-count">${selectedCount}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>
      </button>
      <div class="wobbin-element-menu" data-element-menu>
        <label class="wobbin-element-search">${searchIcon}<input type="search" placeholder="Search UI elements..." data-element-search autocomplete="off"></label>
        <div class="wobbin-element-scroll">
          <div class="wobbin-element-group">
            <button type="button" class="wobbin-element-option ${S.element==='All'?'selected':''}" data-element="All" data-element-search-text="all 全部"><span>All UI Elements</span><em>${all().length}</em></button>
          </div>
          ${groups.map(([group,keys])=>`<section class="wobbin-element-group" data-element-group><h4>${group}</h4>${keys.map(key=>`<button type="button" class="wobbin-element-option ${S.element===key?'selected':''}" data-element="${attr(key)}" data-element-search-text="${attr((key+' '+elementLabel(key)).toLowerCase())}"><span><i></i>${esc(key)}</span><em>${elementCount(key)}</em></button>`).join('')}</section>`).join('')}
        </div>
      </div>
    </div>`;
  }

  quickElements=function(){return `<div class="quick-elements wobbin-quick-elements">${filterMarkup()}</div>`};

  const baseHome=home;
  home=function(){
    if(S.element==='All')return baseHome();
    const list=currentItems();
    const zh=elementLabel(S.element);
    return `${header()}<main class="main"><div class="subnav"><div class="subnav-left">${platform()}<span class="divider"></span><span class="page-label"><strong>UI Elements</strong> · ${esc(S.element)}</span></div><button class="filter-btn">${filterIcon} Filter</button></div>${quickElements()}<div class="section-head"><div><h1>${esc(S.element)}</h1><p>${esc(zh)} · 所有匹配截图</p></div><span class="section-count">${list.length} screens</span></div>${list.length?screenView(list):`<div class="empty"><strong>没有对应截图</strong>调整 UI Element、平台或搜索条件。</div>`}</main>${suggestions()}`;
  };

  function ensureStyles(){
    if(document.getElementById('wobbin-ui-elements-style'))return;
    const style=document.createElement('style');
    style.id='wobbin-ui-elements-style';
    style.textContent=`
      .wobbin-quick-elements{display:flex!important;gap:12px;overflow:visible!important;padding-bottom:4px}
      .wobbin-element-filter{position:relative;z-index:80}
      .wobbin-element-trigger{height:44px;min-width:174px;padding:0 15px 0 18px;border:1px solid var(--line,#393939);border-radius:999px;background:var(--bg,#111);color:var(--text,#f5f5f5);display:flex;align-items:center;gap:10px;font-size:15px;font-weight:650;cursor:pointer}
      .wobbin-element-trigger.active{border-color:var(--text,#f5f5f5)}
      .wobbin-element-trigger svg{width:18px;height:18px;margin-left:auto;fill:none;stroke:currentColor;stroke-width:2;transition:transform .15s ease}
      .wobbin-element-filter.open .wobbin-element-trigger svg{transform:rotate(180deg)}
      .wobbin-element-count{font-size:11px;line-height:20px;min-width:20px;padding:0 6px;border-radius:999px;background:rgba(127,127,127,.16);font-weight:600;color:var(--muted,#999)}
      .wobbin-element-menu{display:none;position:absolute;top:52px;left:0;width:min(430px,calc(100vw - 32px));max-height:min(680px,72vh);overflow:hidden;border:1px solid var(--line,#383838);border-radius:22px;background:var(--panel,#262626);box-shadow:0 24px 70px rgba(0,0,0,.38)}
      .wobbin-element-filter.open .wobbin-element-menu{display:block}
      .wobbin-element-search{height:60px;padding:0 18px;border-bottom:1px solid var(--line,#444);display:flex;align-items:center;gap:12px}
      .wobbin-element-search svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2.2;flex:none}
      .wobbin-element-search input{width:100%;border:0;outline:0;background:transparent;color:var(--text,#fff);font:inherit;font-size:17px}
      .wobbin-element-search input::placeholder{color:var(--muted,#999)}
      .wobbin-element-scroll{max-height:calc(min(680px,72vh) - 60px);overflow:auto;padding:12px 12px 18px}
      .wobbin-element-group{display:grid;gap:3px;margin:0 0 12px}
      .wobbin-element-group h4{margin:8px 12px 7px;color:var(--muted,#aaa);font-size:12px;font-weight:700;text-transform:none}
      .wobbin-element-option{width:100%;height:46px;border:0;border-radius:13px;background:transparent;color:var(--text,#f7f7f7);display:flex;align-items:center;justify-content:space-between;padding:0 13px;font-size:15px;text-align:left;cursor:pointer}
      .wobbin-element-option:hover,.wobbin-element-option.selected{background:rgba(127,127,127,.18)}
      .wobbin-element-option>span{display:flex;align-items:center;gap:11px}
      .wobbin-element-option i{display:block;width:18px;height:18px;border-radius:5px;background:rgba(180,180,180,.32)}
      .wobbin-element-option.selected i{box-shadow:inset 0 0 0 5px currentColor}
      .wobbin-element-option em{font-style:normal;color:var(--muted,#999);font-size:12px}
      .wobbin-element-group.is-empty{display:none}
      @media(max-width:640px){.wobbin-element-menu{position:fixed;left:12px;right:12px;top:100px;width:auto;max-height:72vh}.wobbin-element-trigger{min-width:160px}}
    `;
    document.head.append(style);
  }

  function bindFilter(){
    const root=document.querySelector('[data-element-filter]');
    if(!root||root.dataset.bound==='1')return;
    root.dataset.bound='1';
    const toggle=root.querySelector('[data-element-filter-toggle]');
    const search=root.querySelector('[data-element-search]');
    toggle?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();root.classList.toggle('open');if(root.classList.contains('open'))setTimeout(()=>search?.focus(),0)});
    search?.addEventListener('input',()=>{
      const q=String(search.value||'').trim().toLowerCase();
      root.querySelectorAll('.wobbin-element-option').forEach(btn=>{btn.style.display=!q||String(btn.dataset.elementSearchText||'').includes(q)?'':'none'});
      root.querySelectorAll('[data-element-group]').forEach(group=>{group.classList.toggle('is-empty',![...group.querySelectorAll('.wobbin-element-option')].some(b=>b.style.display!=='none'))});
    });
    if(!window.__WOBBIN_ELEMENT_OUTSIDE_BOUND){
      window.__WOBBIN_ELEMENT_OUTSIDE_BOUND=true;
      document.addEventListener('click',e=>{document.querySelectorAll('[data-element-filter].open').forEach(el=>{if(!el.contains(e.target))el.classList.remove('open')})});
    }
  }

  const baseRender=render;
  render=function(){baseRender();queueMicrotask(()=>{ensureStyles();bindFilter()})};
  ensureStyles();
  render();
})();
