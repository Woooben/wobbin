'use strict';

const WOBBIN_SUPABASE_URL='https://gzlenorybqyxstpwkqgf.supabase.co';
const WOBBIN_ADMIN_URL=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-admin';
const WOBBIN_ADMIN_KEY_STORE='wobbin_admin_key_v1';
const WOBBIN_CLOUD={online:false,loading:false,apps:new Map(),flows:new Map()};

/* Cloud mode uses the user's own library only; old demo packages are no longer injected. */
all=function(){return [...S.items]};

function cloudItemById(id){return S.items.find(x=>x.id===id&&x.cloud)}
function localOnlyItems(){return S.items.filter(x=>!x.cloud&&!x.demo)}
function legacyCloudItems(){return S.items.filter(x=>x.cloud&&x.storageProvider!=='oss')}

async function cloudLibrary(){
  const res=await fetch(WOBBIN_ADMIN_URL+'?action=library',{cache:'no-store'});
  let data={};try{data=await res.json()}catch{}
  if(!res.ok)throw new Error(data.error||'云端读取失败');
  return data;
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

async function validateAdmin(){return adminFetch({action:'ping'})}

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
    storageProvider:row.storage_provider||'supabase',
    sourcePath:row.source_path||'',
  };
}

function syncCloudCovers(appRows,cloudItems){
  try{
    const c=covers();
    for(const app of appRows){
      if(!app.cover_screen_id)continue;
      const hit=cloudItems.find(x=>x.id===app.cover_screen_id);
      if(hit)c[app.name]=hit.id;
    }
    localStorage.setItem(COVER_KEY,JSON.stringify(c));
  }catch{}
}

async function loadCloudLibrary({quiet=false}={}){
  if(WOBBIN_CLOUD.loading)return;
  WOBBIN_CLOUD.loading=true;
  try{
    const [library,localRows]=await Promise.all([cloudLibrary(),dbAll().catch(()=>[])]);
    const appRows=library.apps||[],flowRows=library.flows||[],screenRows=library.screens||[];
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

function selectedCloudUploadLogo(){
  const input=document.getElementById('up-app-logo');
  const file=input?.files?.[0];
  if(!file)return null;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('App 产品 Logo 仅支持 PNG、JPG、WebP');
  if(file.size>5*1024*1024)throw new Error('App 产品 Logo 不能超过 5MB');
  return file;
}

async function uploadCloudPackageLogo(appName,file){
  if(!file)return false;
  if(typeof window.wobbinUploadAppLogo!=='function')throw new Error('Logo 上传模块尚未加载，请刷新页面后重试');
  const library=await cloudLibrary();
  const app=[...(library.apps||[])].find(x=>x.name===appName);
  if(!app?.id)throw new Error(`未找到「${appName}」文件包，Logo 暂未设置`);
  await window.wobbinUploadAppLogo(app.id,file);
  return true;
}

importEntries=async function(){
  if(!S.entries.length)return toast('请先选择文件');
  const btn=document.getElementById('upload-submit');
  btn.disabled=true;
  const d={app:document.getElementById('up-app').value.trim(),flow:document.getElementById('up-flow').value.trim(),platform:document.getElementById('up-platform').value,category:document.getElementById('up-category').value};
  const logoFile=selectedCloudUploadLogo();
  try{
    const mode=await validateAdmin();
    const added=[];
    for(let i=0;i<S.entries.length;i++){
      btn.textContent=`上传云端 ${i+1}/${S.entries.length}`;
      added.push(await cloudUploadEntry(S.entries[i],d));
    }
    if(logoFile){
      btn.textContent='正在设置产品 Logo…';
      await uploadCloudPackageLogo(d.app||'Imported App',logoFile);
    }
    S.items=[...added,...S.items];
    S.upload=false;S.entries=[];S.view='home';S.query='';
    await loadCloudLibrary({quiet:true});
    toast(logoFile?`已上传 ${added.length} 张 · ${d.app||'Imported App'} · Logo 已设置`:`已上传 ${added.length} 张 · ${mode.storage==='aliyun-oss'?'阿里云 OSS':'云端'}`);
  }catch(e){
    btn.disabled=false;btn.textContent='开始导入';toast(e.message||'云端导入失败');
  }
};

async function migrateLocalItems(){
  const locals=localOnlyItems();
  if(!locals.length)return toast('没有需要同步的本机截图');
  if(!confirm(`将本机 ${locals.length} 张截图上传到云端。上传成功后会从本机旧资料库移除，继续吗？`))return;
  try{
    const mode=await validateAdmin();
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
    toast(`已同步 ${done} 张 · ${mode.storage==='aliyun-oss'?'阿里云 OSS':'云端'}`);
  }catch(e){toast(e.message||'本机资料同步失败')}
}

async function migrateExistingCloudToOss(){
  const startCount=legacyCloudItems().length;
  if(!startCount)return toast('现有云端截图已经全部在 OSS');
  if(!confirm(`将现有 ${startCount} 张 Supabase Storage 截图迁移到阿里云 OSS。迁移成功后会删除 Supabase 中对应原图，继续吗？`))return;
  try{
    const mode=await validateAdmin();
    if(mode.storage!=='aliyun-oss')throw new Error('OSS 尚未连接，请检查 Supabase Secrets');
    let total=0,stalled=0;
    while(true){
      const out=await adminFetch({action:'migrate-storage-batch',limit:10});
      total+=Number(out.migrated||0);
      const remaining=Number(out.remaining||0);
      toast(`迁移到 OSS · 已完成 ${total} 张 · 剩余 ${remaining} 张`);
      if(!remaining)break;
      if(!out.migrated){
        stalled++;
        if(stalled>=2){
          const first=out.failed?.[0]?.error||'部分图片迁移失败';
          throw new Error(first);
        }
      }else stalled=0;
      await new Promise(r=>setTimeout(r,220));
    }
    await loadCloudLibrary({quiet:true});
    toast(`迁移完成 · ${total} 张已转入阿里云 OSS`);
  }catch(e){
    await loadCloudLibrary({quiet:true}).catch(()=>{});
    toast(e.message||'OSS 迁移失败');
  }
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
  const legacyCount=legacyCloudItems().length;
  const localCount=localOnlyItems().length;
  if(legacyCount){
    const note=document.createElement('div');
    note.className='cloud-local-note';
    note.innerHTML=`<span>有 <strong>${legacyCount}</strong> 张截图仍在 Supabase Storage</span><button type="button" data-migrate-oss>迁移到 OSS</button>`;
    document.body.append(note);
    note.querySelector('[data-migrate-oss]').onclick=migrateExistingCloudToOss;
  }else if(localCount){
    const note=document.createElement('div');
    note.className='cloud-local-note';
    note.innerHTML=`<span>检测到 <strong>${localCount}</strong> 张本机旧截图</span><button type="button" data-migrate-local>同步到云端</button>`;
    document.body.append(note);
    note.querySelector('[data-migrate-local]').onclick=migrateLocalItems;
  }
}

const __cloudRender=render;
render=function(){__cloudRender();queueMicrotask(decorateCloudUI)};

window.addEventListener('online',()=>loadCloudLibrary({quiet:true}));
window.addEventListener('load',()=>setTimeout(()=>loadCloudLibrary({quiet:true}),60));
setTimeout(()=>loadCloudLibrary({quiet:true}),160);
setInterval(()=>loadCloudLibrary({quiet:true}),45*60*1000);
