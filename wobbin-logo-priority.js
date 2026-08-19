'use strict';

(function bootWobbinLogoPriority(){
  if(window.__WOBBIN_LOGO_PRIORITY_INSTALLED)return;
  if(
    typeof render!=='function'||typeof S==='undefined'||typeof WOBBIN_SUPABASE_URL==='undefined'||
    typeof resolveAppLogo!=='function'||typeof window.wobbinUploadAppLogo!=='function'
  ){
    setTimeout(bootWobbinLogoPriority,80);
    return;
  }
  window.__WOBBIN_LOGO_PRIORITY_INSTALLED=true;

  const META_URL=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-app-meta';
  const manualLogos=new Map();
  let metaLoaded=false;
  let metaLoading=null;

  async function loadManualLogos(force=false){
    if(metaLoading)return metaLoading;
    if(metaLoaded&&!force)return;
    metaLoading=(async()=>{
      try{
        const res=await fetch(META_URL,{cache:'no-store'}),data=await res.json().catch(()=>({}));
        if(!res.ok)throw new Error(data.error||'产品头像信息读取失败');
        manualLogos.clear();
        for(const row of data.apps||[]){
          const name=String(row?.name||'').trim(),url=String(row?.logo_url||'').trim();
          if(name&&url)manualLogos.set(name,url);
        }
        metaLoaded=true;
      }catch(error){console.warn('Wobbin logo priority metadata load failed',error)}
      finally{metaLoading=null}
    })();
    return metaLoading;
  }

  function manualLogo(name){return manualLogos.get(String(name||'').trim())||''}
  function markManualLogo(icon,name,url){
    if(!icon||!url)return;
    const img=document.createElement('img');
    img.src=url;img.alt=`${String(name||'产品')} logo`;img.loading='lazy';img.referrerPolicy='no-referrer';
    icon.replaceChildren(img);
    icon.classList.add('has-image','has-logo');
    icon.dataset.logoSource='manual';
    icon.dataset.logoLoaded='1';
  }
  function applyManualLogos(){
    document.querySelectorAll('.app-card').forEach(card=>{
      const raw=card.querySelector('[data-open-app]')?.dataset.openApp;if(!raw)return;
      const url=manualLogo(raw);if(!url)return;
      const icon=card.querySelector('.card-info .app-icon,.card-info .web-package-icon');
      markManualLogo(icon,raw,url);
    });
    if(S.view==='app'&&S.app){
      const url=manualLogo(S.app);if(url)markManualLogo(document.querySelector('.app-title>.app-icon,.app-title .app-icon'),S.app,url);
    }
  }
  function scheduleApply(){
    queueMicrotask(()=>queueMicrotask(applyManualLogos));
    setTimeout(applyManualLogos,250);
    setTimeout(applyManualLogos,1200);
    setTimeout(applyManualLogos,8200);
  }

  const baseResolveAppLogo=resolveAppLogo;
  resolveAppLogo=async function(name){
    await loadManualLogos(false);
    if(manualLogo(name))return null;
    return baseResolveAppLogo(name);
  };

  const baseUploadAppLogo=window.wobbinUploadAppLogo;
  window.wobbinUploadAppLogo=async function(appId,file){
    const result=await baseUploadAppLogo(appId,file);
    const row=result?.app;
    if(row?.name&&row?.logo_url){manualLogos.set(String(row.name),String(row.logo_url));metaLoaded=true}
    else await loadManualLogos(true);
    scheduleApply();
    return result;
  };

  document.addEventListener('click',event=>{
    if(!event.target.closest?.('[data-app-meta-save]'))return;
    setTimeout(async()=>{await loadManualLogos(true);scheduleApply()},900);
    setTimeout(async()=>{await loadManualLogos(true);scheduleApply()},2200);
  },true);

  const baseRender=render;
  render=function(){baseRender();scheduleApply()};

  loadManualLogos(true).then(scheduleApply);
  scheduleApply();
})();
