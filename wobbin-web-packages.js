'use strict';

(function bootWobbinWebPackages(){
  if(window.__WOBBIN_WEB_PACKAGES_INSTALLED)return;
  if(!window.__WOBBIN_LIBRARY_INSTALLED||typeof home!=='function'||typeof apps!=='function'||typeof uploadModal!=='function'||typeof bindUpload!=='function'||typeof importEntries!=='function'||typeof makeItem!=='function'||typeof directUploadChunk!=='function'||typeof S==='undefined'){
    setTimeout(bootWobbinWebPackages,80);
    return;
  }
  window.__WOBBIN_WEB_PACKAGES_INSTALLED=true;

  const LEGACY_WEB_APP='__Wobbin Web';
  const WEB_KIND_TAG='kind:web';
  const DIRECT_BATCH=typeof WOBBIN_DIRECT_BATCH_SIZE==='number'?WOBBIN_DIRECT_BATCH_SIZE:20;
  if(typeof S.uploadWebExisting!=='string')S.uploadWebExisting='';

  function uniq(values){return [...new Set((values||[]).filter(Boolean))]}
  function isWebItem(item){
    return item?.app===LEGACY_WEB_APP||item?.libraryKind==='web'||(item?.tags||[]).map(String).includes(WEB_KIND_TAG);
  }
  function isShotItem(item){return item?.app==='__Wobbin Shots'}
  function itemTypes(item){
    const direct=Array.isArray(item?.appTypes)?item.appTypes:[];
    const tagged=(item?.tags||[]).map(String).filter(x=>x.startsWith('type:')).map(x=>x.slice(5));
    return uniq([...direct,...tagged]);
  }
  function passesType(item){return !S.productType||S.productType==='All'||itemTypes(item).includes(S.productType)}
  function passesElement(item){return !S.element||S.element==='All'||(item.elements||[]).includes(S.element)}
  function passesQuery(item){return typeof matchesQuery==='function'?matchesQuery(item,S.query):true}
  function webItems(){return all().filter(x=>!x.demo&&isWebItem(x)&&passesType(x)&&passesElement(x)&&passesQuery(x))}
  function webPackageNames(){
    return uniq(all().filter(x=>!x.demo&&isWebItem(x)&&x.app&&x.app!==LEGACY_WEB_APP).map(x=>String(x.app))).sort((a,b)=>a.localeCompare(b,'en'));
  }
  function webPackages(){
    const map=new Map();
    for(const item of webItems()){
      if(!item.app||item.app===LEGACY_WEB_APP)continue;
      if(!map.has(item.app))map.set(item.app,[]);
      map.get(item.app).push(item);
    }
    return [...map].map(([name,items])=>({name,items,flows:uniq(items.map(x=>x.flow||'Web pages')).length,platforms:['Web']})).sort((a,b)=>{
      const ta=Math.max(...a.items.map(x=>new Date(x.createdAt||0).getTime()||0));
      const tb=Math.max(...b.items.map(x=>new Date(x.createdAt||0).getTime()||0));
      return tb-ta;
    });
  }
  function legacyWebItems(){return webItems().filter(x=>x.app===LEGACY_WEB_APP)}
  function packageCover(pkg){
    const selected=typeof covers==='function'?covers()[pkg.name]:'';
    return pkg.items.find(x=>x.id===selected)||pkg.items[0]||null;
  }
  function webCard(pkg){
    const cover=packageCover(pkg);
    const count=pkg.items.length;
    return `<article class="app-card web-package-card"><div class="cover-wrap" data-open-app="${attr(pkg.name)}"><div class="cover-image web"><img src="${attr(cover?.imageUrl||'')}" alt="${attr(pkg.name)}"></div><div class="card-actions"><button data-cover-app="${attr(pkg.name)}">设置封面</button></div></div><div class="card-info"><div class="web-package-icon" aria-hidden="true">⌘</div><div class="app-copy"><strong>${esc(pkg.name)}</strong><span>${count} pages · ${pkg.flows} flows · Web</span></div></div></article>`;
  }
  function webHome(){
    const packages=webPackages(),legacy=legacyWebItems();
    return `${header()}<main class="main"><div class="subnav"><div class="subnav-left"><span class="page-label"><strong>Web</strong> · 网站与网页案例文件包</span></div></div>${quickElements()}<div class="section-head"><div><h1>Web</h1><p>按网站 / 项目建立独立文件包，统一管理页面、Flow 与标签。</p></div><span class="section-count">${packages.length} packages · ${webItems().length} pages</span></div>${packages.length?`<section class="apps-grid web-packages-grid">${packages.map(webCard).join('')}</section>`:`<div class="empty"><strong>这里还没有 Web 文件包</strong>点击右上角“导入”，选择 Web 后新建一个网站案例文件包。</div>`}${legacy.length?`<section class="web-legacy-section"><div class="section-head"><div><h1>未归档网页</h1><p>之前以单页方式上传的 Web 案例仍然保留，可继续浏览。</p></div><span class="section-count">${legacy.length} pages</span></div>${screenView(legacy)}</section>`:''}</main>${suggestions()}`;
  }

  const baseHome=home;
  home=function(){return S.libraryMode==='web'?webHome():baseHome()};

  const baseApps=apps;
  apps=function(){return baseApps().filter(pkg=>!(pkg.items||[]).some(isWebItem))};

  window.wobbinVisibleLibraryItems=function(){
    return all().filter(x=>{
      if(x.demo)return false;
      if(S.libraryMode==='web')return isWebItem(x)&&passesType(x);
      if(S.libraryMode==='shots')return isShotItem(x)&&passesType(x);
      return !isWebItem(x)&&!isShotItem(x)&&passesType(x);
    });
  };

  const baseMakeItem=makeItem;
  makeItem=function(entry,d){
    const item=baseMakeItem(entry,d);
    if(d?.kind==='web'&&d?.app&&d.app!==LEGACY_WEB_APP){
      item.tags=uniq([...(item.tags||[]),WEB_KIND_TAG]);
      item.libraryKind='web';
      item.platform='Web';
    }
    return item;
  };

  function typeTabs(){
    const tabs=[['app','Apps','产品文件包'],['shot','Shots','独立案例'],['web','Web','网站文件包']];
    return `<div class="wobbin-upload-kind">${tabs.map(([key,label,sub])=>`<button type="button" class="${S.uploadKind===key?'active':''}" data-upload-kind="${key}"><strong>${label}</strong><span>${sub}</span></button>`).join('')}</div>`;
  }
  function productTypes(){
    const types=window.WOBBIN_TAXONOMY?.appTypes||[];
    return `<div class="field wide"><span>产品类型 <em class="wobbin-field-hint">可多选</em></span><div class="wobbin-product-types">${types.map(type=>`<button type="button" data-upload-product-type="${attr(type)}" class="${S.uploadProductTypes?.has(type)?'active':''}">${esc(type)}</button>`).join('')}</div></div>`;
  }
  function webTargetPicker(){
    const names=webPackageNames();
    const existingDisabled=!names.length;
    if(S.uploadTarget==='existing'&&!S.uploadWebExisting&&names.length)S.uploadWebExisting=names[0];
    return `<div class="field wide"><span>Web 文件包归属</span><div class="wobbin-upload-target"><button type="button" data-web-upload-target="new" class="${S.uploadTarget==='new'?'active':''}">新建 Web 文件包</button><button type="button" data-web-upload-target="existing" class="${S.uploadTarget==='existing'?'active':''}" ${existingDisabled?'disabled':''}>添加到已有 Web 文件包</button></div></div>${S.uploadTarget==='existing'?`<label class="field wide"><span>已有 Web 文件包</span><select id="up-web-existing">${names.map(name=>`<option value="${attr(name)}" ${name===S.uploadWebExisting?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`:`<label class="field"><span>网站 / 项目名称</span><input id="up-app" value="${attr(S.uploadMeta?.app||'')}" placeholder="例如 Linear / Airbnb Web" required></label>`}`;
  }
  function webUploadModal(){
    const m=S.uploadMeta||{app:'',description:'',flow:'',category:'自动识别'};
    const mode=S.uploadMode||'images';
    return `<div class="backdrop" id="upload-bg"><section class="modal wobbin-upload-modal"><header class="modal-head"><div><small>IMPORT WEB REFERENCES</small><h2>导入 Web 案例文件包</h2></div><button class="modal-close" id="upload-close">×</button></header>${typeTabs()}<div class="upload-tabs">${[['folder','整个文件夹'],['images','图片 / 视频'],['zip','ZIP 压缩包']].map(([k,l])=>`<button data-upload-mode="${k}" class="${mode===k?'active':''}">${l}</button>`).join('')}</div><button class="dropzone" id="drop"><strong>${mode==='folder'?'选择整个文件夹':mode==='zip'?'选择 ZIP 压缩包':'选择图片或视频'}</strong><span>支持整个网站案例文件包上传，建议目录：网站 / Flow / page</span><input id="folder-input" type="file" webkitdirectory directory multiple accept="image/*,video/*"><input id="image-input" type="file" multiple accept="image/*,video/*"><input id="zip-input" type="file" accept=".zip,application/zip"></button><div class="package-summary ${S.entries?.length?'':'hidden'}" id="package-summary">${S.entries?.length?`已识别 ${S.entries.length} 个素材<br>${S.entries.slice(0,5).map(x=>esc(x.path)).join('<br>')}`:''}</div><div class="form-grid">${webTargetPicker()}<label class="field"><span>平台</span><select id="up-platform" disabled><option selected>Web</option></select></label><label class="field"><span>默认 Flow / 页面分组</span><input id="up-flow" value="${attr(m.flow||'')}" placeholder="例如 Homepage / Pricing / Dashboard"></label><label class="field wide"><span>文件包描述</span><textarea id="up-description" rows="3" maxlength="800" placeholder="简单说明网站定位、核心页面或设计特点">${esc(m.description||'')}</textarea></label><label class="field"><span>页面类型</span><select id="up-category"><option ${m.category==='自动识别'?'selected':''}>自动识别</option>${Object.keys(CATEGORY_KEYS).map(x=>`<option ${m.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>${productTypes()}<div class="field wide"><span>补充 UI 元素标签</span><div class="manual-elements">${ELEMENTS.map(([k,l])=>`<button type="button" data-manual="${k}" class="${S.manual?.has(k)?'active':''}">${l}</button>`).join('')}</div></div></div><footer class="modal-foot"><button id="upload-cancel" class="secondary">取消</button><button id="upload-submit" class="primary">开始导入</button></footer></section></div>`;
  }

  const baseUploadModal=uploadModal;
  uploadModal=function(){return (S.uploadKind||'app')==='web'?webUploadModal():baseUploadModal()};

  const baseBindUpload=bindUpload;
  bindUpload=function(){
    baseBindUpload();
    if((S.uploadKind||'app')!=='web')return;
    document.querySelectorAll('[data-web-upload-target]').forEach(btn=>btn.onclick=()=>{
      const app=document.getElementById('up-app'),flow=document.getElementById('up-flow'),desc=document.getElementById('up-description'),category=document.getElementById('up-category');
      if(app)S.uploadMeta.app=app.value;if(flow)S.uploadMeta.flow=flow.value;if(desc)S.uploadMeta.description=desc.value;if(category)S.uploadMeta.category=category.value;
      S.uploadTarget=btn.dataset.webUploadTarget;
      if(S.uploadTarget==='existing'&&!S.uploadWebExisting)S.uploadWebExisting=webPackageNames()[0]||'';
      render();
    });
    document.getElementById('up-web-existing')?.addEventListener('change',e=>{S.uploadWebExisting=e.target.value});
  };

  function resetWebUploadState(){
    S.uploadWebExisting='';
    S.uploadTarget='new';
  }
  async function updateWebMeta(name,description,types){
    if(!window.WOBBIN_PERMISSIONS?.admin)return;
    try{
      const url=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-app-meta';
      const lookup=await fetch(url,{cache:'no-store'});const data=await lookup.json();
      const app=(data.apps||[]).find(x=>x.name===name);const key=localStorage.getItem(WOBBIN_ADMIN_KEY_STORE)||'';
      if(!app?.id||!key)return;
      await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-wobbin-key':key},body:JSON.stringify({action:'update-app',app_id:app.id,name,description,app_types:types})});
    }catch(error){console.warn('Web package metadata update failed',error)}
  }

  const baseImportEntries=importEntries;
  importEntries=async function(){
    if((S.uploadKind||'app')!=='web')return baseImportEntries();
    if(!S.entries?.length)return toast('请先选择图片或视频');
    const appInput=document.getElementById('up-app'),flowInput=document.getElementById('up-flow'),descInput=document.getElementById('up-description'),categoryInput=document.getElementById('up-category');
    if(appInput)S.uploadMeta.app=appInput.value;
    if(flowInput)S.uploadMeta.flow=flowInput.value;
    if(descInput)S.uploadMeta.description=descInput.value;
    if(categoryInput)S.uploadMeta.category=categoryInput.value;
    const name=S.uploadTarget==='existing'?S.uploadWebExisting:String(S.uploadMeta?.app||'').trim();
    if(!name)return toast(S.uploadTarget==='existing'?'请选择已有 Web 文件包':'请填写网站 / 项目名称');
    const existingWeb=webPackageNames();
    if(S.uploadTarget==='new'&&existingWeb.includes(name))return toast('这个 Web 文件包已存在，请选择“添加到已有 Web 文件包”');
    const conflict=all().some(x=>!x.demo&&!isWebItem(x)&&!isShotItem(x)&&x.app===name);
    if(conflict)return toast('该名称已被 Apps 文件包使用，请为 Web 文件包换一个名称');
    const btn=document.getElementById('upload-submit');if(!btn)return;
    btn.disabled=true;const original=btn.textContent||'开始导入';
    const types=[...(S.uploadProductTypes||[])];
    const d={kind:'web',productTypes:types,app:name,flow:String(S.uploadMeta?.flow||'').trim()||'Web pages',platform:'Web',category:S.uploadMeta?.category||'自动识别'};
    const entries=[...S.entries];
    const progressState={total:entries.length,done:0,totalBytes:entries.reduce((n,e)=>n+(e.file?.size||0),0),loaded:Array(entries.length).fill(0)};
    try{
      const mode=await validateAdmin();
      if(mode.storage!=='aliyun-oss'||mode.direct_upload!==true)throw new Error('当前仅支持 OSS 直传，请稍后重试');
      const added=[];showDirectProgress(0,entries.length,0,progressState.totalBytes);
      for(let start=0;start<entries.length;start+=DIRECT_BATCH){
        const chunk=entries.slice(start,start+DIRECT_BATCH);btn.textContent=`直传 OSS ${Math.min(start+1,entries.length)}/${entries.length}`;
        const result=await directUploadChunk(chunk,d,start,progressState);
        const items=Array.isArray(result)?result:(result?.items||[]);
        items.forEach(x=>{x.libraryKind='web';x.platform='Web';x.tags=uniq([...(x.tags||[]),WEB_KIND_TAG,...types.map(t=>'type:'+t)]);x.productTypes=types});
        added.push(...items);btn.textContent=`直传 OSS ${progressState.done}/${entries.length}`;
      }
      if(S.uploadTarget==='new')await updateWebMeta(name,S.uploadMeta?.description||'',types);
      S.items=[...added,...S.items];S.upload=false;S.entries=[];S.libraryMode='web';S.view='home';S.app=null;S.productType='All';S.element='All';S.query='';
      try{localStorage.setItem('wobbin_library_mode_v1','web')}catch{}
      resetWebUploadState();
      await loadCloudLibrary({quiet:true});
      if(typeof loadWobbinLabels==='function')await loadWobbinLabels().catch(()=>{});
      hideDirectProgress();render();toast(`已上传 ${added.length} 个素材到 Web 文件包 · ${name}`);
    }catch(error){hideDirectProgress();btn.disabled=false;btn.textContent=original;await loadCloudLibrary({quiet:true}).catch(()=>{});toast(error instanceof Error?error.message:'Web 文件包上传失败')}
  };

  function currentPackageIsWeb(){return S.view==='app'&&S.app&&all().some(x=>x.app===S.app&&isWebItem(x))}
  function openWebPackageUpload(name){
    S.upload=true;S.entries=[];S.uploadKind='web';S.uploadMode='images';S.uploadTarget='existing';S.uploadWebExisting=name;S.uploadMeta={app:name,description:'',flow:'',platform:'Web',category:'自动识别'};S.uploadProductTypes=new Set();S.manual=new Set();render();
  }
  function fixWebDetailUpload(){
    if(!currentPackageIsWeb())return;
    const btn=document.querySelector('[data-continue-upload]');if(!btn||btn.dataset.webPackageBound==='1')return;
    const clone=btn.cloneNode(true);clone.dataset.webPackageBound='1';btn.replaceWith(clone);clone.addEventListener('click',()=>openWebPackageUpload(S.app));
  }
  function ensureStyles(){
    if(document.getElementById('wobbin-web-package-style'))return;
    const style=document.createElement('style');style.id='wobbin-web-package-style';style.textContent=`
      .web-package-icon{width:40px;height:40px;display:grid;place-items:center;flex:0 0 40px;border-radius:10px;background:var(--panel2,#222);font-size:17px;font-weight:750;color:var(--muted,#999)}
      .web-legacy-section{margin-top:56px;padding-top:34px;border-top:1px solid var(--line,#2c2c2c)}
      .web-packages-grid .cover-image.web{padding:26px 22px}.web-packages-grid .cover-image.web img{width:100%;height:auto;max-height:100%;object-fit:contain}
    `;document.head.append(style);
  }
  function enhance(){ensureStyles();fixWebDetailUpload()}
  const baseRender=render;
  render=function(){baseRender();queueMicrotask(()=>queueMicrotask(enhance))};
  enhance();render();
})();
