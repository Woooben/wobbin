'use strict';

/* Wobbin direct-to-OSS uploader: presigned PUT + 4-way concurrency. */
const WOBBIN_DIRECT_BATCH_SIZE=20;
const WOBBIN_DIRECT_CONCURRENCY=4;
const __wobbinCloudRelayImportEntries=importEntries;

function directProgressUI(){
  let box=document.getElementById('wobbin-direct-progress');
  if(box)return box;
  box=document.createElement('div');
  box.id='wobbin-direct-progress';
  box.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10000;width:min(520px,calc(100vw - 32px));padding:12px 14px;border:1px solid var(--line,#303030);border-radius:12px;background:var(--panel,#181818);box-shadow:0 12px 36px rgba(0,0,0,.28);font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text,#fff);display:none';
  box.innerHTML='<div data-direct-label style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px"><strong>正在直传 OSS</strong><span>0%</span></div><div style="height:6px;border-radius:999px;background:rgba(127,127,127,.22);overflow:hidden"><i data-direct-bar style="display:block;width:0;height:100%;border-radius:inherit;background:currentColor;transition:width .12s linear"></i></div>';
  document.body.append(box);
  return box;
}

function showDirectProgress(done,total,loaded,totalBytes){
  const box=directProgressUI();
  box.style.display='block';
  const pct=totalBytes?Math.max(0,Math.min(100,Math.round(loaded/totalBytes*100))):0;
  const label=box.querySelector('[data-direct-label]');
  if(label)label.innerHTML=`<strong>直传 OSS · ${done}/${total} 张</strong><span>${pct}%</span>`;
  const bar=box.querySelector('[data-direct-bar]');
  if(bar)bar.style.width=pct+'%';
}

function hideDirectProgress(){const box=document.getElementById('wobbin-direct-progress');if(box)box.style.display='none'}

function xhrPutOss(url,file,onProgress){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('PUT',url,true);
    if(file.type)xhr.setRequestHeader('Content-Type',file.type);
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(e.loaded,e.total||file.size)};
    xhr.onload=()=>{
      if(xhr.status>=200&&xhr.status<300){onProgress(file.size,file.size);resolve(xhr)}
      else reject(new Error(`OSS 上传失败（${xhr.status}）`));
    };
    xhr.onerror=()=>reject(new Error('OSS 直传被浏览器拦截或网络中断，请检查 Bucket CORS'));
    xhr.ontimeout=()=>reject(new Error('OSS 直传超时'));
    xhr.timeout=10*60*1000;
    xhr.send(file);
  });
}

async function runDirectPool(tasks,limit){
  let cursor=0;
  const workers=Array.from({length:Math.min(limit,tasks.length)},async()=>{
    while(true){
      const i=cursor++;
      if(i>=tasks.length)return;
      await tasks[i]();
    }
  });
  await Promise.all(workers);
}

function directFileMeta(entry,d){
  const draft=makeItem(entry,d);
  const file=entry.file;
  return {
    name:file.name||'screen.png',
    type:file.type||'image/png',
    size:file.size||0,
    title:draft.title||file.name||'Screen',
    sourcePath:entry.path||draft.sourcePath||draft.title||file.name||'',
    elements:draft.elements||[],
    tags:draft.tags||[],
  };
}

async function directUploadChunk(chunk,d,globalOffset,progressState){
  const prepared=await adminFetch({
    action:'prepare-upload-batch',
    app:d.app||'Imported App',
    flow:d.flow||'Imported screens',
    platform:d.platform||'iOS',
    category:d.category||'Other',
    files:chunk.map(entry=>directFileMeta(entry,d)),
  });

  const ok=[];
  const failed=[];
  const tasks=(prepared.uploads||[]).map((u,i)=>async()=>{
    const entry=chunk[i];
    const absoluteIndex=globalOffset+i;
    try{
      await xhrPutOss(u.upload_url,entry.file,(loaded)=>{
        progressState.loaded[absoluteIndex]=Math.min(entry.file.size||loaded,loaded);
        const sum=progressState.loaded.reduce((a,b)=>a+(b||0),0);
        showDirectProgress(progressState.done,progressState.total,sum,progressState.totalBytes);
      });
      progressState.loaded[absoluteIndex]=entry.file.size||0;
      progressState.done++;
      const sum=progressState.loaded.reduce((a,b)=>a+(b||0),0);
      showDirectProgress(progressState.done,progressState.total,sum,progressState.totalBytes);
      ok.push({
        screen_id:u.screen_id,
        storage_path:u.storage_path,
        title:u.title,
        source_path:u.source_path,
        elements:u.elements||[],
        tags:u.tags||[],
      });
    }catch(error){
      failed.push({path:u.storage_path,error});
    }
  });

  await runDirectPool(tasks,WOBBIN_DIRECT_CONCURRENCY);

  let finalized=[];
  if(ok.length){
    const out=await adminFetch({
      action:'finalize-upload-batch',
      app_id:prepared.app_id,
      flow_id:prepared.flow_id,
      app_name:prepared.app_name,
      flow_name:prepared.flow_name,
      platform:prepared.platform,
      category:prepared.category,
      uploads:ok,
    });
    finalized=out.items||[];
  }

  if(failed.length){
    adminFetch({action:'discard-upload-batch',paths:failed.map(x=>x.path)}).catch(()=>{});
    const first=failed[0].error;
    throw new Error(`${failed.length} 张直传失败：${first?.message||'请检查 OSS CORS 或网络'}`);
  }
  return {items:finalized,app_id:prepared.app_id,app_name:prepared.app_name};
}

