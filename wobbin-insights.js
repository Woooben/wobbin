'use strict';

(function bootWobbinInsights(){
  if(window.__WOBBIN_INSIGHTS_INSTALLED)return;
  if(
    typeof S==='undefined'||typeof render!=='function'||typeof currentItems!=='function'||
    typeof WOBBIN_PERMISSIONS==='undefined'||!window.__WOBBIN_LIBRARY_INSTALLED
  ){
    setTimeout(bootWobbinInsights,80);return;
  }
  window.__WOBBIN_INSIGHTS_INSTALLED=true;

  const INSIGHTS_URL=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-insights';
  const memory=new Map();
  let modalState=null;

  function unique(values){return [...new Set((values||[]).filter(Boolean).map(String))]}
  function libraryLabel(){return S.libraryMode==='shots'?'Shots':S.libraryMode==='web'?'Web':'Apps'}
  function context(){return {library_mode:S.libraryMode||'apps',query:String(S.query||''),product_type:String(S.productType||'All'),element:String(S.element||'All')}}
  function activeContextLabel(){
    const bits=[];
    if(S.productType&&S.productType!=='All')bits.push(S.productType);
    if(S.element&&S.element!=='All')bits.push(S.element);
    if(String(S.query||'').trim())bits.push('“'+String(S.query).trim()+'”');
    return bits.length?bits.join(' · '):libraryLabel()+' 全部参考';
  }
  function items(){return currentItems().filter(x=>!x.demo&&x.id&&x.imageUrl)}
  function rows(list,getter,limit=8){
    const counts=new Map();
    for(const item of list){for(const value of unique(getter(item))){counts.set(value,(counts.get(value)||0)+1)}}
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'en')).slice(0,limit).map(([name,count])=>({name,count,percent:Math.round(count/list.length*100)}));
  }
  function stats(list){
    const productTypes=item=>typeof window.wobbinItemProductTypes==='function'?window.wobbinItemProductTypes(item):item.appTypes||[];
    return {
      ui_elements:rows(list,x=>x.elements||[]),
      page_types:rows(list,x=>x.pageTypes||[]),
      features:rows(list,x=>x.featureTags||[]),
      product_types:rows(list,productTypes),
      apps:rows(list,x=>[x.app])
    };
  }
  function sampleItems(list,max=12){
    if(list.length<=max)return list;
    const buckets=new Map();
    for(const item of list){const key=item.app||'Other';if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(item)}
    const groups=[...buckets.values()].sort((a,b)=>b.length-a.length),out=[];let i=0;
    while(out.length<max&&groups.some(g=>g.length)){
      const group=groups[i%groups.length];
      if(group.length){const idx=Math.floor(group.length/2);out.push(group.splice(idx,1)[0])}
      i++;
    }
    return out;
  }
  async function digest(text){
    const bytes=new TextEncoder().encode(text),hash=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function buildPayload(){
    const list=items(),ctx=context(),ids=list.map(x=>String(x.id)).sort();
    const cacheKey='v1-'+await digest(JSON.stringify({ctx,ids}));
    const samples=sampleItems(list,12).map(x=>({id:x.id,title:x.title||'',app:x.app||'',image_url:x.imageUrl,elements:x.elements||[],page_types:x.pageTypes||[],features:x.featureTags||[],states:x.stateTags||[]}));
    return {cache_key:cacheKey,context:ctx,result_count:list.length,stats:stats(list),samples};
  }
  async function getCached(cacheKey){
    if(memory.has(cacheKey))return memory.get(cacheKey);
    const res=await fetch(INSIGHTS_URL+'?cache_key='+encodeURIComponent(cacheKey),{cache:'no-store'}),data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'洞察读取失败');
    if(data.data)memory.set(cacheKey,data.data);
    return data.data||null;
  }
  async function generate(payload,force=false){
    const key=localStorage.getItem(WOBBIN_ADMIN_KEY_STORE)||'';
    if(!key)throw new Error('请先进入管理员模式');
    const res=await fetch(INSIGHTS_URL,{method:'POST',headers:{'Content-Type':'application/json','x-wobbin-key':key},body:JSON.stringify({...payload,action:'generate',force})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'AI 洞察生成失败');
    memory.set(payload.cache_key,data.data);return data.data;
  }
  function escHtml(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function statPills(data){
    const groups=[['UI Elements',data?.stats?.ui_elements||[]],['Page Types',data?.stats?.page_types||[]]];
    return groups.map(([title,list])=>list.length?`<div class="wobbin-insight-stat-group"><small>${title}</small><div>${list.slice(0,5).map(x=>`<span><strong>${escHtml(x.name)}</strong><em>${x.percent}%</em></span>`).join('')}</div></div>`:'').join('');
  }
  function insightBody(row){
    const insight=row?.insight||{},patterns=Array.isArray(insight.patterns)?insight.patterns:[],opps=Array.isArray(insight.opportunities)?insight.opportunities:[],takeaways=Array.isArray(insight.takeaways)?insight.takeaways:[];
    return `<div class="wobbin-insight-summary"><small>AI DESIGN INSIGHT</small><h2>${escHtml(insight.title||'设计洞察')}</h2><p>${escHtml(insight.summary||'')}</p><div class="wobbin-insight-meta">基于 ${row.result_count||0} 张结果 · 抽样视觉分析 ${row.sample_count||0} 张 · ${escHtml(row.model||'qwen3-vl-flash')}</div></div>
      <div class="wobbin-insight-stats">${statPills(row)}</div>
      <section class="wobbin-insight-section"><h3>设计模式</h3><div class="wobbin-insight-grid">${patterns.map((x,i)=>`<article><b>0${i+1}</b><h4>${escHtml(x.title||'')}</h4><p>${escHtml(x.description||'')}</p><small>${escHtml(x.evidence||'')}</small></article>`).join('')}</div></section>
      <section class="wobbin-insight-section"><h3>可借鉴方向</h3><div class="wobbin-insight-opps">${opps.map(x=>`<article><h4>${escHtml(x.title||'')}</h4><p>${escHtml(x.description||'')}</p></article>`).join('')}</div></section>
      <section class="wobbin-insight-section"><h3>设计 Takeaways</h3><ul>${takeaways.map(x=>`<li>${escHtml(x)}</li>`).join('')}</ul></section>
      ${insight.confidence_note?`<p class="wobbin-insight-note">${escHtml(insight.confidence_note)}</p>`:''}`;
  }
  function modalMarkup(){
    if(!modalState)return '';
    const loading=modalState.status==='loading',error=modalState.status==='error',empty=modalState.status==='empty',row=modalState.row;
    return `<div class="wobbin-insight-backdrop" data-insight-backdrop><section class="wobbin-insight-modal"><header><div><span>✦</span><strong>AI 设计洞察</strong></div><div class="wobbin-insight-actions">${row&&WOBBIN_PERMISSIONS.admin?'<button data-insight-refresh>重新生成</button>':''}<button class="wobbin-insight-close" data-insight-close>×</button></div></header><main>${loading?'<div class="wobbin-insight-loading"><i></i><strong>正在分析设计模式…</strong><span>千问会结合标签统计和抽样界面生成洞察</span></div>':error?`<div class="wobbin-insight-empty"><strong>生成失败</strong><span>${escHtml(modalState.error||'请稍后重试')}</span></div>`:empty?`<div class="wobbin-insight-empty"><strong>这个范围还没有 AI 洞察</strong><span>${WOBBIN_PERMISSIONS.admin?'点击生成即可分析当前结果。':'需要管理员先生成一次，之后所有人都可以查看缓存结果。'}</span>${WOBBIN_PERMISSIONS.admin?'<button data-insight-generate>生成洞察</button>':''}</div>`:insightBody(row)}</main></section></div>`;
  }
  function mountModal(){document.querySelector('[data-insight-backdrop]')?.remove();if(!modalState)return;document.body.insertAdjacentHTML('beforeend',modalMarkup());bindModal()}
  function closeModal(){modalState=null;document.body.classList.remove('wobbin-insight-open');document.querySelector('[data-insight-backdrop]')?.remove()}
  async function openInsight(force=false){
    const list=items();if(list.length<3)return toast('至少需要 3 张截图才能生成设计洞察');
    const payload=await buildPayload();document.body.classList.add('wobbin-insight-open');modalState={status:'loading',payload,row:null};mountModal();
    try{
      let row=force?null:await getCached(payload.cache_key);
      if(!row&&WOBBIN_PERMISSIONS.admin)row=await generate(payload,force);
      modalState=row?{status:'ready',payload,row}:{status:'empty',payload,row:null};
    }catch(error){modalState={status:'error',payload,row:null,error:error instanceof Error?error.message:String(error)}}
    mountModal();
  }
  function bindModal(){
    const bg=document.querySelector('[data-insight-backdrop]');if(!bg)return;
    bg.addEventListener('mousedown',e=>{if(e.target===bg)closeModal()});
    bg.querySelector('[data-insight-close]')?.addEventListener('click',closeModal);
    bg.querySelector('[data-insight-generate]')?.addEventListener('click',async()=>{modalState.status='loading';mountModal();try{const row=await generate(modalState.payload,false);modalState={status:'ready',payload:modalState.payload,row};mountModal()}catch(error){modalState={status:'error',payload:modalState.payload,error:error instanceof Error?error.message:String(error)};mountModal()}});
    bg.querySelector('[data-insight-refresh]')?.addEventListener('click',()=>openInsight(true));
  }
  function ensureStyles(){
    if(document.getElementById('wobbin-insights-style'))return;
    const style=document.createElement('style');style.id='wobbin-insights-style';style.textContent=`
      .wobbin-insight-entry{margin:0 0 28px;padding:16px 18px;border:1px solid var(--line,#2b2b2b);border-radius:16px;background:linear-gradient(120deg,rgba(255,255,255,.035),rgba(255,255,255,.012));display:flex;align-items:center;justify-content:space-between;gap:18px}.wobbin-insight-entry>div{display:flex;align-items:center;gap:12px;min-width:0}.wobbin-insight-entry .spark{width:36px;height:36px;flex:0 0 36px;border:1px solid var(--line,#333);border-radius:11px;display:grid;place-items:center;font-size:17px}.wobbin-insight-entry strong{display:block;font-size:14px}.wobbin-insight-entry p{margin:4px 0 0;color:var(--muted,#888);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wobbin-insight-entry button{height:36px;padding:0 14px;border:1px solid var(--line,#333);border-radius:10px;background:var(--text,#fff);color:var(--bg,#111);font-size:11px;font-weight:750;cursor:pointer;white-space:nowrap}.wobbin-insight-entry button:disabled{opacity:.45;cursor:not-allowed}
      body.wobbin-insight-open{overflow:hidden}.wobbin-insight-backdrop{position:fixed;inset:0;z-index:650;background:rgba(0,0,0,.62);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px}.wobbin-insight-modal{width:min(1040px,calc(100vw - 48px));max-height:min(820px,calc(100vh - 48px));border:1px solid rgba(255,255,255,.07);border-radius:26px;background:#202020;color:#f5f5f5;overflow:hidden;display:grid;grid-template-rows:64px 1fr;box-shadow:0 30px 100px rgba(0,0,0,.55)}.wobbin-insight-modal>header{display:flex;align-items:center;justify-content:space-between;padding:0 20px 0 24px;border-bottom:1px solid rgba(255,255,255,.06)}.wobbin-insight-modal>header>div:first-child{display:flex;align-items:center;gap:10px}.wobbin-insight-modal>header span{font-size:17px}.wobbin-insight-actions{display:flex;align-items:center;gap:6px}.wobbin-insight-actions button{height:34px;border:0;border-radius:9px;background:transparent;color:#aaa;padding:0 10px;cursor:pointer}.wobbin-insight-actions button:hover{background:#303030;color:#fff}.wobbin-insight-close{font-size:24px!important}.wobbin-insight-modal>main{overflow:auto;padding:34px 38px 48px}
      .wobbin-insight-summary small{color:#777;font-size:9px;font-weight:800;letter-spacing:.12em}.wobbin-insight-summary h2{margin:8px 0 10px;font-size:28px;letter-spacing:-.035em}.wobbin-insight-summary p{margin:0;max-width:780px;color:#bdbdbd;font-size:14px;line-height:1.7}.wobbin-insight-meta{margin-top:12px;color:#666;font-size:10px}.wobbin-insight-stats{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:28px 0 36px}.wobbin-insight-stat-group{padding:16px;border:1px solid rgba(255,255,255,.055);border-radius:15px;background:#272727}.wobbin-insight-stat-group>small{color:#777;font-size:10px}.wobbin-insight-stat-group>div{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px}.wobbin-insight-stat-group span{height:30px;padding:0 10px;border-radius:9px;background:#303030;display:flex;align-items:center;gap:8px;font-size:11px}.wobbin-insight-stat-group em{color:#777;font-style:normal;font-size:9px}.wobbin-insight-section{margin-top:34px}.wobbin-insight-section>h3{margin:0 0 16px;font-size:15px}.wobbin-insight-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wobbin-insight-grid article,.wobbin-insight-opps article{padding:18px;border:1px solid rgba(255,255,255,.055);border-radius:15px;background:#262626}.wobbin-insight-grid b{color:#666;font-size:9px}.wobbin-insight-grid h4,.wobbin-insight-opps h4{margin:8px 0 8px;font-size:14px}.wobbin-insight-grid p,.wobbin-insight-opps p{margin:0;color:#aaa;font-size:12px;line-height:1.65}.wobbin-insight-grid small{display:block;margin-top:11px;color:#6f6f6f;font-size:10px;line-height:1.5}.wobbin-insight-opps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wobbin-insight-section ul{margin:0;padding:0;list-style:none;display:grid;gap:9px}.wobbin-insight-section li{padding:11px 14px;border-left:2px solid #666;background:#252525;border-radius:0 10px 10px 0;color:#c9c9c9;font-size:12px;line-height:1.55}.wobbin-insight-note{margin:28px 0 0;color:#666;font-size:10px;line-height:1.5}.wobbin-insight-loading,.wobbin-insight-empty{min-height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.wobbin-insight-loading i{width:30px;height:30px;border:2px solid #444;border-top-color:#fff;border-radius:50%;animation:wobbin-spin .8s linear infinite}.wobbin-insight-loading strong,.wobbin-insight-empty strong{margin-top:18px;font-size:17px}.wobbin-insight-loading span,.wobbin-insight-empty span{margin-top:8px;color:#777;font-size:12px}.wobbin-insight-empty button{margin-top:18px;height:38px;padding:0 15px;border:0;border-radius:10px;background:#fff;color:#111;font-weight:750;cursor:pointer}@keyframes wobbin-spin{to{transform:rotate(360deg)}}
      @media(max-width:720px){.wobbin-insight-entry{align-items:flex-start}.wobbin-insight-modal>main{padding:24px 18px 38px}.wobbin-insight-stats,.wobbin-insight-grid,.wobbin-insight-opps{grid-template-columns:1fr}.wobbin-insight-summary h2{font-size:23px}}
    `;document.head.append(style);
  }
  function mountEntry(){
    document.querySelectorAll('[data-wobbin-insight-entry]').forEach(x=>x.remove());
    if(S.view!=='home')return;
    const list=items(),main=document.querySelector('.main');if(!main)return;
    const entry=document.createElement('section');entry.className='wobbin-insight-entry';entry.dataset.wobbinInsightEntry='1';
    entry.innerHTML=`<div><span class="spark">✦</span><div><strong>AI 设计洞察</strong><p>${escHtml(activeContextLabel())} · ${list.length} 张参考 · 自动总结设计模式与可借鉴方向</p></div></div><button type="button" ${list.length<3?'disabled':''}>${list.length<3?'至少 3 张':'查看洞察'}</button>`;
    const anchor=main.querySelector('.section-head');if(anchor)anchor.before(entry);else{const nav=main.querySelector('.wobbin-shortcut-nav');nav?nav.after(entry):main.prepend(entry)}
    entry.querySelector('button')?.addEventListener('click',()=>openInsight(false));
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modalState)closeModal()});
  ensureStyles();
  const baseRender=render;render=function(){baseRender();queueMicrotask(()=>queueMicrotask(mountEntry))};
  queueMicrotask(()=>queueMicrotask(mountEntry));
})();
