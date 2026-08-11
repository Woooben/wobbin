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

  if(!['apps','shots','web'].includes(S.libraryMode)){
    try{S.libraryMode=localStorage.getItem(LIBRARY_KEY)||'apps'}catch{S.libraryMode='apps'}
  }
  if(!['apps','shots','web'].includes(S.libraryMode))S.libraryMode='apps';
  if(!S.productType)S.productType='All';
  if(!S.uploadKind)S.uploadKind='app';
  if(!(S.uploadProductTypes instanceof Set))S.uploadProductTypes=new Set();
  if(!S.uploadMeta)S.uploadMeta={app:'',description:'',flow:'',platform:'iOS',category:'自动识别'};

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
    return item;
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
    const tabs=[['app','Apps','产品文件包'],['shot','Shots','独立案例'],['web','Web','网页参考']];
    return `<div class="wobbin-upload-kind">${tabs.map(([key,label,sub])=>`<button type="button" class="${S.uploadKind===key?'active':''}" data-upload-kind="${key}"><strong>${label}</strong><span>${sub}</span></button>`).join('')}</div>`;
  }
  function productTypePicker(){
    return `<div class="field wide"><span>产品类型 <em class="wobbin-field-hint">可多选</em></span><div class="wobbin-product-types">${PRODUCT_TYPES.map(type=>`<button type="button" data-upload-product-type="${attr(type)}" class="${S.uploadProductTypes.has(type)?'active':''}">${esc(type)}</button>`).join('')}</div></div>`;
  }
  function appFields(){
    const m=S.uploadMeta;
    const admin=WOBBIN_PERMISSIONS.admin;
    return `<label class="field"><span>文件包名称</span><input id="up-app" value="${attr(m.app||'')}" placeholder="例如 Airbnb" required></label>
      <label class="field"><span>平台</span><select id="up-platform"><option ${m.platform==='iOS'?'selected':''}>iOS</option><option ${m.platform==='Android'?'selected':''}>Android</option><option ${m.platform==='Web'?'selected':''}>Web</option></select></label>
      ${admin?`<label class="field wide"><span>文件包描述</span><textarea id="up-description" rows="3" maxlength="800" placeholder="简单说明产品定位、核心场景等">${esc(m.description||'')}</textarea></label>`:''}
      <label class="field"><span>默认 Flow</span><input id="up-flow" value="${attr(m.flow||'')}" placeholder="例如 Booking / Search"></label>
      <label class="field"><span>页面类型</span><select id="up-category"><option ${m.category==='自动识别'?'selected':''}>自动识别</option>${Object.keys(CATEGORY_KEYS).map(x=>`<option ${m.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`;
  }
  function looseFields(kind){
    const m=S.uploadMeta;
    const web=kind==='web';
    return `<label class="field"><span>来源平台</span><select id="up-platform" ${web?'disabled':''}>${web?'<option selected>Web</option>':`<option ${m.platform==='iOS'?'selected':''}>iOS</option><option ${m.platform==='Android'?'selected':''}>Android</option><option ${m.platform==='Web'?'selected':''}>Web</option>`}</select></label>
      <label class="field"><span>页面类型</span><select id="up-category"><option ${m.category==='自动识别'?'selected':''}>自动识别</option>${Object.keys(CATEGORY_KEYS).map(x=>`<option ${m.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      <div class="field wide wobbin-loose-note"><span>${web?'网页截图会直接进入 Web，不会生成文件包。':'每张图片都会作为独立 Shot 保存，不需要填写 App 名称或 Flow。'}</span></div>`;
  }

  uploadModal=function(){
    const kind=S.uploadKind||'app';
    return `<div class="backdrop" id="upload-bg"><section class="modal wobbin-upload-modal"><header class="modal-head"><div><small>IMPORT REFERENCES</small><h2>导入设计参考</h2></div><button class="modal-close" id="upload-close">×</button></header>${uploadTypeTabs()}<div class="upload-tabs">${[['folder','整个文件夹'],['images','多张图片'],['zip','ZIP 压缩包']].map(([k,l])=>`<button data-upload-mode="${k}" class="${S.uploadMode===k?'active':''}">${l}</button>`).join('')}</div><button class="dropzone" id="drop"><strong>${S.uploadMode==='folder'?'选择整个文件夹':S.uploadMode==='zip'?'选择 ZIP 压缩包':'选择多张截图'}</strong><span>${kind==='app'?'建议目录：App / Flow / screenshot.png':'支持一次选择多张图片'}</span><input id="folder-input" type="file" webkitdirectory directory multiple><input id="image-input" type="file" multiple accept="image/*"><input id="zip-input" type="file" accept=".zip,application/zip"></button><div class="package-summary ${S.entries.length?'':'hidden'}" id="package-summary">${S.entries.length?`已识别 ${S.entries.length} 张截图<br>${S.entries.slice(0,5).map(x=>esc(x.path)).join('<br>')}`:''}</div><div class="form-grid">${kind==='app'?appFields():looseFields(kind)}${productTypePicker()}<div class="field wide"><span>补充 UI 元素标签</span><div class="manual-elements">${ELEMENTS.map(([k,l])=>`<button type="button" data-manual="${k}" class="${S.manual.has(k)?'active':''}">${l}</button>`).join('')}</div></div></div><footer class="modal-foot"><button id="upload-cancel" class="secondary">取消</button><button id="upload-submit" class="primary">开始导入</button></footer></section></div>`;
  };

  function saveUploadMeta(){
    const app=document.getElementById('up-app'),desc=document.getElementById('up-description'),flow=document.getElementById('up-flow'),platform=document.getElementById('up-platform'),category=document.getElementById('up-category');
    if(app)S.uploadMeta.app=app.value;
    if(desc)S.uploadMeta.description=desc.value;
    if(flow)S.uploadMeta.flow=flow.value;
    if(platform)S.uploadMeta.platform=platform.value;
    if(category)S.uploadMeta.category=category.value;
  }
  function resetUploadDraft(){
    S.uploadMeta={app:'',description:'',flow:'',platform:'iOS',category:'自动识别'};
    S.uploadProductTypes=new Set();
    S.manual=new Set();
  }

  bindUpload=function(){
    document.querySelectorAll('[data-upload-kind]').forEach(b=>b.onclick=()=>{saveUploadMeta();S.uploadKind=b.dataset.uploadKind;if(S.uploadKind==='web')S.uploadMeta.platform='Web';else if(S.uploadMeta.platform==='Web'&&S.uploadKind==='shot')S.uploadMeta.platform='iOS';render()});
    document.querySelectorAll('[data-upload-mode]').forEach(b=>b.onclick=()=>{saveUploadMeta();S.uploadMode=b.dataset.uploadMode;S.entries=[];render()});
    document.querySelectorAll('[data-upload-product-type]').forEach(b=>b.onclick=()=>{const type=b.dataset.uploadProductType;S.uploadProductTypes.has(type)?S.uploadProductTypes.delete(type):S.uploadProductTypes.add(type);b.classList.toggle('active',S.uploadProductTypes.has(type))});
    document.querySelectorAll('[data-manual]').forEach(b=>b.onclick=()=>{const k=b.dataset.manual;S.manual.has(k)?S.manual.delete(k):S.manual.add(k);b.classList.toggle('active',S.manual.has(k))});
    document.querySelectorAll('#up-app,#up-description,#up-flow,#up-platform,#up-category').forEach(el=>{el.addEventListener('input',saveUploadMeta);el.addEventListener('change',saveUploadMeta)});
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
    }catch(error){console.warn(error);toast('截图已上传，但文件包描述或类型保存失败')}
  }

  importEntries=async function(){
    if(!S.entries.length)return toast('请先选择文件');
    saveUploadMeta();
    const kind=S.uploadKind||'app',types=[...S.uploadProductTypes];
    if(kind==='app'&&!String(S.uploadMeta.app||'').trim())return toast('请填写文件包名称');
    const btn=document.getElementById('upload-submit');if(!btn)return;
    btn.disabled=true;const originalText=btn.textContent||'开始导入';
    const d={
      kind,
      productTypes:types,
      app:kind==='app'?String(S.uploadMeta.app||'').trim():(kind==='web'?WEB_APP:SHOTS_APP),
      flow:kind==='app'?(String(S.uploadMeta.flow||'').trim()||'Imported screens'):(kind==='web'?'Web references':'Shots'),
      platform:kind==='web'?'Web':(S.uploadMeta.platform||'iOS'),
      category:S.uploadMeta.category||'自动识别',
    };
    const entries=[...S.entries];
    const progressState={total:entries.length,done:0,totalBytes:entries.reduce((n,e)=>n+(e.file?.size||0),0),loaded:Array(entries.length).fill(0)};
    try{
      const mode=await validateAdmin();
      if(mode.storage!=='aliyun-oss'||mode.direct_upload!==true)throw new Error('当前仅支持 OSS 直传，请稍后重试');
      const added=[];showDirectProgress(0,entries.length,0,progressState.totalBytes);
      for(let start=0;start<entries.length;start+=DIRECT_BATCH){
        const chunk=entries.slice(start,start+DIRECT_BATCH);btn.textContent=`直传 OSS ${Math.min(start+1,entries.length)}/${entries.length}`;
        const items=await directUploadChunk(chunk,d,start,progressState);items.forEach(x=>{x.libraryKind=kindForItem(x);x.productTypes=types;x.appTypes=kind==='app'?types:[]});added.push(...items);
        btn.textContent=`直传 OSS ${progressState.done}/${entries.length}`;
      }
      if(kind==='app')await updateAppMetaAfterUpload(d.app,S.uploadMeta.description||'',types);
      S.items=[...added,...S.items];S.upload=false;S.entries=[];S.libraryMode=kind==='app'?'apps':kind;S.productType='All';S.element='All';S.view='home';S.query='';
      try{localStorage.setItem(LIBRARY_KEY,S.libraryMode)}catch{}
      resetUploadDraft();
      await loadCloudLibrary({quiet:true});
      if(typeof loadWobbinLabels==='function')await loadWobbinLabels().catch(()=>{});
      hideDirectProgress();render();toast(`已上传 ${added.length} 张到 ${S.libraryMode==='apps'?'Apps':S.libraryMode==='shots'?'Shots':'Web'}`);
    }catch(error){hideDirectProgress();btn.disabled=false;btn.textContent=originalText;await loadCloudLibrary({quiet:true}).catch(()=>{});toast(error instanceof Error?error.message:'上传失败')}
  };

  function ensureStyles(){
    if(document.getElementById('wobbin-library-style'))return;
    const style=document.createElement('style');style.id='wobbin-library-style';style.textContent=`
      .wobbin-upload-modal{width:min(760px,calc(100vw - 32px))}
      .wobbin-upload-kind{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 24px 16px}
      .wobbin-upload-kind button{min-height:58px;border:1px solid var(--line,#383838);border-radius:14px;background:transparent;color:var(--text,#fff);display:grid;gap:3px;align-content:center;text-align:left;padding:10px 13px;cursor:pointer}
      .wobbin-upload-kind button.active{border-color:var(--text,#fff);background:rgba(127,127,127,.14)}
      .wobbin-upload-kind strong{font-size:14px}.wobbin-upload-kind span{font-size:10px;color:var(--muted,#999)}
      .wobbin-product-types{display:flex;flex-wrap:wrap;gap:7px}
      .wobbin-product-types button{height:30px;padding:0 10px;border:1px solid var(--line,#383838);border-radius:999px;background:transparent;color:var(--muted,#aaa);font-size:11px;cursor:pointer}
      .wobbin-product-types button.active{background:var(--text,#fff);border-color:var(--text,#fff);color:var(--bg,#111)}
      .wobbin-field-hint{font-size:10px;font-style:normal;font-weight:500;color:var(--muted,#888);margin-left:5px}
      .wobbin-loose-note{padding:11px 13px;border-radius:12px;background:rgba(127,127,127,.08);color:var(--muted,#999);line-height:1.5}
      .form-grid textarea{width:100%;border:1px solid var(--line,#343434);background:var(--panel2,#222);color:var(--text,#f5f5f5);border-radius:10px;outline:none;padding:10px 12px;font:inherit;resize:vertical}
      @media(max-width:640px){.wobbin-upload-kind{grid-template-columns:1fr}.wobbin-upload-kind button{min-height:50px}}
    `;document.head.append(style);
  }

  const baseRender=render;
  render=function(){baseRender();queueMicrotask(ensureStyles)};
  ensureStyles();
  render();
})();
