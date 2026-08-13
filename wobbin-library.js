'use strict';

(function bootWobbinLibrary(){
  if(window.__WOBBIN_LIBRARY_INSTALLED)return;
  if(
    typeof S==='undefined'||typeof home!=='function'||typeof apps!=='function'||
    typeof currentItems!=='function'||typeof uploadModal!=='function'||typeof bindUpload!=='function'||
    typeof makeItem!=='function'||typeof directUploadChunk!=='function'||
    typeof WOBBIN_PERMISSIONS==='undefined'||!window.WOBBIN_TAXONOMY||
    !window.__WOBBIN_UI_ELEMENTS_INSTALLED
  ){
    setTimeout(bootWobbinLibrary,80);
    return;
  }
  window.__WOBBIN_LIBRARY_INSTALLED=true;

  const SHOTS_APP='__Wobbin Shots';
  const WEB_APP='__Wobbin Web';
  const META_URL=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-app-meta';
  const LIBRARY_KEY='wobbin_library_mode_v1';
  const PRODUCT_TYPES=window.WOBBIN_TAXONOMY.appTypes||[];
  const DIRECT_BATCH=typeof WOBBIN_DIRECT_BATCH_SIZE==='number'?WOBBIN_DIRECT_BATCH_SIZE:20;
  const MEDIA_RE=/\.(png|jpe?g|webp|gif|mp4|webm|mov|m4v)$/i;

  if(!['apps','shots','web'].includes(S.libraryMode)){
    try{S.libraryMode=localStorage.getItem(LIBRARY_KEY)||'apps'}catch{S.libraryMode='apps'}
  }
  if(!['apps','shots','web'].includes(S.libraryMode))S.libraryMode='apps';
  if(!S.productType)S.productType='All';
  if(!S.uploadKind)S.uploadKind='app';
  if(!(S.uploadProductTypes instanceof Set))S.uploadProductTypes=new Set();
  if(!S.uploadMeta)S.uploadMeta={app:'',description:'',flow:'',platform:'iOS',category:'自动识别'};
  if(!['new','existing'].includes(S.uploadTarget))S.uploadTarget='new';
  if(typeof S.uploadExistingApp!=='string')S.uploadExistingApp='';
  if(typeof S.uploadLockedApp!=='string')S.uploadLockedApp='';
  if(typeof S.uploadFromDetail!=='boolean')S.uploadFromDetail=false;
  if(typeof S.uploadLogoFile==='undefined')S.uploadLogoFile=null;
  if(typeof S.uploadLogoPreviewUrl!=='string')S.uploadLogoPreviewUrl='';

  function kindForItem(item){
    if(item?.app===SHOTS_APP)return 'shots';
    if(item?.app===WEB_APP)return 'web';
    return 'apps';
  }
  function visibleInMode(item){return kindForItem(item)===S.libraryMode}
  function itemProductTypes(item){
    const direct=Array.isArray(item?.appTypes)?item.appTypes:[];
    const fromTags=(item?.tags||[]).map(String).filter(x=>x.startsWith('type:')).map(x=>x.slice(5)).filter(Boolean);
    return [...new Set([...direct,...fromTags])];
  }
  function passesProductType(item){return S.productType==='All'||itemProductTypes(item).includes(S.productType)}
  function modeItems(){
    return all().filter(x=>!x.demo&&visibleInMode(x)&&passesProductType(x)&&(S.platform==='All'||x.platform===S.platform)&&(S.element==='All'||(x.elements||[]).includes(S.element))&&matchesQuery(x,S.query));
  }
  function existingAppNames(){
    return [...new Set(all().filter(x=>!x.demo&&kindForItem(x)==='apps'&&x.app).map(x=>String(x.app)))].sort((a,b)=>a.localeCompare(b,'en'));
  }
  function firstAppItem(name){return all().find(x=>!x.demo&&x.app===name&&kindForItem(x)==='apps')||null}
  window.wobbinVisibleLibraryItems=function(){return all().filter(x=>!x.demo&&visibleInMode(x)&&passesProductType(x))};
  window.wobbinItemProductTypes=itemProductTypes;
  window.WOBBIN_LIBRARY_RESERVED={shots:SHOTS_APP,web:WEB_APP};

  const baseApps=apps;
  apps=function(){
    return baseApps().filter(a=>a.name!==SHOTS_APP&&a.name!==WEB_APP).filter(a=>S.productType==='All'||a.items.some(passesProductType));
  };

  const baseCurrentItems=currentItems;
  currentItems=function(){
    const list=baseCurrentItems();
    if(S.view==='home')return list.filter(x=>visibleInMode(x)&&passesProductType(x));
    return list;
  };

  const baseMakeItem=makeItem;
  makeItem=function(entry,d){
    const item=baseMakeItem(entry,d);
    const types=Array.isArray(d?.productTypes)?d.productTypes:[];
    item.tags=unique([...(item.tags||[]),...types.map(x=>'type:'+x)]);
    item.productTypes=types;
    item.libraryKind=d?.kind||kindForItem(item);
    item.mimeType=entry?.file?.type||item.mimeType||'';
    return item;
  };

  function mediaMime(name){
    const ext=String(name||'').split('.').pop()?.toLowerCase();
    if(ext==='png')return'image/png';if(ext==='jpg'||ext==='jpeg')return'image/jpeg';if(ext==='webp')return'image/webp';if(ext==='gif')return'image/gif';
    if(ext==='webm')return'video/webm';if(ext==='mov')return'video/quicktime';if(ext==='m4v')return'video/x-m4v';if(ext==='mp4')return'video/mp4';
    return'application/octet-stream';
  }
  function isSupportedMedia(name){return MEDIA_RE.test(String(name||''))}

  readFiles=async function(fileList,mode){
    const files=[...fileList];if(!files.length)return[];
    const zips=files.filter(f=>/\.zip$/i.test(f.name));
    if((mode==='zip'||mode==='auto')&&zips.length){
      await ensureJSZip();const out=[];
      for(const f of zips){
        const z=await JSZip.loadAsync(f);
        for(const [path,e] of Object.entries(z.files)){
          if(e.dir||!isSupportedMedia(path)||path.includes('__MACOSX'))continue;
          const blob=await e.async('blob');const name=path.split('/').pop()||'media';
          out.push({file:new File([blob],name,{type:mediaMime(name)}),path:normalizePath(path)});
        }
      }
      return stripRoot(out);
    }
    return stripRoot(files.filter(f=>isSupportedMedia(f.name)).map(f=>({file:f,path:normalizePath(f.webkitRelativePath||f.name)})));
  };
  setFiles=async function(files,mode){
    try{S.entries=await readFiles(files,mode);render();toast(S.entries.length?`识别到 ${S.entries.length} 个图片 / 视频素材`:'没有识别到支持的图片或视频')}catch(e){toast(e.message||'读取失败')}
  };

  function looseHome(kind){
    const list=modeItems();
    const isWeb=kind==='web';
    const title=isWeb?'Web':'Shots';
    const description=isWeb?'网页设计与 Web 产品参考，按单张页面直接浏览。':'独立收藏的设计案例与单页灵感，不需要归属某个 App 文件包。';
    return `${header()}<main class="main"><div class="subnav"><div class="subnav-left"><span class="page-label"><strong>${title}</strong> · ${isWeb?'网页参考':'灵感截图案例'}</span></div></div>${quickElements()}<div class="section-head"><div><h1>${title}</h1><p>${description}</p></div><span class="section-count">${list.length} ${isWeb?'pages':'shots'}</span></div>${list.length?screenView(list):`<div class="empty"><strong>这里还没有${isWeb?'网页参考':'独立案例'}</strong>点击右上角“导入”，选择 ${title} 类型即可单独上传。</div>`}</main>${suggestions()}`;
  }

  const baseHome=home;
  home=function(){
    if(S.libraryMode==='apps')return baseHome();
    return looseHome(S.libraryMode);
  };

  function uploadTypeTabs(){
    if(S.uploadLockedApp)return `<div class="wobbin-upload-context"><span>继续上传到</span><strong>${esc(S.uploadLockedApp)}</strong></div>`;
    const tabs=[['app','Apps','产品文件包'],['shot','Shots','独立案例'],['web','Web','网页参考']];
    return `<div class="wobbin-upload-kind">${tabs.map(([key,label,sub])=>`<button type="button" class="${S.uploadKind===key?'active':''}" data-upload-kind="${key}"><strong>${label}</strong><span>${sub}</span></button>`).join('')}</div>`;
  }
  function productTypePicker(){
    return `<div class="field wide"><span>产品类型 <em class="wobbin-field-hint">可多选</em></span><div class="wobbin-product-types">${PRODUCT_TYPES.map(type=>`<button type="button" data-upload-product-type="${attr(type)}" class="${S.uploadProductTypes.has(type)?'active':''}">${esc(type)}</button>`).join('')}</div></div>`;
  }
  function targetPicker(){
    if(S.uploadLockedApp)return '';
    const names=existingAppNames();
    const existingDisabled=!names.length;
    return `<div class="field wide"><span>文件包归属</span><div class="wobbin-upload-target"><button type="button" data-upload-target="new" class="${S.uploadTarget==='new'?'active':''}">新建文件包</button><button type="button" data-upload-target="existing" class="${S.uploadTarget==='existing'?'active':''}" ${existingDisabled?'disabled':''}>添加到已有文件包</button></div></div>`;
  }
  function logoField(){
    if(!WOBBIN_PERMISSIONS.admin)return '';
    const name=resolvedUploadApp()||'App';
    return `<div class="field wide wobbin-upload-logo-field"><span>App Logo <em class="wobbin-field-hint">可选，选择后会直接设置 / 替换</em></span><div class="wobbin-upload-logo-row"><div class="wobbin-upload-logo-preview ${S.uploadLogoPreviewUrl?'has-image':''}" data-upload-logo-preview>${S.uploadLogoPreviewUrl?`<img src="${attr(S.uploadLogoPreviewUrl)}" alt="App Logo preview">`:esc(name.slice(0,1).toUpperCase())}</div><div class="wobbin-upload-logo-actions"><button type="button" class="secondary" data-upload-logo-choose>${S.uploadLogoFile?'重新选择':'选择 Logo'}</button>${S.uploadLogoFile?'<button type="button" class="secondary" data-upload-logo-clear>清除</button>':''}<small>PNG / JPG / WebP，最大 5MB，建议使用正方形图片。</small></div><input hidden id="up-app-logo" type="file" accept="image/png,image/jpeg,image/webp"></div></div>`;
  }
  function resolvedUploadApp(){
    if(S.uploadLockedApp)return S.uploadLockedApp;
    if(S.uploadTarget==='existing')return S.uploadExistingApp||existingAppNames()[0]||'';
    return String(S.uploadMeta?.app||'').trim();
  }
  function appFields(){
    const m=S.uploadMeta,admin=WOBBIN_PERMISSIONS.admin,names=existingAppNames();
    if(S.uploadTarget==='existing'&&!S.uploadExistingApp&&names.length)S.uploadExistingApp=names[0];
    const existing=Boolean(S.uploadLockedApp||S.uploadTarget==='existing');
    const selected=resolvedUploadApp();
    const appIdentity=S.uploadLockedApp?`<div class="field wide wobbin-current-app"><span>当前文件包</span><strong>${esc(S.uploadLockedApp)}</strong></div>`:existing?`<label class="field wide"><span>已有文件包</span><select id="up-existing-app">${names.map(name=>`<option value="${attr(name)}" ${name===selected?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`:`<label class="field"><span>文件包名称</span><input id="up-app" value="${attr(m.app||'')}" placeholder="例如 Airbnb" required></label>`;
    return `${targetPicker()}${appIdentity}${logoField()}
      <label class="field"><span>平台</span><select id="up-platform"><option ${m.platform==='iOS'?'selected':''}>iOS</option><option ${m.platform==='Android'?'selected':''}>Android</option><option ${m.platform==='Web'?'selected':''}>Web</option></select></label>
      ${admin&&!existing?`<label class="field wide"><span>文件包描述</span><textarea id="up-description" rows="3" maxlength="800" placeholder="简单说明产品定位、核心场景等">${esc(m.description||'')}</textarea></label>`:''}
      <label class="field"><span>默认 Flow</span><input id="up-flow" value="${attr(m.flow||'')}" placeholder="例如 Booking / Search"></label>
      <label class="field"><span>页面类型</span><select id="up-category"><option ${m.category==='自动识别'?'selected':''}>自动识别</option>${Object.keys(CATEGORY_KEYS).map(x=>`<option ${m.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`;
  }
  function looseFields(kind){
    const m=S.uploadMeta;
    const web=kind==='web';
    return `<label class="field"><span>来源平台</span><select id="up-platform" ${web?'disabled':''}>${web?'<option selected>Web</option>':`<option ${m.platform==='iOS'?'selected':''}>iOS</option><option ${m.platform==='Android'?'selected':''}>Android</option><option ${m.platform==='Web'?'selected':''}>Web</option>`}</select></label>
      <label class="field"><span>页面类型</span><select id="up-category"><option ${m.category==='自动识别'?'selected':''}>自动识别</option>${Object.keys(CATEGORY_KEYS).map(x=>`<option ${m.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      <div class="field wide wobbin-loose-note"><span>${web?'网页素材会直接进入 Web，不会生成文件包。':'每个图片 / 视频都会作为独立 Shot 保存，不需要填写 App 名称或 Flow。'}</span></div>`;
  }

  uploadModal=function(){
    const kind=S.uploadKind||'app';
    const title=S.uploadLockedApp?`继续上传到 ${esc(S.uploadLockedApp)}`:'导入设计参考';
    const mediaHint=kind==='app'?'支持图片与视频，建议目录：App / Flow / media':'支持一次选择多张图片或视频';
    return `<div class="backdrop" id="upload-bg"><section class="modal wobbin-upload-modal"><header class="modal-head"><div><small>IMPORT REFERENCES</small><h2>${title}</h2></div><button class="modal-close" id="upload-close">×</button></header>${uploadTypeTabs()}<div class="upload-tabs">${[['folder','整个文件夹'],['images','图片 / 视频'],['zip','ZIP 压缩包']].map(([k,l])=>`<button data-upload-mode="${k}" class="${S.uploadMode===k?'active':''}">${l}</button>`).join('')}</div><button class="dropzone" id="drop"><strong>${S.uploadMode==='folder'?'选择整个文件夹':S.uploadMode==='zip'?'选择 ZIP 压缩包':'选择图片或视频'}</strong><span>${mediaHint}</span><input id="folder-input" type="file" webkitdirectory directory multiple accept="image/*,video/*"><input id="image-input" type="file" multiple accept="image/*,video/*"><input id="zip-input" type="file" accept=".zip,application/zip"></button><div class="package-summary ${S.entries.length?'':'hidden'}" id="package-summary">${S.entries.length?`已识别 ${S.entries.length} 个素材<br>${S.entries.slice(0,5).map(x=>esc(x.path)).join('<br>')}`:''}</div><div class="form-grid">${kind==='app'?appFields():looseFields(kind)}${productTypePicker()}<div class="field wide"><span>补充 UI 元素标签</span><div class="manual-elements">${ELEMENTS.map(([k,l])=>`<button type="button" data-manual="${k}" class="${S.manual.has(k)?'active':''}">${l}</button>`).join('')}</div></div></div><footer class="modal-foot"><button id="upload-cancel" class="secondary">取消</button><button id="upload-submit" class="primary">开始导入</button></footer></section></div>`;
  };

  function saveUploadMeta(){
    const app=document.getElementById('up-app'),existing=document.getElementById('up-existing-app'),desc=document.getElementById('up-description'),flow=document.getElementById('up-flow'),platform=document.getElementById('up-platform'),category=document.getElementById('up-category');
    if(app)S.uploadMeta.app=app.value;
    if(existing)S.uploadExistingApp=existing.value;
    if(desc)S.uploadMeta.description=desc.value;
    if(flow)S.uploadMeta.flow=flow.value;
    if(platform)S.uploadMeta.platform=platform.value;
    if(category)S.uploadMeta.category=category.value;
  }
  function cleanupUploadLogoPreview(){
    if(S.uploadLogoPreviewUrl){try{URL.revokeObjectURL(S.uploadLogoPreviewUrl)}catch{};S.uploadLogoPreviewUrl=''}
  }
  function setUploadLogoFile(file){
    if(file){
      if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('App Logo 仅支持 PNG、JPG、WebP');
      if(file.size>5*1024*1024)throw new Error('App Logo 不能超过 5MB');
    }
    cleanupUploadLogoPreview();S.uploadLogoFile=file||null;
    if(file)S.uploadLogoPreviewUrl=URL.createObjectURL(file);
  }
  function resetUploadDraft(){
    cleanupUploadLogoPreview();
    S.uploadMeta={app:'',description:'',flow:'',platform:'iOS',category:'自动识别'};
    S.uploadProductTypes=new Set();S.manual=new Set();S.uploadTarget='new';S.uploadExistingApp='';S.uploadLockedApp='';S.uploadFromDetail=false;S.uploadLogoFile=null;
  }
  function selectExistingApp(name){
    S.uploadExistingApp=name;
    const first=firstAppItem(name);if(first?.platform)S.uploadMeta.platform=first.platform;
  }

  bindUpload=function(){
    document.querySelectorAll('[data-upload-kind]').forEach(b=>b.onclick=()=>{saveUploadMeta();S.uploadKind=b.dataset.uploadKind;if(S.uploadKind==='web')S.uploadMeta.platform='Web';else if(S.uploadMeta.platform==='Web'&&S.uploadKind==='shot')S.uploadMeta.platform='iOS';render()});
    document.querySelectorAll('[data-upload-target]').forEach(b=>b.onclick=()=>{saveUploadMeta();S.uploadTarget=b.dataset.uploadTarget;if(S.uploadTarget==='existing'&&!S.uploadExistingApp){const first=existingAppNames()[0];if(first)selectExistingApp(first)}render()});
    document.getElementById('up-existing-app')?.addEventListener('change',e=>{selectExistingApp(e.target.value);render()});
    document.querySelectorAll('[data-upload-mode]').forEach(b=>b.onclick=()=>{saveUploadMeta();S.uploadMode=b.dataset.uploadMode;S.entries=[];render()});
    document.querySelectorAll('[data-upload-product-type]').forEach(b=>b.onclick=()=>{const type=b.dataset.uploadProductType;S.uploadProductTypes.has(type)?S.uploadProductTypes.delete(type):S.uploadProductTypes.add(type);b.classList.toggle('active',S.uploadProductTypes.has(type))});
    document.querySelectorAll('[data-manual]').forEach(b=>b.onclick=()=>{const k=b.dataset.manual;S.manual.has(k)?S.manual.delete(k):S.manual.add(k);b.classList.toggle('active',S.manual.has(k))});
    document.querySelectorAll('#up-app,#up-description,#up-flow,#up-platform,#up-category').forEach(el=>{el.addEventListener('input',saveUploadMeta);el.addEventListener('change',saveUploadMeta)});
    const logoInput=document.getElementById('up-app-logo');
    document.querySelector('[data-upload-logo-choose]')?.addEventListener('click',()=>logoInput?.click());
    logoInput?.addEventListener('change',()=>{const file=logoInput.files?.[0];if(!file)return;try{setUploadLogoFile(file);render()}catch(error){logoInput.value='';toast(error.message||'Logo 读取失败')}});
    document.querySelector('[data-upload-logo-clear]')?.addEventListener('click',()=>{setUploadLogoFile(null);render()});
    const folder=document.getElementById('folder-input'),images=document.getElementById('image-input'),zip=document.getElementById('zip-input'),drop=document.getElementById('drop');
    drop.onclick=()=>({folder,images,zip}[S.uploadMode]||folder).click();
    folder.onchange=e=>setFiles(e.target.files,'folder');images.onchange=e=>setFiles(e.target.files,'images');zip.onchange=e=>setFiles(e.target.files,'zip');
    drop.ondragover=e=>e.preventDefault();drop.ondrop=e=>{e.preventDefault();setFiles(e.dataTransfer.files,'auto')};
    const close=()=>{S.upload=false;S.entries=[];resetUploadDraft();render()};
    document.getElementById('upload-close').onclick=close;document.getElementById('upload-cancel').onclick=close;document.getElementById('upload-bg').onmousedown=e=>{if(e.target.id==='upload-bg')close()};
    document.getElementById('upload-submit').onclick=importEntries;
  };

  async function updateAppMetaAfterUpload(name,description,types){
    if(!WOBBIN_PERMISSIONS.admin)return;
    try{
      const lookup=await fetch(META_URL,{cache:'no-store'});const meta=await lookup.json();
      const app=(meta.apps||[]).find(x=>x.name===name);if(!app)return;
      const key=localStorage.getItem(WOBBIN_ADMIN_KEY_STORE)||'';if(!key)return;
      const res=await fetch(META_URL,{method:'POST',headers:{'Content-Type':'application/json','x-wobbin-key':key},body:JSON.stringify({action:'update-app',app_id:app.id,name,description,app_types:types})});
      if(!res.ok){const data=await res.json().catch(()=>({}));throw new Error(data.error||'文件包信息保存失败')}
    }catch(error){console.warn(error);toast('素材已上传，但文件包描述或类型保存失败')}
  }
  async function appIdByName(name){
    try{const res=await fetch(META_URL,{cache:'no-store'}),data=await res.json();return (data.apps||[]).find(x=>x.name===name)?.id||''}catch{return''}
  }
  async function uploadLogoAfterImport(appId,appName,file){
    if(!file)return;
    let id=appId||await appIdByName(appName);if(!id)throw new Error('素材已上传，但未找到文件包，Logo 暂未设置');
    for(let i=0;i<30&&typeof window.wobbinUploadAppLogo!=='function';i++)await new Promise(r=>setTimeout(r,100));
    if(typeof window.wobbinUploadAppLogo!=='function')throw new Error('素材已上传，但 Logo 上传模块尚未加载');
    await window.wobbinUploadAppLogo(id,file);
  }

  importEntries=async function(){
    if(!S.entries.length)return toast('请先选择图片或视频');
    saveUploadMeta();
    const kind=S.uploadKind||'app',types=[...S.uploadProductTypes],fromDetail=S.uploadFromDetail;
    const existingTarget=kind==='app'&&Boolean(S.uploadLockedApp||S.uploadTarget==='existing');
    const appName=kind==='app'?resolvedUploadApp():(kind==='web'?WEB_APP:SHOTS_APP);
    if(kind==='app'&&!appName)return toast(existingTarget?'请选择已有文件包':'请填写文件包名称');
    if(kind==='app'&&!existingTarget&&existingAppNames().includes(appName))return toast('这个 App 已存在，请选择“添加到已有文件包”');
    const btn=document.getElementById('upload-submit');if(!btn)return;
    btn.disabled=true;const originalText=btn.textContent||'开始导入';
    const d={kind,productTypes:types,app:appName,flow:kind==='app'?(String(S.uploadMeta.flow||'').trim()||'Imported screens'):(kind==='web'?'Web references':'Shots'),platform:kind==='web'?'Web':(S.uploadMeta.platform||'iOS'),category:S.uploadMeta.category||'自动识别'};
    const entries=[...S.entries],logoFile=S.uploadLogoFile;
    const progressState={total:entries.length,done:0,totalBytes:entries.reduce((n,e)=>n+(e.file?.size||0),0),loaded:Array(entries.length).fill(0)};
    try{
      const mode=await validateAdmin();
      if(mode.storage!=='aliyun-oss'||mode.direct_upload!==true)throw new Error('当前仅支持 OSS 直传，请稍后重试');
      const added=[];let appId='';showDirectProgress(0,entries.length,0,progressState.totalBytes);
      for(let start=0;start<entries.length;start+=DIRECT_BATCH){
        const chunk=entries.slice(start,start+DIRECT_BATCH);btn.textContent=`直传 OSS ${Math.min(start+1,entries.length)}/${entries.length}`;
        const result=await directUploadChunk(chunk,d,start,progressState);
        const items=Array.isArray(result)?result:(result?.items||[]);if(!appId&&!Array.isArray(result))appId=result?.app_id||'';
        items.forEach(x=>{x.libraryKind=kindForItem(x);x.productTypes=types;x.appTypes=kind==='app'?types:[];const src=entries.find(e=>String(e.path||'').endsWith(String(x.sourcePath||'')));if(src?.file?.type)x.mimeType=src.file.type});added.push(...items);
        btn.textContent=`直传 OSS ${progressState.done}/${entries.length}`;
      }
      if(kind==='app'&&!existingTarget)await updateAppMetaAfterUpload(d.app,S.uploadMeta.description||'',types);
      if(kind==='app'&&logoFile){btn.textContent='正在设置 App Logo…';await uploadLogoAfterImport(appId,d.app,logoFile)}
      S.items=[...added,...S.items];S.upload=false;S.entries=[];S.libraryMode=kind==='app'?'apps':kind;S.productType='All';S.element='All';S.query='';
      if(fromDetail&&kind==='app'){S.view='app';S.app=d.app;S.tab='screens'}else{S.view='home';S.app=null}
      try{localStorage.setItem(LIBRARY_KEY,S.libraryMode)}catch{}
      resetUploadDraft();
      await loadCloudLibrary({quiet:true});
      if(typeof loadWobbinLabels==='function')await loadWobbinLabels().catch(()=>{});
      hideDirectProgress();render();
      if(fromDetail)window.scrollTo({top:0,behavior:'smooth'});
      toast(`已上传 ${added.length} 个素材${kind==='app'?`到 ${d.app}`:`到 ${S.libraryMode==='shots'?'Shots':'Web'}`}${logoFile?' · Logo 已设置':''}`);
    }catch(error){hideDirectProgress();btn.disabled=false;btn.textContent=originalText;await loadCloudLibrary({quiet:true}).catch(()=>{});toast(error instanceof Error?error.message:'上传失败')}
  };

  function openAppUpload(name){
    if(!name)return;
    const first=firstAppItem(name);
    cleanupUploadLogoPreview();
    S.upload=true;S.entries=[];S.uploadKind='app';S.uploadMode='images';S.uploadTarget='existing';S.uploadExistingApp=name;S.uploadLockedApp=name;S.uploadFromDetail=true;S.uploadLogoFile=null;
    S.uploadMeta={app:name,description:'',flow:'',platform:first?.platform||'iOS',category:'自动识别'};S.uploadProductTypes=new Set();S.manual=new Set();render();
  }
  window.wobbinOpenAppUpload=openAppUpload;

  function decorateDetailUpload(){
    if(S.view!=='app'||!S.app)return;
    const head=document.querySelector('.app-head');if(!head)return;
    let group=head.querySelector('.app-head-actions');if(!group){group=document.createElement('div');group.className='app-head-actions';head.append(group)}
    if(group.querySelector('[data-continue-upload]'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='detail-action-btn wobbin-continue-upload';btn.dataset.continueUpload='1';btn.textContent='继续上传';btn.addEventListener('click',()=>openAppUpload(S.app));group.prepend(btn);
  }
  function updateBackToTop(){
    const btn=document.querySelector('[data-wobbin-back-top]');if(!btn)return;
    btn.classList.toggle('show',S.view==='app'&&!S.upload&&window.scrollY>640);
  }
  function ensureBackToTop(){
    let btn=document.querySelector('[data-wobbin-back-top]');
    if(S.view!=='app'){btn?.remove();return}
    if(!btn){btn=document.createElement('button');btn.type='button';btn.className='wobbin-back-top';btn.dataset.wobbinBackTop='1';btn.setAttribute('aria-label','回到顶部');btn.title='回到顶部';btn.innerHTML='<span>↑</span><em>顶部</em>';btn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));document.body.append(btn)}
    updateBackToTop();
  }
  if(!window.__WOBBIN_BACK_TOP_SCROLL_BOUND){window.__WOBBIN_BACK_TOP_SCROLL_BOUND=true;window.addEventListener('scroll',updateBackToTop,{passive:true})}

  function ensureStyles(){
    if(document.getElementById('wobbin-library-style'))return;
    const style=document.createElement('style');style.id='wobbin-library-style';style.textContent=`
      .wobbin-upload-modal{width:min(760px,calc(100vw - 32px));max-height:min(900px,calc(100vh - 32px));overflow:auto}
      .wobbin-upload-kind{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 24px 16px}
      .wobbin-upload-kind button{min-height:58px;border:1px solid var(--line,#383838);border-radius:14px;background:transparent;color:var(--text,#fff);display:grid;gap:3px;align-content:center;text-align:left;padding:10px 13px;cursor:pointer}
      .wobbin-upload-kind button.active{border-color:var(--text,#fff);background:rgba(127,127,127,.14)}
      .wobbin-upload-kind strong{font-size:14px}.wobbin-upload-kind span{font-size:10px;color:var(--muted,#999)}
      .wobbin-upload-context{margin:0 24px 16px;padding:12px 14px;border-radius:12px;background:rgba(127,127,127,.09);display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted,#999)}.wobbin-upload-context strong{color:var(--text,#fff);font-size:13px}
      .wobbin-upload-target{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.wobbin-upload-target button{height:38px;border:1px solid var(--line,#383838);border-radius:10px;background:transparent;color:var(--muted,#aaa);cursor:pointer}.wobbin-upload-target button.active{background:var(--text,#fff);border-color:var(--text,#fff);color:var(--bg,#111)}.wobbin-upload-target button:disabled{opacity:.35;cursor:not-allowed}
      .wobbin-current-app{padding:11px 13px;border-radius:12px;background:rgba(127,127,127,.08)}.wobbin-current-app strong{display:block;margin-top:5px;font-size:14px;color:var(--text,#fff)}
      .wobbin-product-types{display:flex;flex-wrap:wrap;gap:7px}
      .wobbin-product-types button{height:30px;padding:0 10px;border:1px solid var(--line,#383838);border-radius:999px;background:transparent;color:var(--muted,#aaa);font-size:11px;cursor:pointer}
      .wobbin-product-types button.active{background:var(--text,#fff);border-color:var(--text,#fff);color:var(--bg,#111)}
      .wobbin-field-hint{font-size:10px;font-style:normal;font-weight:500;color:var(--muted,#888);margin-left:5px}
      .wobbin-loose-note{padding:11px 13px;border-radius:12px;background:rgba(127,127,127,.08);color:var(--muted,#999);line-height:1.5}
      .form-grid textarea{width:100%;border:1px solid var(--line,#343434);background:var(--panel2,#222);color:var(--text,#f5f5f5);border-radius:10px;outline:none;padding:10px 12px;font:inherit;resize:vertical}
      .wobbin-upload-logo-row{display:flex;align-items:center;gap:13px;margin-top:8px}.wobbin-upload-logo-preview{width:62px;height:62px;flex:0 0 62px;border-radius:15px;border:1px solid var(--line,#383838);background:var(--panel2,#222);display:grid;place-items:center;font-size:20px;font-weight:750;overflow:hidden}.wobbin-upload-logo-preview img{width:100%;height:100%;object-fit:cover;display:block}.wobbin-upload-logo-actions{display:flex;align-items:center;flex-wrap:wrap;gap:7px}.wobbin-upload-logo-actions button{height:32px;padding:0 10px}.wobbin-upload-logo-actions small{width:100%;font-size:10px;color:var(--muted,#888);line-height:1.4}
      .wobbin-back-top{position:fixed;right:24px;bottom:24px;z-index:80;height:40px;padding:0 13px;border:1px solid var(--line,#383838);border-radius:999px;background:rgba(24,24,24,.92);color:var(--text,#fff);display:flex;align-items:center;gap:7px;box-shadow:0 10px 28px rgba(0,0,0,.22);backdrop-filter:blur(12px);opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .16s ease,transform .16s ease;cursor:pointer}.wobbin-back-top.show{opacity:1;transform:translateY(0);pointer-events:auto}.wobbin-back-top span{font-size:16px;line-height:1}.wobbin-back-top em{font-size:11px;font-style:normal;font-weight:650}
      @media(max-width:640px){.wobbin-upload-kind{grid-template-columns:1fr}.wobbin-upload-kind button{min-height:50px}.wobbin-upload-target{grid-template-columns:1fr}.wobbin-back-top{right:14px;bottom:14px}.wobbin-back-top em{display:none}.wobbin-back-top{width:40px;padding:0;justify-content:center}}
    `;document.head.append(style);
  }

  function enhanceLibrary(){ensureStyles();decorateDetailUpload();ensureBackToTop()}
  const baseRender=render;
  render=function(){baseRender();queueMicrotask(()=>queueMicrotask(enhanceLibrary))};
  enhanceLibrary();
  render();
})();
