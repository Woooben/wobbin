'use strict';

const WOBBIN_SUPABASE_URL='https://gzlenorybqyxstpwkqgf.supabase.co';
const WOBBIN_SUPABASE_KEY='sb_publishable_KJ7Sjs2Ym3eVBGv8xd7swg__t-rGDqN';
const WOBBIN_ADMIN_URL=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-admin';
const WOBBIN_ADMIN_KEY_STORE='wobbin_admin_key_v1';
const WOBBIN_CLOUD={online:false,loading:false,apps:new Map(),flows:new Map()};

/* Cloud mode uses the user's own library only; old demo packages are no longer injected. */
all=function(){return [...S.items]};

function cloudItemById(id){return S.items.find(x=>x.id===id&&x.cloud)}
function localOnlyItems(){return S.items.filter(x=>!x.cloud&&!x.demo)}

async function cloudGet(path){
  const res=await fetch(WOBBIN_SUPABASE_URL+path,{headers:{apikey:WOBBIN_SUPABASE_KEY}});
  if(!res.ok){let msg='云端读取失败';try{const j=await res.json();msg=j.message||j.error||msg}catch{}throw new Error(msg)}
  return res.json();
}

async function askAdminKey(force=false){
  if(!force){const saved=localStorage.getItem(WOBBIN_ADMIN_KEY_STORE);if(saved)return saved}
  const key=prompt('请输入 Wobbin 管理员口令');
  if(!key)throw new Error('已取消管理操作');
  return key.trim();
}

async function adminFetch(payload,{form=false,retry=true}={}){
  const key=await askAdminKey(false);
  const headers={'x-wobbin-key':key};
  let body;
  if(form){body=payload}else{headers['Content-Type']='application/json';body=JSON.stringify(payload)}
  let res=await fetch(WOBBIN_ADMIN_URL,{method:'POST',headers,body});
  if(res.status===401&&retry){
    localStorage.removeItem(WOBBIN_ADMIN_KEY_STORE);
    const next=await askAdminKey(true);
    headers['x-wobbin-key']=next;
    res=await fetch(WOBBIN_ADMIN_URL,{method:'POST',headers,body});
    if(res.ok)localStorage.setItem(WOBBIN_ADMIN_KEY_STORE,next);
  }
  let data={};try{data=await res.json()}catch{}
  if(!res.ok)throw new Error(data.error||`云端操作失败（${res.status}）`);
  localStorage.setItem(WOBBIN_ADMIN_KEY_STORE,headers['x-wobbin-key']);
  return data;
}

async function validateAdmin(){
  return adminFetch({action:'ping'});
}

function cloudRowToItem(row,appMap,flowMap){
  const app=appMap.get(row.app_id);
  const flow=flowMap.get(row.flow_id);
  return {
    id:row.id,
    title:row.name||'Screen',
    app:app?.name||'Imported App',
    flow:flow?.name||'Imported screens',
    platform:row.platform||app?.platform||'iOS',
    category:row.category||'Other',
    collection:app?.name||'Imported App',
    elements:Array.isArray(row.element_tags)&&row.element_tags.length?row.element_tags:['Cards'],
    tags:Array.isArray(row.tags)?row.tags:[],
    imageUrl:row.image_url,
    createdAt:row.created_at,
    demo:false,
    cloud:true,
    storagePath:row.storage_path||'',
    sourcePath:row.source_path||'',
  };
}

function syncCloudCovers(appRows,cloudItems){
  try{
    const c=covers();
    for(const app of appRows){
      if(!app.cover_url)continue;
      const hit=cloudItems.find(x=>x.app===app.name&&x.imageUrl===app.cover_url);
      if(hit)c[app.name]=hit.id;
    }
    localStorage.setItem(COVER_KEY,JSON.stringify(c));
  }catch{}
}

