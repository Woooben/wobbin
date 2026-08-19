'use strict';

(function bootWobbinCustomProductTypes(){
  if(window.__WOBBIN_CUSTOM_PRODUCT_TYPES_INSTALLED)return;
  if(
    !window.__WOBBIN_LIBRARY_INSTALLED||!window.__WOBBIN_PACKAGE_META_INSTALLED||
    !window.__WOBBIN_UPLOAD_PRODUCT_META_INSTALLED||
    typeof uploadModal!=='function'||typeof bindUpload!=='function'||typeof render!=='function'||
    typeof S==='undefined'||!window.WOBBIN_TAXONOMY||typeof WOBBIN_SUPABASE_URL==='undefined'
  ){
    setTimeout(bootWobbinCustomProductTypes,80);
    return;
  }
  window.__WOBBIN_CUSTOM_PRODUCT_TYPES_INSTALLED=true;

  const CUSTOM_KEY='wobbin_custom_product_types_v1';
  const META_URL=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-app-meta';
  const BUILTIN=[...(window.WOBBIN_TAXONOMY.appTypes||[])];

  function cleanType(value){return String(value||'').trim().replace(/\s+/g,' ').slice(0,40)}
  function sameType(a,b){return cleanType(a).toLocaleLowerCase()===cleanType(b).toLocaleLowerCase()}
  function builtinType(value){return BUILTIN.find(x=>sameType(x,value))||''}
  function parseTypes(value){
    const out=[];
    for(const raw of String(value||'').split(/[、,，;；\n]+/)){
      const type=cleanType(raw);if(!type||out.some(x=>sameType(x,type)))continue;out.push(type);
    }
    return out;
  }
  function readCustomTypes(){
    try{
      const raw=JSON.parse(localStorage.getItem(CUSTOM_KEY)||'[]');
      return Array.isArray(raw)?raw.map(cleanType).filter(Boolean):[];
    }catch{return[]}
  }
  function writeCustomTypes(types){
    const out=[];
    for(const type of types.map(cleanType).filter(Boolean)){
      if(builtinType(type)||out.some(x=>sameType(x,type)))continue;
      out.push(type);
    }
    try{localStorage.setItem(CUSTOM_KEY,JSON.stringify(out))}catch{}
    return out;
  }
  function customTypes(){return writeCustomTypes(readCustomTypes()).sort((a,b)=>a.localeCompare(b,'zh-CN'))}
  function registerCustomType(value){
    const type=cleanType(value);if(!type)return'';
    const builtin=builtinType(type);if(builtin)return builtin;
    const current=customTypes(),existing=current.find(x=>sameType(x,type));if(existing)return existing;
    current.push(type);writeCustomTypes(current);return type;
  }
  function canonicalType(value){
    const type=cleanType(value);if(!type)return'';
    return builtinType(type)||customTypes().find(x=>sameType(x,type))||type;
  }
  function customTypeButtons(selected){
    return customTypes().map(type=>`<button type="button" data-upload-product-type="${attr(type)}" data-custom-product-type="1" class="${[...selected].some(x=>sameType(x,type))?'active':''}">${esc(type)}</button>`).join('');
  }
  function addControl(scope){
    const id=scope==='editor'?'edit-custom-product-type':'upload-custom-product-type';
    const button=scope==='editor'?'data-add-edit-product-type':'data-add-upload-product-type';
    return `<div class="wobbin-custom-type-add" data-custom-type-add="${scope}"><input id="${id}" type="text" maxlength="240" placeholder="输入多个类型，用、分隔，如 房产、AI、工具"><button type="button" class="secondary" ${button}>添加</button></div><small class="wobbin-custom-type-help">支持自定义产品类型；可一次输入多个，用「、」分隔，添加后可继续复用。</small>`;
  }

  function injectUploadCustomTypes(html){
    if(!html.includes('wobbin-product-types')||html.includes('data-custom-type-add="upload"'))return html;
    const marker='<div class="wobbin-product-types">',start=html.indexOf(marker);if(start<0)return html;
    const close=html.indexOf('</div>',start+marker.length);if(close<0)return html;
    const buttons=customTypeButtons(S.uploadProductTypes instanceof Set?S.uploadProductTypes:new Set());
    html=html.slice(0,close)+buttons+html.slice(close);
    const pickerCloseEnd=close+buttons.length+'</div>'.length;
    return html.slice(0,pickerCloseEnd)+addControl('upload')+html.slice(pickerCloseEnd);
  }

  const baseUploadModal=uploadModal;
  uploadModal=function(){return injectUploadCustomTypes(baseUploadModal())};

  function addUploadTypes(){
    const input=document.getElementById('upload-custom-product-type');if(!input)return;
    const raws=parseTypes(input.value);if(!raws.length)return toast('请输入产品类型');
    if(!(S.uploadProductTypes instanceof Set))S.uploadProductTypes=new Set();
    for(const raw of raws){
      const type=registerCustomType(raw)||canonicalType(raw);if(!type)continue;
      const existing=[...S.uploadProductTypes].find(x=>sameType(x,type));
      S.uploadProductTypes.add(existing||type);
    }
    input.value='';render();
  }

  const baseBindUpload=bindUpload;
  bindUpload=function(){
    baseBindUpload();
    document.querySelector('[data-add-upload-product-type]')?.addEventListener('click',addUploadTypes);
    document.getElementById('upload-custom-product-type')?.addEventListener('keydown',event=>{
      if(event.key!=='Enter')return;event.preventDefault();addUploadTypes();
    });
  };

  function currentPageTypes(){
    return [...document.querySelectorAll('.wobbin-app-type-tags span')].map(x=>cleanType(x.textContent)).filter(Boolean);
  }
  function bridgeToggleEditorType(wrap,type){
    const direct=[...wrap.querySelectorAll('[data-app-type]')].find(btn=>sameType(btn.dataset.appType,type));
    if(direct){direct.click();return direct.classList.contains('active')}
    const bridge=wrap.querySelector('[data-app-type]');if(!bridge)return false;
    const oldType=bridge.dataset.appType||'',oldActive=bridge.classList.contains('active');
    bridge.dataset.appType=type;bridge.click();const active=bridge.classList.contains('active');
    bridge.dataset.appType=oldType;bridge.classList.toggle('active',oldActive);return active;
  }
  function makeEditorCustomButton(wrap,type,active){
    const box=wrap.querySelector('.wobbin-meta-types');if(!box)return null;
    let btn=[...box.querySelectorAll('[data-custom-edit-product-type]')].find(x=>sameType(x.dataset.customEditProductType,type));
    if(btn){btn.classList.toggle('active',active);return btn}
    btn=document.createElement('button');btn.type='button';btn.dataset.customEditProductType=type;btn.textContent=type;btn.classList.toggle('active',active);
    btn.addEventListener('click',()=>{const next=bridgeToggleEditorType(wrap,type);btn.classList.toggle('active',next)});
    box.append(btn);return btn;
  }
  function ensureEditorTypeSelected(wrap,raw){
    const builtin=builtinType(raw);
    if(builtin){
      const btn=[...wrap.querySelectorAll('[data-app-type]')].find(x=>sameType(x.dataset.appType,builtin));
      if(btn&&!btn.classList.contains('active'))btn.click();
      return builtin;
    }
    const type=registerCustomType(raw);if(!type)return'';
    const existing=[...wrap.querySelectorAll('[data-custom-edit-product-type]')].find(x=>sameType(x.dataset.customEditProductType,type));
    if(existing){if(!existing.classList.contains('active'))existing.click();return type}
    const active=bridgeToggleEditorType(wrap,type);makeEditorCustomButton(wrap,type,active);return type;
  }
  function addEditorTypes(wrap){
    const input=wrap.querySelector('#edit-custom-product-type');if(!input)return;
    const raws=parseTypes(input.value);if(!raws.length)return toast('请输入产品类型');
    for(const raw of raws)ensureEditorTypeSelected(wrap,raw);
    input.value='';
  }
  function enhanceEditor(){
    const wrap=document.querySelector('[data-app-meta-editor]');if(!wrap||wrap.dataset.customTypesEnhanced==='1')return;
    const field=wrap.querySelector('.wobbin-meta-type-field'),box=wrap.querySelector('.wobbin-meta-types');if(!field||!box)return;
    wrap.dataset.customTypesEnhanced='1';
    const selected=currentPageTypes();selected.forEach(registerCustomType);
    const selectedSet=new Set(selected.filter(type=>!builtinType(type)));
    for(const type of customTypes())makeEditorCustomButton(wrap,type,[...selectedSet].some(x=>sameType(x,type)));
    field.insertAdjacentHTML('beforeend',addControl('editor'));
    wrap.querySelector('[data-add-edit-product-type]')?.addEventListener('click',()=>addEditorTypes(wrap));
    wrap.querySelector('#edit-custom-product-type')?.addEventListener('keydown',event=>{if(event.key!=='Enter')return;event.preventDefault();addEditorTypes(wrap)});
  }

  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-edit-app-meta]'))setTimeout(enhanceEditor,0);
  });

  async function seedFromMetadata(){
    try{
      const res=await fetch(META_URL,{cache:'no-store'}),data=await res.json().catch(()=>({}));if(!res.ok)return;
      let changed=false;
      for(const row of data.apps||[])for(const type of Array.isArray(row.app_types)?row.app_types:[]){
        const clean=cleanType(type);if(!clean||builtinType(clean))continue;
        const before=customTypes().length;registerCustomType(clean);if(customTypes().length!==before)changed=true;
      }
      if(changed&&S.upload)render();
    }catch(error){console.warn('Custom product type metadata seed failed',error)}
  }
  function ensureStyles(){
    if(document.getElementById('wobbin-custom-product-types-style'))return;
    const style=document.createElement('style');style.id='wobbin-custom-product-types-style';style.textContent=`
      .wobbin-custom-type-add{display:flex;gap:8px;margin-top:10px}.wobbin-custom-type-add input{flex:1;min-width:0;height:38px!important;padding:0 11px!important;border:1px solid var(--line,#383838)!important;border-radius:10px!important;background:var(--panel2,#222)!important;color:var(--text,#fff)!important;outline:none!important}.wobbin-custom-type-add input:focus{border-color:#666!important}.wobbin-custom-type-add button{height:38px!important;flex:0 0 auto;padding:0 13px!important}.wobbin-custom-type-help{display:block;margin-top:6px;color:var(--muted,#888);font-size:10px;line-height:1.45}.wobbin-meta-type-field .wobbin-custom-type-add{margin-top:3px}
      @media(max-width:520px){.wobbin-custom-type-add{display:grid;grid-template-columns:1fr auto}}
    `;document.head.append(style);
  }

  ensureStyles();seedFromMetadata();
})();
