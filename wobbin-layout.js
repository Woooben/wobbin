'use strict';

(function bootWobbinLayout(){
  if(window.__WOBBIN_LAYOUT_INSTALLED)return;
  if(typeof render!=='function'||typeof all!=='function'||typeof S==='undefined'){
    setTimeout(bootWobbinLayout,80);
    return;
  }
  window.__WOBBIN_LAYOUT_INSTALLED=true;

  const SHOTS_APP='__Wobbin Shots',WEB_APP='__Wobbin Web';
  const LIBRARY_KEY='wobbin_library_mode_v1';
  const GENERIC=new Set(['Other','Imported App','Imported screens','Screens','All','Default']);
  if(!['apps','shots','web'].includes(S.libraryMode)){
    try{S.libraryMode=localStorage.getItem(LIBRARY_KEY)||'apps'}catch{S.libraryMode='apps'}
  }
  if(!S.productType)S.productType='All';

  function kindFor(item){if(item?.app===SHOTS_APP)return'shots';if(item?.app===WEB_APP)return'web';return'apps'}
  function cleanValues(values){return [...new Set((values||[]).map(v=>String(v||'').trim()).filter(v=>v&&!GENERIC.has(v)))]}
  function productTypes(item){
    if(typeof window.wobbinItemProductTypes==='function')return window.wobbinItemProductTypes(item);
    const direct=Array.isArray(item?.appTypes)?item.appTypes:[];
    const tagged=(item?.tags||[]).map(String).filter(x=>x.startsWith('type:')).map(x=>x.slice(5));
    return [...new Set([...direct,...tagged])];
  }
  function sourceItems(){
    return all().filter(x=>!x.demo&&kindFor(x)===S.libraryMode&&(S.platform==='All'||x.platform===S.platform));
  }
  function topTerms(getter,limit){
    const counts=new Map();
    for(const item of sourceItems())for(const value of cleanValues(getter(item)))counts.set(value,(counts.get(value)||0)+1);
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'en')).slice(0,limit);
  }
  function productTerms(){return topTerms(productTypes,8)}
  function elementTerms(){return topTerms(x=>x.elements||[],15)}

  function group(title,kind,rows,wide=false){
    const section=document.createElement('section');section.className='wobbin-shortcut-group'+(wide?' is-wide':'');
    const h=document.createElement('h4');h.textContent=title;section.append(h);
    const list=document.createElement('div');list.className='wobbin-shortcut-links'+(wide?' is-grid':'');
    if(!rows.length){const empty=document.createElement('span');empty.className='wobbin-shortcut-empty';empty.textContent='暂无分类';list.append(empty)}
    else for(const [name,count] of rows){
      const button=document.createElement('button');button.type='button';button.className='wobbin-shortcut-link';
      const active=kind==='product'?S.productType===name:S.element===name;if(active)button.classList.add('active');
      button.dataset.shortcutKind=kind;button.dataset.shortcutValue=name;button.innerHTML=`<span>${esc(name)}</span><em>${count}</em>`;list.append(button);
    }
    section.append(list);return section;
  }
  function shortcutNav(){
    const nav=document.createElement('section');nav.className='wobbin-shortcut-nav';nav.dataset.wobbinShortcutNav='1';
    nav.append(group('Product Types','product',productTerms()),group('UI Elements','element',elementTerms(),true));
    return nav;
  }
  function applyShortcut(kind,value){
    if(kind==='product')S.productType=S.productType===value?'All':value;
    if(kind==='element')S.element=S.element===value?'All':value;
    render();window.scrollTo({top:0,behavior:'smooth'});
  }
  function setLibraryMode(mode){
    S.libraryMode=mode;S.view='home';S.app=null;S.tab='screens';S.platform='All';S.element='All';S.productType='All';S.query='';
    try{localStorage.setItem(LIBRARY_KEY,mode)}catch{}
    render();window.scrollTo({top:0,behavior:'smooth'});
  }
  function libraryTabs(){
    const nav=document.createElement('nav');nav.className='wobbin-library-tabs';nav.setAttribute('aria-label','Library');
    [['apps','Apps'],['shots','Shots'],['web','Web']].forEach(([key,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.libraryMode=key;if(S.libraryMode===key)b.classList.add('active');b.onclick=()=>setLibraryMode(key);nav.append(b)});
    return nav;
  }
  function transformHeader(){
    const header=document.querySelector('.topbar');if(!header)return;
    const brand=header.querySelector('.brand');if(!brand)return;
    brand.querySelector('.brand-nav')?.remove();brand.querySelector('.platform-toggle')?.remove();brand.querySelector('.wobbin-library-tabs')?.remove();
    brand.append(libraryTabs());
    document.querySelectorAll('.subnav .platform-toggle,.filter-btn,.subnav .divider').forEach(el=>el.remove());
  }
  function transformMain(){
    const main=document.querySelector('.main');if(!main)return;
    main.querySelectorAll('[data-wobbin-shortcut-nav],.wobbin-shortcut-nav').forEach(el=>el.remove());
    if(S.view!=='home')return;
    const nav=shortcutNav(),subnav=main.querySelector('.subnav');if(subnav)subnav.after(nav);else main.prepend(nav);
    nav.querySelectorAll('[data-shortcut-kind]').forEach(btn=>btn.addEventListener('click',()=>applyShortcut(btn.dataset.shortcutKind,btn.dataset.shortcutValue)));
  }
  function ensureStyles(){
    if(document.getElementById('wobbin-layout-style'))return;
    const style=document.createElement('style');style.id='wobbin-layout-style';style.textContent=`
      .topbar{width:min(calc(100% - 48px),1480px)!important;height:auto!important;min-height:76px;margin:0 auto!important;padding:14px 0 10px!important;grid-template-columns:minmax(300px,1fr) minmax(420px,620px) minmax(250px,1fr)!important;gap:28px!important}
      .topbar .brand{justify-self:start;gap:16px!important;min-width:0}.topbar .searchbar{width:100%;max-width:620px;justify-self:center}.topbar .actions{justify-self:end}
      .wobbin-library-tabs{display:flex;align-items:center;padding:3px;border-radius:999px;background:var(--panel3,#272727);gap:2px}
      .wobbin-library-tabs button{height:30px;padding:0 12px;border:0;border-radius:999px;background:transparent;color:var(--muted,#999);font-size:12px;font-weight:650;cursor:pointer}.wobbin-library-tabs button.active{background:var(--bg,#111);color:var(--text,#fff)}
      .main{width:min(calc(100% - 48px),1480px)!important;max-width:1480px!important;margin:0 auto!important;padding-left:0!important;padding-right:0!important}.subnav{justify-content:flex-start!important}.subnav-left{gap:14px!important}
      .wobbin-shortcut-nav{display:grid;grid-template-columns:minmax(220px,.82fr) minmax(0,2.18fr);gap:64px;margin:8px 0 32px;padding:24px 0 30px;border-bottom:1px solid var(--line,#2c2c2c)}
      .wobbin-shortcut-group{min-width:0}.wobbin-shortcut-group h4{margin:0 0 14px;color:var(--muted,#8f8f8f);font-size:12px;font-weight:600;line-height:1.2}.wobbin-shortcut-links{display:grid;gap:8px}.wobbin-shortcut-links.is-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 28px}
      .wobbin-shortcut-link{width:100%;padding:0;border:0;background:none;color:var(--text,#f5f5f5);display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;font-size:16px;line-height:1.2;font-weight:700;letter-spacing:-.015em;min-width:0}.wobbin-shortcut-link:hover{opacity:.72}.wobbin-shortcut-link.active{color:#fff}.wobbin-shortcut-link.active span{text-decoration:underline;text-underline-offset:4px}.wobbin-shortcut-link span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wobbin-shortcut-link em{margin-left:auto;color:var(--muted,#8f8f8f);font-size:10px;font-style:normal;font-weight:600}.wobbin-shortcut-empty{color:var(--muted,#8f8f8f);font-size:13px}
      @media(max-width:1100px){.topbar{width:min(calc(100% - 36px),1480px)!important;grid-template-columns:1fr minmax(320px,520px) auto!important;gap:18px!important}.main{width:min(calc(100% - 36px),1480px)!important}.wobbin-shortcut-nav{grid-template-columns:1fr 2fr;gap:36px}.wobbin-shortcut-links.is-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:760px){.topbar{grid-template-columns:1fr auto!important;gap:12px!important;padding-top:12px!important}.topbar .searchbar{grid-column:1/-1;grid-row:2;max-width:none}.topbar .actions{grid-column:2;grid-row:1}.topbar .brand{grid-column:1;grid-row:1}.main{width:min(calc(100% - 28px),1480px)!important}.wobbin-shortcut-nav{grid-template-columns:1fr;gap:26px;margin-top:4px}.wobbin-shortcut-links.is-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wobbin-shortcut-link{font-size:15px}}
      @media(max-width:520px){.wobbin-library-tabs{max-width:230px;overflow:auto;scrollbar-width:none}.wobbin-shortcut-links.is-grid{grid-template-columns:1fr 1fr}}
    `;document.head.append(style);
  }
  function applyLayout(){ensureStyles();transformHeader();transformMain()}

  const baseRender=render;
  render=function(){baseRender();queueMicrotask(()=>queueMicrotask(applyLayout))};
  applyLayout();

  if(!document.querySelector('script[data-wobbin-package-meta]')){
    const script=document.createElement('script');script.src='./wobbin-package-meta.js';script.dataset.wobbinPackageMeta='1';document.body.append(script);
  }
})();
