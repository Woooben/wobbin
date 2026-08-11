'use strict';

(function bootWobbinPackageMeta(){
  if(window.__WOBBIN_PACKAGE_META_INSTALLED)return;
  if(typeof render!=='function'||typeof S==='undefined'||typeof WOBBIN_PERMISSIONS==='undefined'||typeof WOBBIN_SUPABASE_URL==='undefined'){
    setTimeout(bootWobbinPackageMeta,80);
    return;
  }
  window.__WOBBIN_PACKAGE_META_INSTALLED=true;

  const META_URL=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-app-meta';
  const META={loaded:false,loading:false,apps:new Map()};
  let editingId='';

  function currentMeta(){
    if(S.view!=='app'||!S.app)return null;
    return [...META.apps.values()].find(x=>x.name===S.app)||null;
  }

  async function loadMeta({force=false}={}){
    if(META.loading||(!force&&META.loaded))return;
    META.loading=true;
    try{
      const res=await fetch(META_URL,{cache:'no-store'});
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||`文件包信息读取失败（${res.status}）`);
      META.apps=new Map((data.apps||[]).map(x=>[x.id,x]));
      META.loaded=true;
    }catch(error){
      console.error(error);
    }finally{
      META.loading=false;
    }
  }

  function removeDetailShortcut(){
    if(S.view!=='home')document.querySelectorAll('[data-wobbin-shortcut-nav],.wobbin-shortcut-nav').forEach(el=>el.remove());
  }

  function ensureDescription(){
    if(S.view!=='app')return;
    const meta=currentMeta();
    const titleWrap=document.querySelector('.app-title > div:last-child');
    if(!titleWrap)return;
    let desc=titleWrap.querySelector('[data-app-description]');
    if(!desc){
      desc=document.createElement('p');
      desc.dataset.appDescription='1';
      desc.className='wobbin-app-description';
      titleWrap.append(desc);
    }
    const text=String(meta?.description||'').trim();
    desc.textContent=text||(WOBBIN_PERMISSIONS.admin?'暂无描述，可点击“编辑信息”添加':'');
    desc.classList.toggle('is-empty',!text);
    if(!text&&!WOBBIN_PERMISSIONS.admin)desc.hidden=true;else desc.hidden=false;
  }

  function ensureEditButton(){
    if(S.view!=='app'||!WOBBIN_PERMISSIONS.admin)return;
    const head=document.querySelector('.app-head');
    if(!head)return;
    let group=head.querySelector('.app-head-actions');
    if(!group){
      group=document.createElement('div');
      group.className='app-head-actions';
      head.append(group);
    }
    if(group.querySelector('[data-edit-app-meta]'))return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='detail-action-btn wobbin-edit-meta-btn';
    btn.dataset.editAppMeta='1';
    btn.textContent='编辑信息';
    group.prepend(btn);
    btn.addEventListener('click',openEditor);
  }

  function removeEditor(){
    document.querySelector('[data-app-meta-editor]')?.remove();
    editingId='';
  }

  function openEditor(){
    const meta=currentMeta();
    if(!meta)return toast('文件包信息还在加载，请稍后再试');
    removeEditor();
    editingId=meta.id;
    const wrap=document.createElement('div');
    wrap.className='backdrop';
    wrap.dataset.appMetaEditor='1';
    wrap.innerHTML=`<section class="modal wobbin-meta-modal">
      <header class="modal-head"><div><small>PACKAGE INFO</small><h2>编辑文件包信息</h2></div><button class="modal-close" type="button" data-app-meta-close>×</button></header>
      <div class="wobbin-meta-form">
        <label><span>文件包名称</span><input type="text" maxlength="160" data-app-meta-name value="${attr(meta.name||'')}"></label>
        <label><span>描述</span><textarea maxlength="800" rows="5" data-app-meta-description placeholder="例如：旅行住宿预订产品，包含搜索、房源详情、预订与消息等页面。">${esc(meta.description||'')}</textarea><em data-app-meta-count>${String(meta.description||'').length}/800</em></label>
      </div>
      <footer class="modal-foot"><button type="button" class="secondary" data-app-meta-cancel>取消</button><button type="button" class="primary" data-app-meta-save>保存</button></footer>
    </section>`;
    document.body.append(wrap);
    const name=wrap.querySelector('[data-app-meta-name]');
    const description=wrap.querySelector('[data-app-meta-description]');
    const count=wrap.querySelector('[data-app-meta-count]');
    description?.addEventListener('input',()=>{if(count)count.textContent=`${description.value.length}/800`});
    wrap.querySelector('[data-app-meta-close]')?.addEventListener('click',removeEditor);
    wrap.querySelector('[data-app-meta-cancel]')?.addEventListener('click',removeEditor);
    wrap.addEventListener('mousedown',e=>{if(e.target===wrap)removeEditor()});
    wrap.querySelector('[data-app-meta-save]')?.addEventListener('click',saveEditor);
    setTimeout(()=>name?.focus(),0);
  }

  async function appMetaAdminFetch(payload){
    const key=await askAdminKey(false);
    const res=await fetch(META_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','x-wobbin-key':key},
      body:JSON.stringify(payload)
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      if(res.status===401){
        try{localStorage.removeItem(WOBBIN_ADMIN_KEY_STORE)}catch{}
        throw new Error('管理员权限已失效，请重新进入管理员模式');
      }
      throw new Error(data.error||`保存失败（${res.status}）`);
    }
    return data;
  }

  async function saveEditor(){
    const wrap=document.querySelector('[data-app-meta-editor]');
    if(!wrap||!editingId)return;
    const name=String(wrap.querySelector('[data-app-meta-name]')?.value||'').trim();
    const description=String(wrap.querySelector('[data-app-meta-description]')?.value||'').trim();
    if(!name)return toast('文件包名称不能为空');
    const save=wrap.querySelector('[data-app-meta-save]');
    if(save){save.disabled=true;save.textContent='保存中…'}
    const oldName=S.app;
    try{
      const data=await appMetaAdminFetch({action:'update-app',app_id:editingId,name,description});
      const updated=data.app;
      if(updated)META.apps.set(updated.id,updated);
      S.app=updated?.name||name;
      removeEditor();
      if(typeof loadCloudLibrary==='function')await loadCloudLibrary({quiet:true});
      await loadMeta({force:true});
      render();
      toast(oldName!==S.app?'文件包名称和描述已更新':'文件包描述已更新');
    }catch(error){
      if(save){save.disabled=false;save.textContent='保存'}
      toast(error instanceof Error?error.message:'保存失败');
    }
  }

  function ensureStyles(){
    if(document.getElementById('wobbin-package-meta-style'))return;
    const style=document.createElement('style');
    style.id='wobbin-package-meta-style';
    style.textContent=`
      .wobbin-app-description{margin:8px 0 0!important;max-width:680px;color:var(--muted,#8f8f8f);font-size:12px;line-height:1.55}
      .wobbin-app-description.is-empty{opacity:.72}
      .wobbin-edit-meta-btn{white-space:nowrap}
      .wobbin-meta-modal{width:min(560px,calc(100vw - 32px))}
      .wobbin-meta-form{display:grid;gap:18px;padding:6px 24px 24px}
      .wobbin-meta-form label{display:grid;gap:8px;position:relative}
      .wobbin-meta-form label>span{font-size:12px;font-weight:650;color:var(--muted,#8f8f8f)}
      .wobbin-meta-form input,.wobbin-meta-form textarea{width:100%;border:1px solid var(--line,#343434);background:var(--panel2,#222);color:var(--text,#f5f5f5);border-radius:12px;outline:none;padding:12px 14px;font:inherit}
      .wobbin-meta-form input{height:44px}
      .wobbin-meta-form textarea{resize:vertical;min-height:116px;line-height:1.55;padding-bottom:30px}
      .wobbin-meta-form input:focus,.wobbin-meta-form textarea:focus{border-color:#666}
      .wobbin-meta-form em{position:absolute;right:11px;bottom:9px;color:var(--muted,#8f8f8f);font-size:10px;font-style:normal}
    `;
    document.head.append(style);
  }

  function enhance(){
    ensureStyles();
    removeDetailShortcut();
    ensureDescription();
    ensureEditButton();
  }

  const baseRender=render;
  render=function(){
    baseRender();
    queueMicrotask(()=>queueMicrotask(enhance));
  };

  loadMeta().then(()=>render());
  enhance();
})();