function selectedUploadLogo(){
  const input=document.getElementById('up-app-logo');
  const file=input?.files?.[0];
  if(!file)return null;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('App 产品 Logo 仅支持 PNG、JPG、WebP');
  if(file.size>5*1024*1024)throw new Error('App 产品 Logo 不能超过 5MB');
  return file;
}

async function uploadPackageLogo(appId,file){
  if(!file||!appId)return false;
  if(typeof window.wobbinUploadAppLogo!=='function')throw new Error('Logo 上传模块尚未加载，请刷新页面后重试');
  await window.wobbinUploadAppLogo(appId,file);
  return true;
}

importEntries=async function(){
  if(!S.entries.length)return toast('请先选择文件');
  const btn=document.getElementById('upload-submit');
  if(!btn)return __wobbinCloudRelayImportEntries();
  btn.disabled=true;
  const originalText=btn.textContent||'开始导入';
  const d={
    app:document.getElementById('up-app').value.trim(),
    flow:document.getElementById('up-flow').value.trim(),
    platform:document.getElementById('up-platform').value,
    category:document.getElementById('up-category').value,
  };
  const logoFile=selectedUploadLogo();
  const entries=[...S.entries];
  const progressState={
    total:entries.length,
    done:0,
    totalBytes:entries.reduce((n,e)=>n+(e.file?.size||0),0),
    loaded:Array(entries.length).fill(0),
  };
  try{
    const mode=await validateAdmin();
    if(mode.storage!=='aliyun-oss'||mode.direct_upload!==true){
      btn.disabled=false;
      hideDirectProgress();
      return __wobbinCloudRelayImportEntries();
    }
    const added=[];
    let appId='',appName=d.app||'Imported App';
    showDirectProgress(0,entries.length,0,progressState.totalBytes);
    for(let start=0;start<entries.length;start+=WOBBIN_DIRECT_BATCH_SIZE){
      const chunk=entries.slice(start,start+WOBBIN_DIRECT_BATCH_SIZE);
      btn.textContent=`直传 OSS ${Math.min(start+1,entries.length)}/${entries.length}`;
      const result=await directUploadChunk(chunk,d,start,progressState);
      added.push(...result.items);
      if(!appId){appId=result.app_id||'';appName=result.app_name||appName}
      btn.textContent=`直传 OSS ${progressState.done}/${entries.length}`;
    }
    if(logoFile){
      btn.textContent='正在设置产品 Logo…';
      await uploadPackageLogo(appId,logoFile);
    }
    S.items=[...added,...S.items];
    S.upload=false;S.entries=[];S.view='home';S.query='';
    await loadCloudLibrary({quiet:true});
    hideDirectProgress();
    toast(logoFile?`已直传 ${added.length} 张 · ${appName} · Logo 已设置`:`已直传 ${added.length} 张 · 阿里云 OSS`);
  }catch(e){
    hideDirectProgress();
    btn.disabled=false;
    btn.textContent=originalText;
    await loadCloudLibrary({quiet:true}).catch(()=>{});
    toast(e.message||'OSS 直传失败');
  }
};

(function loadWobbinPermissions(){
  if(document.querySelector('script[data-wobbin-permissions]'))return;
  const script=document.createElement('script');
  script.src='./wobbin-permissions.js';
  script.dataset.wobbinPermissions='1';
  document.body.append(script);
})();
