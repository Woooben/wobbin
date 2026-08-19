'use strict';

(function bootWobbinPackageMeta(){
  if(window.__WOBBIN_PACKAGE_META_INSTALLED)return;
  if(typeof render!=='function'||typeof S==='undefined'||typeof WOBBIN_PERMISSIONS==='undefined'||typeof WOBBIN_SUPABASE_URL==='undefined'){
    setTimeout(bootWobbinPackageMeta,80);return;
  }
  window.__WOBBIN_PACKAGE_META_INSTALLED=true;

  const META_URL=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-app-meta';
  const META={loaded:false,loading:false,apps:new Map()};
  const PRODUCT_TYPES=window.WOBBIN_TAXONOMY?.appTypes||['Social','Messaging','Travel','Booking','Marketplace','E-commerce','Finance','Productivity','Utilities','Health','Fitness','Food','Delivery','Mobility','Navigation','Education','Entertainment','Music','Video','Photo','News','Lifestyle','Shopping','Business','AI'];
  const CUSTOM_TYPES_KEY='wobbin_custom_product_types_v1';
  let editingId='',editingTypes=new Set(),editingLogoFile=null,editingRemoveLogo=false,editingLogoPreviewUrl='';

  function currentMeta(){if(S.view!=='app'||!S.app)return null;return [...META.apps.values()].find(x=>x.name===S.app)||null}
  function metaByName(name){return [...META.apps.values()].find(x=>x.name===name)||null}
  async function loadMeta({force=false}={}){
    if(META.loading||(!force&&META.loaded))return;META.loading=true;
    try{const res=await fetch(META_URL,{cache:'no-store'}),data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||`文件包信息读取失败（${res.status}）`);META.apps=new Map((data.apps||[]).map(x=>[x.id,x]));META.loaded=true}catch(error){console.error(error)}finally{META.loading=false}
  }
  function removeDetailShortcut(){if(S.view!=='home')document.querySelectorAll('[data-wobbin-shortcut-nav],.wobbin-shortcut-nav').forEach(el=>el.remove())}
  function iconMarkup(meta,fallback='A'){return meta?.logo_url?`<img src="${attr(meta.logo_url)}" alt="${attr(meta.name||'App')} icon">`:esc(String(fallback||'A').slice(0,1).toUpperCase())}
  function applyIcon(el,meta,fallback){if(!el)return;el.innerHTML=iconMarkup(meta,fallback);el.classList.toggle('has-image',Boolean(meta?.logo_url))}

  function cleanProductType(value){return String(value||'').trim().replace(/\s+/g,' ').slice(0,40)}
  function sameProductType(a,b){return cleanProductType(a).toLocaleLowerCase()===cleanProductType(b).toLocaleLowerCase()}
  function parseProductTypes(value){
    const out=[];
    for(const raw of String(value||'').split(/[、,，;；\n]+/)){
      const type=cleanProductType(raw);if(!type||out.some(x=>sameProductType(x,type)))continue;out.push(type);
    }
    return out;
  }
  function readCustomProductTypes(){
    try{const raw=JSON.parse(localStorage.getItem(CUSTOM_TYPES_KEY)||'[]');return Array.isArray(raw)?raw.map(cleanProductType).filter(Boolean):[]}catch{return[]}
  }
  function saveCustomProductTypes(types){
    const out=[];
    for(const raw of types){
      const type=cleanProductType(raw);if(!type||PRODUCT_TYPES.some(x=>sameProductType(x,type))||out.some(x=>sameProductType(x,type)))continue;out.push(type);
    }
    try{localStorage.setItem(CUSTOM_TYPES_KEY,JSON.stringify(out))}catch{}
    return out;
  }
  function rememberCustomProductType(type){
    type=cleanProductType(type);if(!type||PRODUCT_TYPES.some(x=>sameProductType(x,type)))return type;
    const current=readCustomProductTypes();if(!current.some(x=>sameProductType(x,type))){current.push(type);saveCustomProductTypes(current)}
    return current.find(x=>sameProductType(x,type))||type;
  }
  function editorProductTypes(){
    const out=[];
    for(const value of [...PRODUCT_TYPES,...readCustomProductTypes(),...editingTypes]){
      const type=cleanProductType(value);if(type&&!out.some(x=>sameProductType(x,type)))out.push(type);
    }
    return out;
  }
  function productTypeButton(type){return `<button type="button" data-app-type="${attr(type)}" class="${[...editingTypes].some(x=>sameProductType(x,type))?'active':''}">${esc(type)}</button>`}
  function bindProductTypeButton(btn){
    if(!btn||btn.dataset.productTypeBound==='1')return;btn.dataset.productTypeBound='1';
    btn.addEventListener('click',()=>{
      const type=cleanProductType(btn.dataset.appType);if(!type)return;
      const existing=[...editingTypes].find(x=>sameProductType(x,type));
      if(existing)editingTypes.delete(existing);else editingTypes.add(type);
      btn.classList.toggle('active',!existing);
    });
  }
  function addEditorProductTypes(wrap){
    const input=wrap?.querySelector('[data-custom-product-type-input]');if(!input)return;
    const types=parseProductTypes(input.value);if(!types.length)return toast('请输入产品类型');
    const box=wrap.querySelector('.wobbin-meta-types');if(!box)return;
    for(const raw of types){
      const builtin=PRODUCT_TYPES.find(x=>sameProductType(x,raw));
      const type=builtin||rememberCustomProductType(raw);
      const existing=[...editingTypes].find(x=>sameProductType(x,type));
      if(!existing)editingTypes.add(type);
      let btn=[...box.querySelectorAll('[data-app-type]')].find(x=>sameProductType(x.dataset.appType,type));
      if(!btn){box.insertAdjacentHTML('beforeend',productTypeButton(type));btn=box.lastElementChild;bindProductTypeButton(btn)}
      btn?.classList.add('active');
    }
    input.value='';input.focus();
  }

  function ensureHomeIcons(){
    document.querySelectorAll('.app-card').forEach(card=>{
      const name=card.querySelector('.app-copy strong')?.textContent?.trim();if(!name)return;
      const meta=metaByName(name),icon=card.querySelector('.app-icon');applyIcon(icon,meta,name);
    });
  }
  function ensureMetaDisplay(){
    if(S.view!=='app')return;
    const meta=currentMeta(),titleWrap=document.querySelector('.app-title > div:last-child');if(!titleWrap)return;
    applyIcon(document.querySelector('.app-title > .app-icon'),meta,S.app);
    let desc=titleWrap.querySelector('[data-app-description]');if(!desc){desc=document.createElement('p');desc.dataset.appDescription='1';desc.className='wobbin-app-description';titleWrap.append(desc)}
    const text=String(meta?.description||'').trim();desc.textContent=text||(WOBBIN_PERMISSIONS.admin?'暂无描述，可点击“编辑信息”添加':'');desc.classList.toggle('is-empty',!text);desc.hidden=!text&&!WOBBIN_PERMISSIONS.admin;
    let tags=titleWrap.querySelector('[data-app-type-tags]');if(!tags){tags=document.createElement('div');tags.dataset.appTypeTags='1';tags.className='wobbin-app-type-tags';titleWrap.append(tags)}
    const types=Array.isArray(meta?.app_types)?meta.app_types:[];tags.innerHTML=types.map(x=>`<span>${esc(x)}</span>`).join('');tags.hidden=!types.length;
  }
  function ensureEditButton(){
    if(S.view!=='app'||!WOBBIN_PERMISSIONS.admin)return;const head=document.querySelector('.app-head');if(!head)return;
    let group=head.querySelector('.app-head-actions');if(!group){group=document.createElement('div');group.className='app-head-actions';head.append(group)}
    if(group.querySelector('[data-edit-app-meta]'))return;const btn=document.createElement('button');btn.type='button';btn.className='detail-action-btn wobbin-edit-meta-btn';btn.dataset.editAppMeta='1';btn.textContent='编辑信息';group.prepend(btn);btn.addEventListener('click',openEditor);
  }
  function cleanupLogoPreview(){if(editingLogoPreviewUrl){try{URL.revokeObjectURL(editingLogoPreviewUrl)}catch{};editingLogoPreviewUrl=''}}
  function removeEditor(){document.querySelector('[data-app-meta-editor]')?.remove();editingId='';editingTypes=new Set();editingLogoFile=null;editingRemoveLogo=false;cleanupLogoPreview()}
  function typePicker(){return `<div class="wobbin-meta-types">${editorProductTypes().map(productTypeButton).join('')}</div><div class="wobbin-meta-custom-type"><input type="text" maxlength="240" data-custom-product-type-input placeholder="输入多个类型，用、分隔，如 房产、AI、工具"><button type="button" class="secondary" data-add-custom-product-type>添加</button></div><small class="wobbin-meta-custom-type-help">支持自定义类型，可一次输入多个，用「、」分隔。</small>`}
  function logoPreview(meta){return `<div class="wobbin-logo-preview ${meta?.logo_url?'has-image':''}" data-app-logo-preview>${iconMarkup(meta,meta?.name||'A')}</div>`}
  function setLogoPreview(file,meta){
    const preview=document.querySelector('[data-app-logo-preview]');if(!preview)return;
    cleanupLogoPreview();
    if(file){editingLogoPreviewUrl=URL.createObjectURL(file);preview.innerHTML=`<img src="${attr(editingLogoPreviewUrl)}" alt="App icon preview">`;preview.classList.add('has-image');return}
    if(editingRemoveLogo){preview.textContent=String(meta?.name||'A').slice(0,1).toUpperCase();preview.classList.remove('has-image');return}
    preview.innerHTML=iconMarkup(meta,meta?.name||'A');preview.classList.toggle('has-image',Boolean(meta?.logo_url));
  }
  function openEditor(){
    const meta=currentMeta();if(!meta)return toast('文件包信息还在加载，请稍后再试');removeEditor();editingId=meta.id;editingTypes=new Set(Array.isArray(meta.app_types)?meta.app_types.map(cleanProductType).filter(Boolean):[]);[...editingTypes].forEach(rememberCustomProductType);
    const wrap=document.createElement('div');wrap.className='backdrop';wrap.dataset.appMetaEditor='1';wrap.dataset.customTypesEnhanced='1';
    wrap.innerHTML=`<section class="modal wobbin-meta-modal"><header class="modal-head"><div><small>PACKAGE INFO</small><h2>编辑文件包信息</h2></div><button class="modal-close" type="button" data-app-meta-close>×</button></header><div class="wobbin-meta-form"><div class="wobbin-meta-logo-field"><span>App 图标</span><div class="wobbin-meta-logo-row">${logoPreview(meta)}<div class="wobbin-meta-logo-actions"><button type="button" class="secondary" data-app-logo-choose>选择图片</button><button type="button" class="secondary" data-app-logo-remove ${meta.logo_url?'':'disabled'}>移除图标</button><small>PNG / JPG / WebP，最大 5MB，建议使用正方形图片。</small></div><input hidden type="file" accept="image/png,image/jpeg,image/webp" data-app-logo-file></div></div><label><span>文件包名称</span><input type="text" maxlength="160" data-app-meta-name value="${attr(meta.name||'')}"></label><label><span>描述</span><textarea maxlength="800" rows="5" data-app-meta-description placeholder="例如：旅行住宿预订产品，包含搜索、房源详情、预订与消息等页面。">${esc(meta.description||'')}</textarea><em data-app-meta-count>${String(meta.description||'').length}/800</em></label><div class="wobbin-meta-type-field"><span>产品类型 <small>可多选 / 可自定义</small></span>${typePicker()}</div></div><footer class="modal-foot"><button type="button" class="secondary" data-app-meta-cancel>取消</button><button type="button" class="primary" data-app-meta-save>保存</button></footer></section>`;
    document.body.append(wrap);
    const name=wrap.querySelector('[data-app-meta-name]'),description=wrap.querySelector('[data-app-meta-description]'),count=wrap.querySelector('[data-app-meta-count]'),fileInput=wrap.querySelector('[data-app-logo-file]'),removeLogo=wrap.querySelector('[data-app-logo-remove]');
    description?.addEventListener('input',()=>{if(count)count.textContent=`${description.value.length}/800`});
    wrap.querySelectorAll('[data-app-type]').forEach(bindProductTypeButton);
    wrap.querySelector('[data-add-custom-product-type]')?.addEventListener('click',()=>addEditorProductTypes(wrap));
    wrap.querySelector('[data-custom-product-type-input]')?.addEventListener('keydown',event=>{if(event.key!=='Enter')return;event.preventDefault();addEditorProductTypes(wrap)});
    wrap.querySelector('[data-app-logo-choose]')?.addEventListener('click',()=>fileInput?.click());
    fileInput?.addEventListener('change',()=>{
      const file=fileInput.files?.[0];if(!file)return;
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)){fileInput.value='';return toast('图标仅支持 PNG、JPG、WebP')}
      if(file.size>5*1024*1024){fileInput.value='';return toast('App 图标不能超过 5MB')}
      editingLogoFile=file;editingRemoveLogo=false;if(removeLogo)removeLogo.disabled=false;setLogoPreview(file,meta);
    });
    removeLogo?.addEventListener('click',()=>{editingLogoFile=null;editingRemoveLogo=true;if(fileInput)fileInput.value='';removeLogo.disabled=true;setLogoPreview(null,meta)});
    wrap.querySelector('[data-app-meta-close]')?.addEventListener('click',removeEditor);wrap.querySelector('[data-app-meta-cancel]')?.addEventListener('click',removeEditor);wrap.addEventListener('mousedown',e=>{if(e.target===wrap)removeEditor()});wrap.querySelector('[data-app-meta-save]')?.addEventListener('click',saveEditor);setTimeout(()=>name?.focus(),0);
  }
  async function appMetaAdminFetch(payload){
    const key=await askAdminKey(false),res=await fetch(META_URL,{method:'POST',headers:{'Content-Type':'application/json','x-wobbin-key':key},body:JSON.stringify(payload)}),data=await res.json().catch(()=>({}));
    if(!res.ok){if(res.status===401){try{localStorage.removeItem(WOBBIN_ADMIN_KEY_STORE)}catch{};throw new Error('管理员权限已失效，请重新进入管理员模式')}throw new Error(data.error||`保存失败（${res.status}）`)}return data;
  }
  async function uploadAppLogo(appId,file){
    const prep=await appMetaAdminFetch({action:'prepare-app-logo-upload',app_id:appId,file_name:file.name,content_type:file.type,size:file.size});
    const put=await fetch(prep.upload_url,{method:'PUT',headers:{'Content-Type':file.type},body:file});
    if(!put.ok)throw new Error(`App 图标上传失败（${put.status}）`);
    return await appMetaAdminFetch({action:'finalize-app-logo-upload',app_id:appId,storage_path:prep.storage_path});
  }
  window.wobbinUploadAppLogo=uploadAppLogo;
  async function saveEditor(){
    const wrap=document.querySelector('[data-app-meta-editor]');if(!wrap||!editingId)return;const name=String(wrap.querySelector('[data-app-meta-name]')?.value||'').trim(),description=String(wrap.querySelector('[data-app-meta-description]')?.value||'').trim();if(!name)return toast('文件包名称不能为空');
    const save=wrap.querySelector('[data-app-meta-save]');if(save){save.disabled=true;save.textContent='保存中…'}const oldName=S.app;
    try{
      let data=await appMetaAdminFetch({action:'update-app',app_id:editingId,name,description,app_types:[...editingTypes]}),updated=data.app;if(updated)META.apps.set(updated.id,updated);S.app=updated?.name||name;
      if(editingRemoveLogo){data=await appMetaAdminFetch({action:'remove-app-logo',app_id:editingId});updated=data.app;if(updated)META.apps.set(updated.id,updated)}
      else if(editingLogoFile){data=await uploadAppLogo(editingId,editingLogoFile);updated=data.app;if(updated)META.apps.set(updated.id,updated)}
      removeEditor();if(typeof loadCloudLibrary==='function')await loadCloudLibrary({quiet:true});await loadMeta({force:true});if(typeof loadWobbinLabels==='function')await loadWobbinLabels().catch(()=>{});render();toast(oldName!==S.app?'文件包信息已更新':'文件包信息已保存')
    }catch(error){if(save){save.disabled=false;save.textContent='保存'}toast(error instanceof Error?error.message:'保存失败')}
  }
  function ensureStyles(){
    if(document.getElementById('wobbin-package-meta-style'))return;const style=document.createElement('style');style.id='wobbin-package-meta-style';style.textContent=`
      .app-icon.has-image{padding:0!important;overflow:hidden}.app-icon.has-image img{width:100%;height:100%;display:block;object-fit:cover}.wobbin-app-description{margin:8px 0 0!important;max-width:680px;color:var(--muted,#8f8f8f);font-size:12px;line-height:1.55}.wobbin-app-description.is-empty{opacity:.72}.wobbin-app-type-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.wobbin-app-type-tags span{height:23px;display:inline-flex;align-items:center;padding:0 8px;border-radius:999px;background:rgba(127,127,127,.13);color:var(--muted,#aaa);font-size:10px;font-weight:650}.wobbin-edit-meta-btn{white-space:nowrap}
      .wobbin-meta-modal{width:min(620px,calc(100vw - 32px))}.wobbin-meta-form{display:grid;gap:18px;padding:6px 24px 24px}.wobbin-meta-form label{display:grid;gap:8px;position:relative}.wobbin-meta-form label>span,.wobbin-meta-type-field>span,.wobbin-meta-logo-field>span{font-size:12px;font-weight:650;color:var(--muted,#8f8f8f)}.wobbin-meta-type-field>span small{font-size:10px;font-weight:500;margin-left:5px}.wobbin-meta-form input,.wobbin-meta-form textarea{width:100%;border:1px solid var(--line,#343434);background:var(--panel2,#222);color:var(--text,#f5f5f5);border-radius:12px;outline:none;padding:12px 14px;font:inherit}.wobbin-meta-form input{height:44px}.wobbin-meta-form textarea{resize:vertical;min-height:116px;line-height:1.55;padding-bottom:30px}.wobbin-meta-form input:focus,.wobbin-meta-form textarea:focus{border-color:#666}.wobbin-meta-form em{position:absolute;right:11px;bottom:9px;color:var(--muted,#8f8f8f);font-size:10px;font-style:normal}.wobbin-meta-type-field,.wobbin-meta-logo-field{display:grid;gap:9px}.wobbin-meta-types{display:flex;flex-wrap:wrap;gap:7px}.wobbin-meta-types button{height:30px;padding:0 10px;border:1px solid var(--line,#383838);border-radius:999px;background:transparent;color:var(--muted,#aaa);font-size:11px;cursor:pointer}.wobbin-meta-types button.active{background:var(--text,#fff);border-color:var(--text,#fff);color:var(--bg,#111)}
      .wobbin-meta-custom-type{display:flex;gap:8px;margin-top:3px}.wobbin-meta-custom-type input{height:38px!important;flex:1;min-width:0;padding:0 11px!important;border-radius:10px!important}.wobbin-meta-custom-type button{height:38px;padding:0 13px;flex:0 0 auto}.wobbin-meta-custom-type-help{color:var(--muted,#888);font-size:10px;line-height:1.45}
      .wobbin-meta-logo-row{display:flex;align-items:center;gap:14px}.wobbin-logo-preview{width:72px;height:72px;flex:0 0 72px;border-radius:18px;border:1px solid var(--line,#383838);background:var(--panel2,#222);display:grid;place-items:center;font-size:24px;font-weight:750;overflow:hidden}.wobbin-logo-preview.has-image img{width:100%;height:100%;display:block;object-fit:cover}.wobbin-meta-logo-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.wobbin-meta-logo-actions button{height:34px;padding:0 11px}.wobbin-meta-logo-actions small{width:100%;color:var(--muted,#888);font-size:10px;line-height:1.45}.wobbin-meta-logo-actions button:disabled{opacity:.35;cursor:not-allowed}
      @media(max-width:520px){.wobbin-meta-custom-type{display:grid;grid-template-columns:1fr auto}}
    `;document.head.append(style);
  }
  function enhance(){ensureStyles();removeDetailShortcut();ensureHomeIcons();ensureMetaDisplay();ensureEditButton()}
  const baseRender=render;render=function(){baseRender();queueMicrotask(()=>queueMicrotask(enhance))};
  loadMeta().then(()=>render());enhance();
})();
