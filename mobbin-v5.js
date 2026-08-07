(()=>{
  const ELEMENTS=['Navigation','Search','Forms','Buttons','Cards','Modals','Lists','Tabs','Charts','Maps','Media','Onboarding','Empty states','Bottom sheets'];
  const filterSvg='<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M10 14v6"/></svg>';
  const searchSvg='<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>';
  let panelOpen=false;
  function topLogo(){return document.querySelector('.brand-logo img')?.src||document.querySelector('link[rel="icon"]')?.href||''}
  function apply(){
    const top=document.querySelector('.topbar'); if(!top||top.dataset.mobbinified==='1')return;
    top.dataset.mobbinified='1';
    if(!localStorage.getItem('wobbin_theme_v1')) document.documentElement.dataset.theme='dark';
    const search=top.querySelector('.search'),theme=top.querySelector('#theme'),upload=top.querySelector('#open-upload');
    const brand=document.createElement('div');brand.className='mobbin-brand';brand.innerHTML=`<button class="mobbin-logo" title="Wobbin"><img src="${topLogo()}" alt="Wobbin"></button><div class="mobbin-main-links"><button class="active">Apps</button><button class="disabled" tabindex="-1">Sites</button></div>`;
    top.insertBefore(brand,search);
    const actions=document.createElement('div');actions.className='mobbin-actions';
    if(theme)actions.appendChild(theme); if(upload)actions.appendChild(upload);
    const fav=document.createElement('button');fav.className='icon-btn';fav.title='收藏';fav.innerHTML='♡';fav.onclick=()=>document.querySelector('[data-nav="favorites"]')?.click();actions.insertBefore(fav,actions.firstChild);
    const profile=document.createElement('span');profile.className='mobbin-profile';profile.textContent='b';actions.appendChild(profile);top.appendChild(actions);
    brand.querySelector('.mobbin-logo').onclick=()=>document.querySelector('[data-nav="home"]')?.click();
    if(search){const input=search.querySelector('input');if(input)input.placeholder=document.querySelector('#back-home')?'Search screens, flows, elements...':'Search apps...'}
    insertToolbar(top);
  }
  function insertToolbar(top){
    const main=top.parentElement;if(main.querySelector('.mobbin-toolbar'))return;
    const toolbar=document.createElement('div');toolbar.className='mobbin-toolbar';
    toolbar.innerHTML=`<div class="platform-seg"><button data-p="All" class="active">All</button><button data-p="iOS">iOS</button><button data-p="Android">Android</button><button data-p="Web">Web</button></div><span class="toolbar-divider"></span><div class="browse-tabs"><button class="active">Latest</button><button>Most popular</button><button>Top rated</button><button>Animations</button></div><span class="toolbar-spacer"></span><button class="quick-filter-btn">${filterSvg}<span>Filter</span></button>`;
    top.after(toolbar);
    const sel=document.querySelector('#platform');
    toolbar.querySelectorAll('[data-p]').forEach(b=>{if(sel&&sel.value===b.dataset.p){toolbar.querySelectorAll('[data-p]').forEach(x=>x.classList.remove('active'));b.classList.add('active')}b.onclick=()=>{toolbar.querySelectorAll('[data-p]').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(sel){sel.value=b.dataset.p;sel.dispatchEvent(new Event('change',{bubbles:true}))}else{const q=document.querySelector('#search');if(q){q.value=b.dataset.p==='All'?'':b.dataset.p;q.dispatchEvent(new Event('input',{bubbles:true}))}}}});
    toolbar.querySelectorAll('.browse-tabs button').forEach((b,i)=>b.onclick=()=>{toolbar.querySelectorAll('.browse-tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(i===0){const sort=document.querySelector('#sort');if(sort){sort.value='newest';sort.dispatchEvent(new Event('change',{bubbles:true}))}}});
    toolbar.querySelector('.quick-filter-btn').onclick=()=>{panelOpen=!panelOpen;ensurePanel().classList.toggle('open',panelOpen)};
    if(panelOpen)ensurePanel().classList.add('open');
  }
  function ensurePanel(){
    let p=document.querySelector('.quick-element-panel');if(p)return p;
    p=document.createElement('section');p.className='quick-element-panel';
    const inApp=!!document.querySelector('#back-home');
    p.innerHTML=`<div class="quick-element-head"><label class="quick-element-search">${searchSvg}<input placeholder="Search UI elements..."></label></div><div class="quick-element-grid"></div>${inApp?'':'<p class="quick-element-empty">进入 App 文件包后，可直接按 UI 元素筛选截图。</p>'}`;
    document.querySelector('.mobbin-toolbar')?.after(p);
    const source=[...document.querySelectorAll('.element-strip [data-element]')].filter(x=>x.dataset.element!=='All');
    const names=source.length?source.map(x=>({key:x.dataset.element,label:x.textContent.replace(/\s+\d+\s*$/,'').trim()})):ELEMENTS.map(x=>({key:x,label:x}));
    const grid=p.querySelector('.quick-element-grid');
    names.forEach(({key,label})=>{const b=document.createElement('button');b.className='quick-element';b.dataset.key=key;b.textContent=label;b.onclick=()=>{const real=document.querySelector(`.element-strip [data-element="${CSS.escape(key)}"]`);if(real)real.click();else{const q=document.querySelector('#search');if(q){q.value=label;q.dispatchEvent(new Event('input',{bubbles:true}))}}};grid.appendChild(b)});
    p.querySelector('input').oninput=e=>{const q=e.target.value.trim().toLowerCase();grid.querySelectorAll('.quick-element').forEach(b=>b.hidden=q&&!b.textContent.toLowerCase().includes(q))};
    return p;
  }
  const observer=new MutationObserver(()=>requestAnimationFrame(apply));observer.observe(document.getElementById('app'),{childList:true,subtree:true});
  apply();
})();
