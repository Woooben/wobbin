'use strict';

(function bootWobbinWebAvatar(){
  if(window.__WOBBIN_WEB_AVATAR_INSTALLED)return;
  if(
    !window.__WOBBIN_WEB_PACKAGES_INSTALLED||!window.__WOBBIN_WEB_PRODUCT_SCOPE_INSTALLED||
    typeof uploadModal!=='function'||typeof importEntries!=='function'||typeof render!=='function'||
    typeof S==='undefined'||typeof WOBBIN_SUPABASE_URL==='undefined'
  ){
    setTimeout(bootWobbinWebAvatar,80);
    return;
  }
  window.__WOBBIN_WEB_AVATAR_INSTALLED=true;

  const META_URL=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-app-meta';
  const LEGACY_WEB_APP='__Wobbin Web';
  const WEB_KIND_TAG='kind:web';
  let metaRows=[];
  let metaLoading=false;

  function isWebItem(item){
    return item?.app===LEGACY_WEB_APP||item?.libraryKind==='web'||(item?.tags||[]).map(String).includes(WEB_KIND_TAG);
  }
  function isWebPackage(name){return all().some(x=>!x.demo&&x.app===name&&isWebItem(x))}
  function displayName(name){return typeof window.wobbinDisplayAppName==='function'?window.wobbinDisplayAppName(name):String(name||'')}
  function storageName(name){return typeof window.wobbinWebStorageName==='function'?window.wobbinWebStorageName(name):String(name||'')}

  async function loadMeta(force=false){
    if(metaLoading)return;
    if(metaRows.length&&!force)return;
    metaLoading=true;
    try{
      const res=await fetch(META_URL,{cache:'no-store'}),data=await res.json().catch(()=>({}));
      if(res.ok)metaRows=Array.isArray(data.apps)?data.apps:[];
    }catch(error){console.warn('Web avatar metadata load failed',error)}
    finally{metaLoading=false}
  }
  function metaByName(name){return metaRows.find(x=>x?.name===name)||null}

  function uploadRawName(){
    if((S.uploadKind||'app')!=='web')return'';
    if(S.uploadTarget==='existing')return String(S.uploadWebExisting||document.getElementById('up-web-existing')?.value||'').trim();
    const typed=String(document.getElementById('up-app')?.value||S.uploadMeta?.app||'').trim();
    return storageName(typed);
  }
  function avatarField(){
    if(!window.WOBBIN_PERMISSIONS?.admin)return'';
    const raw=uploadRawName(),name=displayName(raw)||'Web';
    return `<div class="field wide wobbin-upload-logo-field" data-web-avatar-field><span>产品头像 <em class="wobbin-field-hint">可选，选择后会直接设置 / 替换</em></span><div class="wobbin-upload-logo-row"><div class="wobbin-upload-logo-preview ${S.uploadLogoPreviewUrl?'has-image':''}" data-upload-logo-preview>${S.uploadLogoPreviewUrl?`<img src="${attr(S.uploadLogoPreviewUrl)}" alt="Web avatar preview">`:esc(name.slice(0,1).toUpperCase())}</div><div class="wobbin-upload-logo-actions"><button type="button" class="secondary" data-upload-logo-choose>${S.uploadLogoFile?'重新选择':'选择头像'}</button>${S.uploadLogoFile?'<button type="button" class="secondary" data-upload-logo-clear>清除</button>':''}<small>PNG / JPG / WebP，最大 5MB，建议使用正方形图片。</small></div><input hidden id="up-app-logo" type="file" accept="image/png,image/jpeg,image/webp"></div></div>`;
  }

  const baseUploadModal=uploadModal;
  uploadModal=function(){
    const html=baseUploadModal();
    if((S.uploadKind||'app')!=='web'||!window.WOBBIN_PERMISSIONS?.admin||html.includes('data-web-avatar-field'))return html;
    const marker='<label class="field"><span>平台</span>';
    return html.includes(marker)?html.replace(marker,avatarField()+marker):html;
  };

  async function waitLogoUploader(){
    for(let i=0;i<40&&typeof window.wobbinUploadAppLogo!=='function';i++)await new Promise(r=>setTimeout(r,100));
    return typeof window.wobbinUploadAppLogo==='function';
  }
  async function uploadAvatar(rawName,file){
    if(!file||!rawName)return false;
    await loadMeta(true);
    const row=metaByName(rawName);
    if(!row?.id)throw new Error('未找到 Web 文件包，产品头像暂未设置');
    if(!await waitLogoUploader())throw new Error('头像上传模块尚未加载，请刷新后重试');
    await window.wobbinUploadAppLogo(row.id,file);
    await loadMeta(true);
    return true;
  }
  function clearUploadAvatarDraft(){
    if(S.uploadLogoPreviewUrl){try{URL.revokeObjectURL(S.uploadLogoPreviewUrl)}catch{};S.uploadLogoPreviewUrl=''}
    S.uploadLogoFile=null;
  }

  const baseImportEntries=importEntries;
  importEntries=async function(){
    if((S.uploadKind||'app')!=='web')return baseImportEntries();
    const logoFile=S.uploadLogoFile||null;
    const rawName=uploadRawName();
    const result=await baseImportEntries();
    if(!logoFile||S.upload)return result;
    try{
      await uploadAvatar(rawName,logoFile);
      clearUploadAvatarDraft();
      hydrateWebAvatars();
      toast(`产品头像已设置 · ${displayName(rawName)}`);
    }catch(error){
      clearUploadAvatarDraft();
      toast(error instanceof Error?`Web 文件包已上传，但${error.message}`:'Web 文件包已上传，但产品头像设置失败');
    }
    return result;
  };

  function applyAvatar(el,row,fallback){
    if(!el)return;
    if(row?.logo_url){
      el.innerHTML=`<img src="${attr(row.logo_url)}" alt="${attr(displayName(row.name)||fallback||'Web')} avatar">`;
      el.classList.add('has-image');
    }else if(!el.querySelector('img')){
      el.textContent=String(fallback||'W').slice(0,1).toUpperCase();
      el.classList.remove('has-image');
    }
  }
  function hydrateWebAvatars(){
    document.querySelectorAll('.web-package-card').forEach(card=>{
      const raw=card.querySelector('[data-open-app]')?.dataset.openApp;if(!raw)return;
      applyAvatar(card.querySelector('.web-package-icon'),metaByName(raw),displayName(raw));
    });
    if(S.view==='app'&&S.app&&isWebPackage(S.app)){
      applyAvatar(document.querySelector('.wobbin-mobbin-detail .app-title>.app-icon'),metaByName(S.app),displayName(S.app));
      const modal=document.querySelector('[data-app-meta-editor]');
      if(modal){
        const title=modal.querySelector('.modal-head h2');if(title)title.textContent='编辑 Web 文件包信息';
        const label=modal.querySelector('.wobbin-meta-logo-field>span');if(label)label.textContent='产品头像';
      }
    }
  }
  function ensureStyles(){
    if(document.getElementById('wobbin-web-avatar-style'))return;
    const style=document.createElement('style');style.id='wobbin-web-avatar-style';style.textContent=`
      .web-package-icon.has-image{padding:0!important;overflow:hidden}.web-package-icon.has-image img{width:100%;height:100%;display:block;object-fit:cover}
    `;document.head.append(style);
  }
  function enhance(){ensureStyles();hydrateWebAvatars()}
  const baseRender=render;
  render=function(){baseRender();queueMicrotask(()=>queueMicrotask(enhance))};
  loadMeta().then(()=>enhance());
  enhance();
  render();
})();