async function loadCloudLibrary({quiet=false}={}){
  if(WOBBIN_CLOUD.loading)return;
  WOBBIN_CLOUD.loading=true;
  try{
    const [appRows,flowRows,screenRows,localRows]=await Promise.all([
      cloudGet('/rest/v1/apps?select=id,name,cover_url,platform&order=created_at.desc'),
      cloudGet('/rest/v1/flows?select=id,app_id,name&order=created_at.asc'),
      cloudGet('/rest/v1/screens?select=id,app_id,flow_id,name,image_url,element_tags,platform,category,tags,storage_path,source_path,created_at&order=created_at.desc'),
      dbAll().catch(()=>[]),
    ]);
    const appMap=new Map(appRows.map(x=>[x.id,x]));
    const flowMap=new Map(flowRows.map(x=>[x.id,x]));
    WOBBIN_CLOUD.apps=appMap;
    WOBBIN_CLOUD.flows=flowMap;
    const cloudItems=screenRows.map(x=>cloudRowToItem(x,appMap,flowMap));
    const cloudIds=new Set(cloudItems.map(x=>x.id));
    const localItems=(localRows||[]).map(hydrate).filter(x=>!cloudIds.has(x.id));
    S.items=[...cloudItems,...localItems].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
    syncCloudCovers(appRows,cloudItems);
    WOBBIN_CLOUD.online=true;
    if(S.app&&!S.items.some(x=>x.app===S.app))goHome();else render();
    if(!quiet)toast(`云端已同步 · ${cloudItems.length} 张截图`);
  }catch(e){
    console.error(e);
    WOBBIN_CLOUD.online=false;
    render();
    if(!quiet)toast(e.message||'云端同步失败，已保留本机资料');
  }finally{WOBBIN_CLOUD.loading=false}
}

function appendItemToForm(form,item,file,sourcePath=''){
  form.set('action','import-screen');
  form.set('app',item.app||'Imported App');
  form.set('flow',item.flow||'Imported screens');
  form.set('platform',item.platform||'iOS');
  form.set('category',item.category||'Other');
  form.set('title',item.title||file.name||'Screen');
  form.set('elements',JSON.stringify(item.elements||[]));
  form.set('tags',JSON.stringify(item.tags||[]));
  form.set('sourcePath',sourcePath||item.sourcePath||item.title||file.name||'');
  form.set('file',file,file.name||'screen.png');
}

async function cloudUploadEntry(entry,d){
  const draft=makeItem(entry,d);
  const form=new FormData();
  appendItemToForm(form,draft,entry.file,entry.path);
  const out=await adminFetch(form,{form:true});
  return out.item;
}

importEntries=async function(){
  if(!S.entries.length)return toast('请先选择文件');
  const btn=document.getElementById('upload-submit');
  btn.disabled=true;
  const d={app:document.getElementById('up-app').value.trim(),flow:document.getElementById('up-flow').value.trim(),platform:document.getElementById('up-platform').value,category:document.getElementById('up-category').value};
  try{
    await validateAdmin();
    const added=[];
    for(let i=0;i<S.entries.length;i++){
      btn.textContent=`上传云端 ${i+1}/${S.entries.length}`;
      added.push(await cloudUploadEntry(S.entries[i],d));
    }
    S.items=[...added,...S.items];
    S.upload=false;S.entries=[];S.view='home';S.query='';
    await loadCloudLibrary({quiet:true});
    toast(`已上传云端 ${added.length} 张截图`);
  }catch(e){
    btn.disabled=false;btn.textContent='开始导入';toast(e.message||'云端导入失败');
  }
};

async function migrateLocalItems(){
  const locals=localOnlyItems();
  if(!locals.length)return toast('没有需要同步的本机截图');
  if(!confirm(`将本机 ${locals.length} 张截图上传到云端。上传成功后会从本机旧资料库移除，继续吗？`))return;
  try{
    await validateAdmin();
    let done=0;
    for(const item of locals){
      const blob=item.blob;
      if(!blob)continue;
      const ext=(blob.type||'image/png').split('/')[1]?.replace('jpeg','jpg')||'png';
      const file=blob instanceof File?blob:new File([blob],`${item.title||'screen'}.${ext}`,{type:blob.type||'image/png'});
      const form=new FormData();appendItemToForm(form,item,file,item.sourcePath||item.title||'');
      await adminFetch(form,{form:true});
      await dbDelete(item.id);
      if(item.imageUrl?.startsWith('blob:')){try{URL.revokeObjectURL(item.imageUrl)}catch{}}
      done++;toast(`正在同步本机资料 ${done}/${locals.length}`);
    }
    await loadCloudLibrary({quiet:true});
    toast(`本机资料已同步到云端 · ${done} 张`);
  }catch(e){toast(e.message||'本机资料同步失败')}
}

