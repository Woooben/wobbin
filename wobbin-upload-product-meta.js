'use strict';

(function bootWobbinUploadProductMeta(){
  if(window.__WOBBIN_UPLOAD_PRODUCT_META_INSTALLED)return;
  if(
    !window.__WOBBIN_LIBRARY_INSTALLED||!window.__WOBBIN_WEB_PACKAGES_INSTALLED||
    !window.__WOBBIN_WEB_PRODUCT_SCOPE_INSTALLED||!window.__WOBBIN_WEB_AVATAR_INSTALLED||
    typeof uploadModal!=='function'||typeof importEntries!=='function'||typeof render!=='function'||
    typeof S==='undefined'||typeof WOBBIN_SUPABASE_URL==='undefined'
  ){
    setTimeout(bootWobbinUploadProductMeta,80);
    return;
  }
  window.__WOBBIN_UPLOAD_PRODUCT_META_INSTALLED=true;

  const META_URL=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-app-meta';

  function currentKind(){return S.uploadKind||'app'}
  function isProductUpload(){return ['app','web'].includes(currentKind())}
  function displayName(name){
    return typeof window.wobbinDisplayAppName==='function'?window.wobbinDisplayAppName(name):String(name||'');
  }
  function webStorageName(name){
    return typeof window.wobbinWebStorageName==='function'?window.wobbinWebStorageName(name):String(name||'');
  }
  function uploadPackageName(){
    const kind=currentKind();
    if(kind==='app'){
      if(S.uploadLockedApp)return String(S.uploadLockedApp);
      if(S.uploadTarget==='existing')return String(S.uploadExistingApp||document.getElementById('up-existing-app')?.value||'').trim();
      return String(document.getElementById('up-app')?.value||S.uploadMeta?.app||'').trim();
    }
    if(kind==='web'){
      if(S.uploadTarget==='existing')return String(S.uploadWebExisting||document.getElementById('up-web-existing')?.value||'').trim();
      const typed=String(document.getElementById('up-app')?.value||S.uploadMeta?.app||'').trim();
      return webStorageName(typed);
    }
    return'';
  }
  function uploadDisplayName(){return displayName(uploadPackageName())||'产品'}
  function avatarField(){
    const name=uploadDisplayName();
    return `<div class="field wide wobbin-upload-logo-field" data-restored-product-avatar><span>产品头像 <em class="wobbin-field-hint">可选，可在上传时直接设置 / 替换</em></span><div class="wobbin-upload-logo-row"><div class="wobbin-upload-logo-preview ${S.uploadLogoPreviewUrl?'has-image':''}" data-upload-logo-preview>${S.uploadLogoPreviewUrl?`<img src="${attr(S.uploadLogoPreviewUrl)}" alt="产品头像预览">`:esc(name.slice(0,1).toUpperCase())}</div><div class="wobbin-upload-logo-actions"><button type="button" class="secondary" data-upload-logo-choose>${S.uploadLogoFile?'重新选择':'选择头像'}</button>${S.uploadLogoFile?'<button type="button" class="secondary" data-upload-logo-clear>清除</button>':''}<small>PNG / JPG / WebP，最大 5MB，建议使用正方形图片。</small></div><input hidden id="up-app-logo" type="file" accept="image/png,image/jpeg,image/webp"></div></div>`;
  }
  function descriptionField(){
    const web=currentKind()==='web';
    const placeholder=web?'简单说明网站定位、核心页面或设计特点':'简单说明产品定位、核心场景等';
    return `<label class="field wide" data-restored-product-description><span>文件包描述</span><textarea id="up-description" rows="3" maxlength="800" placeholder="${placeholder}">${esc(S.uploadMeta?.description||'')}</textarea></label>`;
  }

  const baseUploadModal=uploadModal;
  uploadModal=function(){
    let html=baseUploadModal();
    if(!isProductUpload())return html;

    html=html.replace('<span>App Logo <em','<span>产品头像 <em');
    if(!html.includes('id="up-app-logo"')){
      const marker='<label class="field"><span>平台</span>';
      if(html.includes(marker))html=html.replace(marker,avatarField()+marker);
    }
    if(!html.includes('id="up-description"')){
      const flowMarker=currentKind()==='web'?'<label class="field"><span>默认 Flow / 页面分组</span>':'<label class="field"><span>默认 Flow</span>';
      if(html.includes(flowMarker))html=html.replace(flowMarker,descriptionField()+flowMarker);
    }
    return html;
  };

  async function ensureMetaPermission(){
    await adminFetch({action:'ping'});
    WOBBIN_PERMISSIONS.admin=true;
  }
  async function savePackageMeta(name,description,types,{preserveBlank=true}={}){
    if(!name)return;
    const lookup=await fetch(META_URL,{cache:'no-store'}),data=await lookup.json().catch(()=>({}));
    if(!lookup.ok)throw new Error(data.error||'文件包信息读取失败');
    const app=(data.apps||[]).find(x=>x.name===name);
    if(!app)return;
    let key='';try{key=localStorage.getItem(WOBBIN_ADMIN_KEY_STORE)||''}catch{}
    if(!key)key=await askAdminKey(false);
    const nextDescription=preserveBlank&&!String(description||'').trim()?String(app.description||''):String(description||'').trim();
    const nextTypes=types.length?types:(Array.isArray(app.app_types)?app.app_types:[]);
    const res=await fetch(META_URL,{method:'POST',headers:{'Content-Type':'application/json','x-wobbin-key':key},body:JSON.stringify({action:'update-app',app_id:app.id,name,description:nextDescription,app_types:nextTypes})});
    const out=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(out.error||'文件包信息保存失败');
    try{localStorage.setItem(WOBBIN_ADMIN_KEY_STORE,key)}catch{}
    WOBBIN_PERMISSIONS.admin=true;
  }

  const baseImportEntries=importEntries;
  importEntries=async function(){
    if(!isProductUpload())return baseImportEntries();

    const kind=currentKind();
    const wasExisting=Boolean(kind==='app'?(S.uploadLockedApp||S.uploadTarget==='existing'):S.uploadTarget==='existing');
    const rawName=uploadPackageName();
    const description=String(document.getElementById('up-description')?.value||S.uploadMeta?.description||'').trim();
    const types=[...(S.uploadProductTypes||[])];
    const hasAvatar=Boolean(S.uploadLogoFile);
    const needsProductMeta=Boolean(description||hasAvatar);

    if(needsProductMeta){
      try{await ensureMetaPermission()}
      catch(error){toast(error instanceof Error?`${error.message}，未开始上传`:'需要管理员口令才能保存产品头像或描述');return}
    }

    const result=await baseImportEntries();
    if(S.upload)return result;

    if((wasExisting&&description)||(!wasExisting&&description&&!WOBBIN_PERMISSIONS.admin)){
      try{await savePackageMeta(rawName,description,types)}
      catch(error){console.warn(error);toast('素材已上传，但文件包描述保存失败')}
    }
    return result;
  };

  const baseRender=render;
  render=function(){baseRender()};
  render();
})();
