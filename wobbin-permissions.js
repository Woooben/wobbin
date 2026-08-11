'use strict';

/* Public visitors can browse/search/upload. Destructive actions stay admin-only. */
const WOBBIN_PUBLIC_UPLOAD_ACTIONS=new Set(['upload-capabilities','prepare-upload-batch','finalize-upload-batch','import-screen']);
const WOBBIN_PERMISSIONS={admin:false,checked:false};
const __wobbinProtectedAdminFetch=adminFetch;

function wobbinPayloadAction(payload,{form=false}={}){
  if(form&&payload instanceof FormData)return String(payload.get('action')||'');
  return String(payload?.action||'');
}

async function publicCloudFetch(payload,{form=false}={}){
  const headers={};let body;
  if(form)body=payload;else{headers['Content-Type']='application/json';body=JSON.stringify(payload||{})}
  const res=await fetch(WOBBIN_ADMIN_URL,{method:'POST',headers,body});let data={};try{data=await res.json()}catch{}
  if(!res.ok)throw new Error(data.error||`云端操作失败（${res.status}）`);return data;
}

adminFetch=async function(payload,opts={}){
  const action=wobbinPayloadAction(payload,opts);
  if(WOBBIN_PUBLIC_UPLOAD_ACTIONS.has(action))return publicCloudFetch(payload,opts);
  if(action==='discard-upload-batch'&&!WOBBIN_PERMISSIONS.admin)return {ok:true,deleted:0};
  return __wobbinProtectedAdminFetch(payload,opts);
};
validateAdmin=async function(){return publicCloudFetch({action:'upload-capabilities'})};

async function checkAdminKeySilently(key){
  if(!key)return false;
  try{const res=await fetch(WOBBIN_ADMIN_URL,{method:'POST',headers:{'Content-Type':'application/json','x-wobbin-key':key},body:JSON.stringify({action:'ping'})});return res.ok}catch{return false}
}
function clearAdminQuery(){try{const u=new URL(location.href);if(!u.searchParams.has('admin'))return;u.searchParams.delete('admin');history.replaceState(null,'',u.pathname+(u.search||'')+(u.hash||''))}catch{}}
async function initWobbinPermissions(){
  let saved='';try{saved=localStorage.getItem(WOBBIN_ADMIN_KEY_STORE)||''}catch{}
  const params=new URLSearchParams(location.search),wantsAdmin=params.get('admin')==='1';
  if(wantsAdmin){
    const entered=prompt('请输入 Wobbin 管理员口令');clearAdminQuery();
    if(entered&&await checkAdminKeySilently(entered.trim())){try{localStorage.setItem(WOBBIN_ADMIN_KEY_STORE,entered.trim())}catch{};WOBBIN_PERMISSIONS.admin=true;toast('管理员模式已开启')}
    else if(entered){try{localStorage.removeItem(WOBBIN_ADMIN_KEY_STORE)}catch{};toast('管理员口令不正确')}
  }else if(saved){WOBBIN_PERMISSIONS.admin=await checkAdminKeySilently(saved);if(!WOBBIN_PERMISSIONS.admin){try{localStorage.removeItem(WOBBIN_ADMIN_KEY_STORE)}catch{}}}
  WOBBIN_PERMISSIONS.checked=true;render();
}
function applyWobbinPermissionUI(){
  if(WOBBIN_PERMISSIONS.admin)return;
  if(S.batchMode){S.batchMode=false;S.batchSelected?.clear?.()}if(S.coverPicker)S.coverPicker=null;
  const selectors=['[data-cover-app]','#set-cover-current','[data-delete-app]','[data-delete-current-app]','[data-delete-screen]','[data-preview-delete]','[data-batch-toggle]','[data-batch-delete]','[data-migrate-oss]','.batch-toolbar','.delete-package-btn','.screen-delete-btn','.preview-delete','[data-edit-app-meta]'];
  document.querySelectorAll(selectors.join(',')).forEach(el=>el.remove());document.querySelectorAll('.card-actions').forEach(el=>{if(!el.children.length)el.remove()});document.getElementById('cover-bg')?.remove();
}
const __wobbinPermissionsRender=render;
render=function(){__wobbinPermissionsRender();queueMicrotask(()=>queueMicrotask(applyWobbinPermissionUI))};
queueMicrotask(applyWobbinPermissionUI);initWobbinPermissions();

(function loadWobbinTags(){if(document.querySelector('script[data-wobbin-tags]'))return;const script=document.createElement('script');script.src='./wobbin-tags.js';script.dataset.wobbinTags='1';document.body.append(script)})();
(function loadWobbinUiElements(){if(document.querySelector('script[data-wobbin-ui-elements]'))return;const script=document.createElement('script');script.src='./wobbin-ui-elements.js';script.dataset.wobbinUiElements='1';document.body.append(script)})();
(function loadWobbinLibrary(){if(document.querySelector('script[data-wobbin-library]'))return;const script=document.createElement('script');script.src='./wobbin-library.js';script.dataset.wobbinLibrary='1';document.body.append(script)})();
(function loadWobbinSearchPanel(){if(document.querySelector('script[data-wobbin-search-panel]'))return;const script=document.createElement('script');script.src='./wobbin-search-panel.js';script.dataset.wobbinSearchPanel='1';document.body.append(script)})();
(function loadWobbinDetailIconFix(){if(document.querySelector('script[data-wobbin-detail-icon-fix]'))return;const script=document.createElement('script');script.src='./wobbin-detail-icon-fix.js';script.dataset.wobbinDetailIconFix='1';document.body.append(script)})();
(function loadWobbinInsights(){if(document.querySelector('script[data-wobbin-insights]'))return;const script=document.createElement('script');script.src='./wobbin-insights.js';script.dataset.wobbinInsights='1';document.body.append(script)})();
