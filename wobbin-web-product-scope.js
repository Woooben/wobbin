'use strict';

(function bootWobbinWebProductScope(){
  if(window.__WOBBIN_WEB_PRODUCT_SCOPE_INSTALLED)return;
  if(!window.__WOBBIN_WEB_PACKAGES_INSTALLED||typeof importEntries!=='function'||typeof render!=='function'||typeof all!=='function'||typeof S==='undefined'){
    setTimeout(bootWobbinWebProductScope,80);
    return;
  }
  window.__WOBBIN_WEB_PRODUCT_SCOPE_INSTALLED=true;

  const WEB_PREFIX='__WobbinWebPackage::';
  const LEGACY_WEB_APP='__Wobbin Web';
  const WEB_KIND_TAG='kind:web';

  function isScoped(name){return String(name||'').startsWith(WEB_PREFIX)}
  function displayName(name){const value=String(name||'');return isScoped(value)?value.slice(WEB_PREFIX.length):value}
  function storageName(name){const value=displayName(name).trim();return value?WEB_PREFIX+value:''}
  function isWebItem(item){return item?.app===LEGACY_WEB_APP||item?.libraryKind==='web'||(item?.tags||[]).map(String).includes(WEB_KIND_TAG)}
  function hasWebPackage(display){return all().some(x=>!x.demo&&isWebItem(x)&&x.app!==LEGACY_WEB_APP&&displayName(x.app)===display)}

  window.wobbinDisplayAppName=displayName;
  window.wobbinWebStorageName=storageName;

  const baseImportEntries=importEntries;
  importEntries=async function(){
    if((S.uploadKind||'app')!=='web'||S.uploadTarget!=='new')return baseImportEntries();
    const input=document.getElementById('up-app');
    const typed=displayName(input?.value||S.uploadMeta?.app||'').trim();
    if(!typed)return baseImportEntries();
    if(hasWebPackage(typed))return toast('这个 Web 文件包已存在，请选择“添加到已有 Web 文件包”');
    const scoped=storageName(typed);
    if(input)input.value=scoped;
    if(S.uploadMeta)S.uploadMeta.app=scoped;
    try{
      return await baseImportEntries();
    }finally{
      if(S.upload){
        if(S.uploadMeta)S.uploadMeta.app=typed;
        const next=document.getElementById('up-app');if(next)next.value=typed;
      }else if(S.uploadMeta&&S.uploadMeta.app===scoped){
        S.uploadMeta.app='';
      }
    }
  };

  function decorateWebNames(){
    document.querySelectorAll('.web-package-card').forEach(card=>{
      const open=card.querySelector('[data-open-app]');
      const raw=open?.dataset.openApp;if(!raw)return;
      const visible=displayName(raw);
      const title=card.querySelector('.app-copy strong');if(title)title.textContent=visible;
      const image=card.querySelector('.cover-image img');if(image)image.alt=visible;
    });
    document.querySelectorAll('#up-web-existing option').forEach(option=>{option.textContent=displayName(option.value)});
    if(S.view==='app'&&isScoped(S.app)){
      const visible=displayName(S.app);
      const title=document.querySelector('.wobbin-mobbin-detail .app-title h1');if(title)title.textContent=visible;
      const back=document.querySelector('.mobbin-detail-back span');if(back)back.textContent='Web';
      const icon=document.querySelector('.wobbin-mobbin-detail .app-title>.app-icon');
      if(icon&&!icon.querySelector('img'))icon.textContent=visible.slice(0,1).toUpperCase()||'W';
      const editorName=document.querySelector('[data-app-meta-editor] [data-app-meta-name]');
      if(editorName&&!editorName.dataset.webVisibleName){editorName.value=visible;editorName.dataset.webVisibleName='1'}
    }
    if(S.coverPicker&&isScoped(S.coverPicker)){
      const heading=document.querySelector('#cover-bg .modal-head h2');if(heading)heading.textContent=`设置 ${displayName(S.coverPicker)} 封面`;
    }
  }

  document.addEventListener('click',event=>{
    if(!isScoped(S.app))return;
    const save=event.target.closest?.('[data-app-meta-save]');if(!save)return;
    const input=document.querySelector('[data-app-meta-editor] [data-app-meta-name]');if(!input)return;
    input.value=storageName(input.value);
    setTimeout(()=>{
      const current=document.querySelector('[data-app-meta-editor] [data-app-meta-name]');
      if(current){current.value=displayName(current.value);current.dataset.webVisibleName='1'}
    },0);
  },true);

  const baseRender=render;
  render=function(){baseRender();queueMicrotask(()=>queueMicrotask(decorateWebNames))};
  decorateWebNames();
  render();
})();
