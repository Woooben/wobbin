'use strict';

(function bootWobbinLayout(){
  if(window.__WOBBIN_LAYOUT_INSTALLED)return;
  if(typeof render!=='function'||typeof all!=='function'||typeof S==='undefined'){
    setTimeout(bootWobbinLayout,80);
    return;
  }
  window.__WOBBIN_LAYOUT_INSTALLED=true;

  const GENERIC=new Set(['Other','Imported App','Imported screens','Screens','All','Default']);

  function cleanValues(values){
    return [...new Set((values||[]).map(v=>String(v||'').trim()).filter(v=>v&&!GENERIC.has(v)))];
  }

  function sourceItems(){
    return all().filter(x=>!x.demo&&(S.platform==='All'||x.platform===S.platform));
  }

  function topTerms(getter,limit=5){
    const counts=new Map();
    for(const item of sourceItems()){
      for(const value of cleanValues(getter(item))){
        counts.set(value,(counts.get(value)||0)+1);
      }
    }
    return [...counts.entries()]
      .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'en'))
      .slice(0,limit);
  }

  function categoryTerms(){
    const direct=topTerms(x=>x.appTypes||[],5);
    if(direct.length)return direct;
    return topTerms(x=>[x.category],5);
  }

  function screenTerms(){
    return topTerms(x=>x.pageTypes||[],5);
  }

  function elementTerms(){
    return topTerms(x=>x.elements||[],5);
  }

  function flowTerms(){
    return topTerms(x=>[x.flow],5);
  }

  function column(title,kind,rows){
    const section=document.createElement('section');
    section.className='wobbin-shortcut-group';
    const h=document.createElement('h4');
    h.textContent=title;
    section.append(h);
    const list=document.createElement('div');
    list.className='wobbin-shortcut-links';
    if(!rows.length){
      const empty=document.createElement('span');
      empty.className='wobbin-shortcut-empty';
      empty.textContent='暂无分类';
      list.append(empty);
    }else{
      for(const [name,count] of rows){
        const button=document.createElement('button');
        button.type='button';
        button.className='wobbin-shortcut-link';
        button.dataset.shortcutKind=kind;
        button.dataset.shortcutValue=name;
        button.innerHTML=`<span>${esc(name)}</span><em>${count}</em>`;
        list.append(button);
      }
    }
    section.append(list);
    return section;
  }

  function shortcutNav(){
    const nav=document.createElement('section');
    nav.className='wobbin-shortcut-nav';
    nav.dataset.wobbinShortcutNav='1';
    nav.append(
      column('Categories','category',categoryTerms()),
      column('Screens','screen',screenTerms()),
      column('UI Elements','element',elementTerms()),
      column('Flows','flow',flowTerms())
    );
    return nav;
  }

  function applyShortcut(kind,value){
    if(kind==='element'){
      S.element=value;
      S.query='';
      if(S.view==='app')S.tab='elements';
    }else{
      S.element='All';
      S.query=value;
    }
    render();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function transformHeader(){
    const header=document.querySelector('.topbar');
    if(!header)return;

    const brand=header.querySelector('.brand');
    brand?.querySelector('.brand-nav')?.remove();

    const platform=document.querySelector('.subnav .platform-toggle');
    if(platform&&brand&&!brand.contains(platform))brand.append(platform);

    document.querySelectorAll('.filter-btn').forEach(el=>el.remove());
    document.querySelectorAll('.subnav .divider').forEach(el=>el.remove());
  }

  function transformMain(){
    const main=document.querySelector('.main');
    if(!main)return;

    main.querySelector('[data-wobbin-shortcut-nav]')?.remove();
    const nav=shortcutNav();
    const subnav=main.querySelector('.subnav');
    if(subnav)subnav.after(nav);
    else main.prepend(nav);

    nav.querySelectorAll('[data-shortcut-kind]').forEach(btn=>{
      btn.addEventListener('click',()=>applyShortcut(btn.dataset.shortcutKind,btn.dataset.shortcutValue));
    });
  }

  function ensureStyles(){
    if(document.getElementById('wobbin-layout-style'))return;
    const style=document.createElement('style');
    style.id='wobbin-layout-style';
    style.textContent=`
      .topbar{
        width:min(calc(100% - 48px),1480px)!important;
        height:auto!important;
        min-height:76px;
        margin:0 auto!important;
        padding:14px 0 10px!important;
        grid-template-columns:minmax(250px,1fr) minmax(420px,620px) minmax(250px,1fr)!important;
        gap:28px!important;
      }
      .topbar .brand{justify-self:start;gap:16px!important;min-width:0}
      .topbar .brand .platform-toggle{flex:none}
      .topbar .searchbar{width:100%;max-width:620px;justify-self:center}
      .topbar .actions{justify-self:end}
      .main{
        width:min(calc(100% - 48px),1480px)!important;
        max-width:1480px!important;
        margin:0 auto!important;
        padding-left:0!important;
        padding-right:0!important;
      }
      .subnav{justify-content:flex-start!important}
      .subnav-left{gap:14px!important}
      .wobbin-shortcut-nav{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:54px;
        margin:8px 0 32px;
        padding:24px 0 30px;
        border-bottom:1px solid var(--line,#2c2c2c);
      }
      .wobbin-shortcut-group{min-width:0}
      .wobbin-shortcut-group h4{
        margin:0 0 14px;
        color:var(--muted,#8f8f8f);
        font-size:12px;
        font-weight:600;
        line-height:1.2;
      }
      .wobbin-shortcut-links{display:grid;gap:8px}
      .wobbin-shortcut-link{
        width:100%;
        padding:0;
        border:0;
        background:none;
        color:var(--text,#f5f5f5);
        display:flex;
        align-items:center;
        gap:10px;
        text-align:left;
        cursor:pointer;
        font-size:17px;
        line-height:1.18;
        font-weight:720;
        letter-spacing:-.02em;
      }
      .wobbin-shortcut-link:hover{opacity:.72}
      .wobbin-shortcut-link span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .wobbin-shortcut-link em{
        margin-left:auto;
        color:var(--muted,#8f8f8f);
        font-size:10px;
        font-style:normal;
        font-weight:600;
      }
      .wobbin-shortcut-empty{color:var(--muted,#8f8f8f);font-size:13px}
      @media(max-width:1100px){
        .topbar{width:min(calc(100% - 36px),1480px)!important;grid-template-columns:1fr minmax(320px,520px) auto!important;gap:18px!important}
        .main{width:min(calc(100% - 36px),1480px)!important}
        .wobbin-shortcut-nav{grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 48px}
      }
      @media(max-width:760px){
        .topbar{grid-template-columns:1fr auto!important;gap:12px!important;padding-top:12px!important}
        .topbar .searchbar{grid-column:1 / -1;grid-row:2;max-width:none}
        .topbar .actions{grid-column:2;grid-row:1}
        .topbar .brand{grid-column:1;grid-row:1}
        .main{width:min(calc(100% - 28px),1480px)!important}
        .wobbin-shortcut-nav{grid-template-columns:1fr 1fr;gap:26px 22px;margin-top:4px}
        .wobbin-shortcut-link{font-size:15px}
      }
      @media(max-width:520px){
        .topbar .brand .platform-toggle{max-width:220px;overflow:auto;scrollbar-width:none}
        .wobbin-shortcut-nav{grid-template-columns:1fr}
      }
    `;
    document.head.append(style);
  }

  function applyLayout(){
    ensureStyles();
    transformHeader();
    transformMain();
  }

  const baseRender=render;
  render=function(){
    baseRender();
    queueMicrotask(()=>queueMicrotask(applyLayout));
  };

  applyLayout();
})();