const __cloudLocalDeleteScreen=deleteSingleScreen;
deleteSingleScreen=async function(id,opts={}){
  const item=S.items.find(x=>x.id===id);
  if(!item)return;
  if(!item.cloud)return __cloudLocalDeleteScreen(id,opts);
  if(!opts.skipConfirm&&!confirm(`确定删除「${item.title}」这张截图吗？`))return;
  try{
    await adminFetch({action:'delete-screen',screen_id:id});
    removeCoverIfNeeded(item);
    S.items=S.items.filter(x=>x.id!==id);
    S.batchSelected?.delete(id);
    if(S.selected?.id===id)S.selected=null;
    if(!opts.deferRender){render();toast('截图已从云端删除')}
  }catch(e){if(!opts.deferRender)toast(e.message||'删除失败');else throw e}
};

const __cloudLocalDeleteApp=deleteApp;
deleteApp=async function(name){
  const items=S.items.filter(x=>x.app===name);
  const clouds=items.filter(x=>x.cloud),locals=items.filter(x=>!x.cloud&&!x.demo);
  if(!clouds.length)return __cloudLocalDeleteApp(name);
  if(!confirm(`确定删除「${name}」文件包吗？\n将同时删除其中 ${items.length} 张截图。`))return;
  try{
    await adminFetch({action:'delete-app',app_name:name});
    for(const x of locals){await dbDelete(x.id);if(x.imageUrl?.startsWith('blob:')){try{URL.revokeObjectURL(x.imageUrl)}catch{}}}
    S.items=S.items.filter(x=>x.app!==name);
    const c=covers();delete c[name];localStorage.setItem(COVER_KEY,JSON.stringify(c));
    for(const id of [...(S.batchSelected||[])])if(items.some(x=>x.id===id))S.batchSelected.delete(id);
    if(S.app===name){clearBatchState();goHome()}else render();
    toast('文件包已从云端删除');
  }catch(e){toast(e.message||'文件包删除失败')}
};

const __cloudLocalBindCover=bindCover;
bindCover=function(){
  const close=()=>{S.coverPicker=null;render()};
  document.getElementById('cover-close').onclick=close;
  document.getElementById('cover-bg').onmousedown=e=>{if(e.target.id==='cover-bg')close()};
  document.querySelectorAll('[data-cover-id]').forEach(b=>b.onclick=async()=>{
    const app=S.coverPicker,id=b.dataset.coverId,item=S.items.find(x=>x.id===id);
    try{
      if(item?.cloud)await adminFetch({action:'set-cover',screen_id:id});
      setCover(app,id);
      S.coverPicker=null;render();toast(`${app} 封面已更新${item?.cloud?'并同步云端':''}`);
    }catch(e){toast(e.message||'封面更新失败')}
  });
};

function decorateCloudUI(){
  const actions=document.querySelector('.topbar .actions');
  if(actions&&!actions.querySelector('[data-cloud-status]')){
    const status=document.createElement('span');
    status.dataset.cloudStatus='1';
    status.className='cloud-status'+(WOBBIN_CLOUD.online?'':' offline');
    status.textContent=WOBBIN_CLOUD.online?'云端已连接':'云端离线';
    actions.prepend(status);
  }
  const status=document.querySelector('[data-cloud-status]');
  if(status){status.className='cloud-status'+(WOBBIN_CLOUD.online?'':' offline');status.textContent=WOBBIN_CLOUD.online?'云端已连接':'云端离线'}

  document.querySelector('.cloud-local-note')?.remove();
  const count=localOnlyItems().length;
  if(count){
    const note=document.createElement('div');
    note.className='cloud-local-note';
    note.innerHTML=`<span>检测到 <strong>${count}</strong> 张本机旧截图</span><button type="button" data-migrate-local>同步到云端</button>`;
    document.body.append(note);
    note.querySelector('[data-migrate-local]').onclick=migrateLocalItems;
  }
}

const __cloudRender=render;
render=function(){__cloudRender();queueMicrotask(decorateCloudUI)};

window.addEventListener('online',()=>loadCloudLibrary({quiet:true}));
window.addEventListener('load',()=>setTimeout(()=>loadCloudLibrary({quiet:true}),60));
setTimeout(()=>loadCloudLibrary({quiet:true}),160);
