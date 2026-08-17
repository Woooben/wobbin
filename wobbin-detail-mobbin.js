'use strict';

(function bootWobbinMobbinDetail(){
  if(window.__WOBBIN_MOBBIN_DETAIL_INSTALLED)return;
  if(typeof detail!=='function'||typeof bind!=='function'||typeof render!=='function'||typeof all!=='function'||typeof S==='undefined'){
    setTimeout(bootWobbinMobbinDetail,80);
    return;
  }
  window.__WOBBIN_MOBBIN_DETAIL_INSTALLED=true;

  const RATING_KEY='wobbin_app_ratings_v1';
  const SORTS=[['latest','Latest'],['oldest','Oldest']];
  if(!S.detailSort)S.detailSort='latest';
  if(!S.flowFilter)S.flowFilter='All';

  function uniq(values){return [...new Set((values||[]).filter(Boolean))]}
  function appItems(){return all().filter(x=>x.app===S.app)}
  function appPlatforms(items=appItems()){return uniq(items.map(x=>x.platform))}
  function appFlows(items=appItems()){return uniq(items.map(x=>x.flow||'Imported screens'))}
  function appElements(items=appItems()){return uniq(items.flatMap(x=>Array.isArray(x.elements)?x.elements:[])).sort((a,b)=>String(a).localeCompare(String(b),'en'))}
  function appTypes(items=appItems()){return uniq(items.flatMap(x=>Array.isArray(x.appTypes)?x.appTypes:[]))}
  function labelForElement(value){
    const legacy=typeof ELEMENTS!=='undefined'?ELEMENTS.find(x=>x[0]===value):null;
    return legacy?.[1]||window.WOBBIN_LABEL_ALIASES?.[value]?.[0]||value;
  }
  function ratingId(){
    try{
      if(window.WOBBIN_CLOUD?.apps instanceof Map){
        for(const [id,row] of WOBBIN_CLOUD.apps){if(row?.name===S.app)return id}
      }
    }catch{}
    return String(S.app||'');
  }
  function ratings(){try{return JSON.parse(localStorage.getItem(RATING_KEY)||'{}')}catch{return{}}}
  function ratingValue(){const n=Number(ratings()[ratingId()]);return Number.isFinite(n)&&n>=1&&n<=5?n:0}
  function saveRating(value){
    const map=ratings();map[ratingId()]=Number(value);localStorage.setItem(RATING_KEY,JSON.stringify(map));
  }
  function starMarkup(value){
    return `<div class="mobbin-rating-control" role="radiogroup" aria-label="5 分制评分">${[1,2,3,4,5].map(n=>`<button type="button" data-rate-app="${n}" class="${n<=value?'active':''}" aria-label="${n} 分" aria-checked="${n===value?'true':'false'}">★</button>`).join('')}<span>${value?`${value.toFixed(1)} / 5`:'未评分'}</span></div>`;
  }
  function detailItems(){
    let list=currentItems();
    if(S.flowFilter&&S.flowFilter!=='All')list=list.filter(x=>(x.flow||'Imported screens')===S.flowFilter);
    list=[...list].sort((a,b)=>{
      const ta=new Date(a.createdAt||a.created_at||0).getTime()||0;
      const tb=new Date(b.createdAt||b.created_at||0).getTime()||0;
      return S.detailSort==='oldest'?ta-tb:tb-ta;
    });
    return list;
  }
  function option(value,label,selected){return `<option value="${attr(value)}" ${selected===value?'selected':''}>${esc(label)}</option>`}
  function detailFilter(items){
    if(S.tab==='flows'){
      const flows=appFlows(items);
      return `<label class="mobbin-filter-select"><span>Flow</span><select data-detail-flow-filter>${option('All','All flows',S.flowFilter)}${flows.map(x=>option(x,x,S.flowFilter)).join('')}</select></label>`;
    }
    if(S.tab==='elements'){
      const elements=appElements(items);
      return `<label class="mobbin-filter-select"><span>UI Elements</span><select data-detail-element-filter>${option('All','All UI Elements',S.element)}${elements.map(x=>option(x,labelForElement(x),S.element)).join('')}</select></label>`;
    }
    const platforms=appPlatforms(items);
    return `<label class="mobbin-filter-select"><span>Platform</span><select data-detail-platform-filter>${option('All','All platforms',S.platform)}${platforms.map(x=>option(x,x,S.platform)).join('')}</select></label>`;
  }
  function detailTabs(items,list){
    const resultLabel=S.tab==='elements'?'UI elements':'screens';
    return `<div class="mobbin-detail-tabs"><div class="mobbin-detail-tabs-left"><label class="mobbin-sort-select"><span class="sr-only">Sort</span><select data-detail-sort>${SORTS.map(([v,l])=>option(v,l,S.detailSort)).join('')}</select></label><span class="mobbin-tab-divider"></span><nav class="tabs" aria-label="Detail views"><button type="button" data-tab="screens" class="${S.tab==='screens'?'active':''}">Screens</button><button type="button" data-tab="elements" class="${S.tab==='elements'?'active':''}">UI Elements</button><button type="button" data-tab="flows" class="${S.tab==='flows'?'active':''}">Flows</button></nav><span class="mobbin-tab-divider"></span>${detailFilter(items)}</div><span class="mobbin-result-count">Showing<br><strong>${list.length}</strong> ${resultLabel}</span></div>`;
  }
  function viewFor(list){return S.tab==='flows'?flowView(list):screenView(list)}

  detail=function(){
    const items=appItems();
    const list=detailItems();
    const platforms=appPlatforms(items);
    const types=appTypes(items);
    const flowCount=appFlows(items).length;
    const rating=ratingValue();
    return `<main class="main wobbin-mobbin-detail">
      <section class="mobbin-detail-hero">
        <button id="back" class="mobbin-detail-back" type="button">${backIcon}<span>Apps</span></button>
        <div class="app-head">
          <div class="app-title">
            <div class="app-icon">${esc((S.app||'?').slice(0,1).toUpperCase())}</div>
            <div class="mobbin-title-copy">
              <h1>${esc(S.app||'')}</h1>
              <p class="mobbin-title-summary">${items.length} screens · ${flowCount} flows</p>
            </div>
          </div>
          <div class="mobbin-detail-menu">
            <button type="button" class="mobbin-more-btn" data-detail-more aria-label="更多操作" aria-expanded="false">•••</button>
            <div class="mobbin-detail-menu-popover" data-detail-menu-popover hidden>
              <div class="app-head-actions"><button type="button" id="set-cover-current" class="detail-action-btn">设置封面</button></div>
            </div>
          </div>
        </div>
        <div class="mobbin-product-meta">
          <div class="mobbin-meta-block"><span>Platform</span><strong>${esc(platforms.join(', ')||'—')}</strong></div>
          <div class="mobbin-meta-block"><span>Rating</span>${starMarkup(rating)}</div>
          <div class="mobbin-meta-block"><span>Category</span><strong data-mobbin-category-value>${esc(types.join(', ')||'—')}</strong></div>
        </div>
      </section>
      <section class="mobbin-detail-browser">
        ${detailTabs(items,list)}
        <div class="subnav mobbin-batch-anchor" aria-hidden="true"></div>
        <div class="mobbin-detail-content">${viewFor(list)}</div>
      </section>
    </main>${suggestions()}`;
  };

  const baseBind=bind;
  bind=function(){
    baseBind();
    document.querySelectorAll('[data-tab]').forEach(btn=>{
      btn.onclick=()=>{
        S.tab=btn.dataset.tab;
        S.platform='All';
        S.element='All';
        S.flowFilter='All';
        render();
      };
    });
    document.querySelector('[data-detail-sort]')?.addEventListener('change',e=>{S.detailSort=e.target.value;render()});
    document.querySelector('[data-detail-platform-filter]')?.addEventListener('change',e=>{S.platform=e.target.value;render()});
    document.querySelector('[data-detail-element-filter]')?.addEventListener('change',e=>{S.element=e.target.value;S.flowFilter='All';render()});
    document.querySelector('[data-detail-flow-filter]')?.addEventListener('change',e=>{S.flowFilter=e.target.value;S.element='All';S.platform='All';render()});
    document.querySelectorAll('[data-rate-app]').forEach(btn=>btn.addEventListener('click',()=>{saveRating(Number(btn.dataset.rateApp));render()}));
    const more=document.querySelector('[data-detail-more]'),popover=document.querySelector('[data-detail-menu-popover]');
    more?.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      const open=popover?.hasAttribute('hidden');
      if(open)popover?.removeAttribute('hidden');else popover?.setAttribute('hidden','');
      more.setAttribute('aria-expanded',open?'true':'false');
    });
    popover?.addEventListener('click',e=>e.stopPropagation());
  };

  if(typeof selectedVisibleScreenIds==='function'){
    selectedVisibleScreenIds=function(){return detailItems().map(x=>x.id)};
  }

  function ensureStyles(){
    if(document.getElementById('wobbin-mobbin-detail-style'))return;
    const style=document.createElement('style');style.id='wobbin-mobbin-detail-style';style.textContent=`
      .sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
      .wobbin-mobbin-detail{width:min(calc(100% - 96px),1760px)!important;max-width:1760px!important;padding:42px 0 84px!important}
      .mobbin-detail-hero{position:relative;min-height:410px;padding:0 0 52px;border-bottom:1px solid var(--line,#2c2c2c)}
      .mobbin-detail-back{height:34px;display:inline-flex;align-items:center;gap:7px;padding:0;border:0;background:none;color:var(--muted,#8f8f8f);font-size:12px;font-weight:650;cursor:pointer;margin-bottom:26px}.mobbin-detail-back:hover{color:var(--text,#fff)}.mobbin-detail-back svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}
      .wobbin-mobbin-detail .app-head{margin:0;display:flex;align-items:flex-start;justify-content:space-between;gap:28px}.wobbin-mobbin-detail .app-title{display:grid;grid-template-columns:96px minmax(0,1fr);align-items:start;gap:28px;min-width:0}.wobbin-mobbin-detail .app-title>.app-icon{width:96px;height:96px;border-radius:22px;font-size:28px;background:var(--panel2,#222);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--text) 7%,transparent)}.wobbin-mobbin-detail .app-title h1{margin:20px 0 0;font-size:42px;line-height:1.04;letter-spacing:-.045em}.mobbin-title-summary{margin:10px 0 0!important;color:var(--muted,#8f8f8f)!important;font-size:12px!important}.wobbin-mobbin-detail .wobbin-app-description{max-width:760px!important;margin:11px 0 0!important;font-size:13px!important;line-height:1.6!important}.wobbin-mobbin-detail .wobbin-app-type-tags{display:flex!important;gap:7px!important;margin-top:14px!important}.wobbin-mobbin-detail .wobbin-app-type-tags span{height:27px!important;padding:0 10px!important;border:1px solid var(--line,#333)!important;border-radius:999px!important;background:transparent!important;color:var(--text,#fff)!important;font-size:10px!important}
      .mobbin-detail-menu{position:relative;margin-top:18px}.mobbin-more-btn{width:42px;height:42px;border:1px solid var(--line,#333);border-radius:12px;background:var(--panel2,#222);color:var(--text,#fff);font-size:16px;letter-spacing:2px;cursor:pointer}.mobbin-more-btn:hover{background:var(--hover,#262626)}.mobbin-detail-menu-popover{position:absolute;z-index:55;top:50px;right:0;width:190px;padding:6px;border:1px solid var(--line,#333);border-radius:13px;background:var(--panel,#1c1c1c);box-shadow:var(--shadow,0 18px 40px rgba(0,0,0,.3))}.mobbin-detail-menu-popover[hidden]{display:none}.mobbin-detail-menu-popover .app-head-actions{display:grid!important;gap:2px!important}.mobbin-detail-menu-popover .app-head-actions button{width:100%!important;height:38px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;padding:0 11px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:var(--text,#fff)!important;font-size:11px!important;font-weight:650!important;cursor:pointer!important}.mobbin-detail-menu-popover .app-head-actions button:hover{background:var(--hover,#262626)!important}.mobbin-detail-menu-popover .app-head-actions .danger-outline,.mobbin-detail-menu-popover .app-head-actions .delete-package-btn{color:#ff8d8d!important}
      .mobbin-product-meta{display:grid;grid-template-columns:110px minmax(210px,auto) minmax(200px,1fr);gap:30px;margin-top:34px;margin-left:124px}.mobbin-meta-block{min-width:0}.mobbin-meta-block>span{display:block;margin-bottom:7px;color:var(--muted,#8f8f8f);font-size:10px;font-weight:600;letter-spacing:.01em}.mobbin-meta-block>strong{display:block;max-width:520px;color:var(--text,#fff);font-size:14px;line-height:1.35;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mobbin-rating-control{display:flex;align-items:center;gap:1px;min-height:20px}.mobbin-rating-control button{width:18px;height:22px;padding:0;border:0;background:none;color:#555;font-size:15px;line-height:1;cursor:pointer;transition:transform .12s ease,color .12s ease}.mobbin-rating-control button:hover{transform:translateY(-1px);color:var(--text,#fff)}.mobbin-rating-control button.active{color:var(--text,#fff)}.mobbin-rating-control span{margin-left:7px;color:var(--text,#fff);font-size:13px;font-weight:700}
      .mobbin-detail-browser{padding-top:26px}.mobbin-detail-tabs{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-bottom:24px}.mobbin-detail-tabs-left{display:flex;align-items:center;gap:20px;min-width:0;overflow:auto;scrollbar-width:none}.mobbin-detail-tabs-left::-webkit-scrollbar{display:none}.mobbin-detail-tabs .tabs{display:flex;gap:24px;margin:0;border:0;flex:0 0 auto}.mobbin-detail-tabs .tabs button{height:42px;padding:0;border:0;background:none;color:var(--muted,#777);font-size:13px;font-weight:750}.mobbin-detail-tabs .tabs button.active{color:var(--text,#fff);border-bottom:2px solid var(--text,#fff)}.mobbin-tab-divider{width:1px;height:32px;flex:0 0 1px;background:var(--line,#333)}.mobbin-sort-select select,.mobbin-filter-select select{height:38px;padding:0 30px 0 11px;border:1px solid var(--line,#333);border-radius:999px;background:var(--bg,#111);color:var(--text,#fff);outline:none;font-size:11px;font-weight:650;cursor:pointer}.mobbin-filter-select{display:flex;align-items:center;gap:8px;flex:0 0 auto}.mobbin-filter-select>span{color:var(--muted,#777);font-size:10px}.mobbin-result-count{flex:0 0 auto;color:var(--muted,#777);font-size:10px;line-height:1.35;text-align:right}.mobbin-result-count strong{color:inherit;font-size:inherit;font-weight:700}
      .mobbin-batch-anchor{display:none!important}.wobbin-mobbin-detail .batch-toolbar{margin:0 0 24px!important}.mobbin-detail-content{min-height:220px}.wobbin-mobbin-detail .screens-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:28px 18px}.wobbin-mobbin-detail .screen-frame{min-height:0!important;padding:0!important;border-radius:22px!important;background:transparent!important;align-items:flex-start!important;overflow:visible!important}.wobbin-mobbin-detail .screen-frame img{width:100%!important;max-width:100%!important;height:auto!important;object-fit:contain!important;border-radius:22px!important;box-shadow:none!important;background:var(--panel2,#222)}.wobbin-mobbin-detail .screen-name{margin-top:9px}.wobbin-mobbin-detail .screen-name strong{font-size:11px}.wobbin-mobbin-detail .screen-name span{font-size:9px}.wobbin-mobbin-detail .screen-delete-btn{top:8px!important;right:8px!important}.wobbin-mobbin-detail .section-head{margin:0 0 14px}.wobbin-mobbin-detail .section-head h1{font-size:15px!important}.wobbin-mobbin-detail .section-head p{font-size:10px}.wobbin-mobbin-detail .empty{margin-top:12px}
      @media(max-width:1500px){.wobbin-mobbin-detail{width:min(calc(100% - 64px),1480px)!important}.wobbin-mobbin-detail .screens-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
      @media(max-width:1180px){.wobbin-mobbin-detail{width:min(calc(100% - 44px),1120px)!important}.wobbin-mobbin-detail .screens-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.mobbin-product-meta{grid-template-columns:100px minmax(200px,auto) 1fr}}
      @media(max-width:900px){.wobbin-mobbin-detail{width:calc(100% - 32px)!important;padding-top:24px!important}.wobbin-mobbin-detail .app-title{grid-template-columns:72px minmax(0,1fr);gap:18px}.wobbin-mobbin-detail .app-title>.app-icon{width:72px;height:72px;border-radius:17px}.wobbin-mobbin-detail .app-title h1{margin-top:10px;font-size:34px}.mobbin-product-meta{margin-left:90px;grid-template-columns:1fr 1fr;gap:22px}.mobbin-meta-block:last-child{grid-column:1/-1}.mobbin-detail-tabs{align-items:flex-start}.wobbin-mobbin-detail .screens-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:640px){.wobbin-mobbin-detail{width:calc(100% - 24px)!important}.mobbin-detail-hero{min-height:0;padding-bottom:34px}.wobbin-mobbin-detail .app-head{gap:12px}.wobbin-mobbin-detail .app-title{grid-template-columns:58px minmax(0,1fr);gap:14px}.wobbin-mobbin-detail .app-title>.app-icon{width:58px;height:58px;border-radius:14px}.wobbin-mobbin-detail .app-title h1{margin-top:4px;font-size:27px}.mobbin-title-summary{font-size:10px!important}.mobbin-detail-menu{margin-top:4px}.mobbin-more-btn{width:38px;height:38px}.mobbin-product-meta{margin-left:0;grid-template-columns:1fr;gap:18px;margin-top:28px}.mobbin-meta-block:last-child{grid-column:auto}.mobbin-detail-tabs{display:block}.mobbin-result-count{display:block;margin-top:12px;text-align:left}.wobbin-mobbin-detail .screens-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 10px}.mobbin-detail-tabs-left{gap:12px}.mobbin-detail-tabs .tabs{gap:16px}.mobbin-tab-divider{display:none}}
    `;document.head.append(style);
  }


  function syncCategoryFromMetaTags(){
    if(S.view!=='app')return;
    const target=document.querySelector('[data-mobbin-category-value]');
    const labels=[...document.querySelectorAll('.wobbin-app-type-tags span')].map(x=>x.textContent?.trim()).filter(Boolean);
    if(target&&labels.length)target.textContent=labels.join(', ');
  }
  const metaObserver=new MutationObserver(()=>syncCategoryFromMetaTags());
  const appRoot=document.getElementById('app');if(appRoot)metaObserver.observe(appRoot,{childList:true,subtree:true});

  function closeMenuOnOutsideClick(e){
    const menu=document.querySelector('.mobbin-detail-menu');
    const popover=document.querySelector('[data-detail-menu-popover]');
    const more=document.querySelector('[data-detail-more]');
    if(!menu||!popover||popover.hasAttribute('hidden')||menu.contains(e.target))return;
    popover.setAttribute('hidden','');more?.setAttribute('aria-expanded','false');
  }
  document.addEventListener('click',closeMenuOnOutsideClick);

  ensureStyles();
  render();
})();
