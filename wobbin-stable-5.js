'use strict';

const APP_LOGO_CACHE_KEY='wobbin_app_logo_cache_v1';
const APP_LOGO_MISS_TTL=1000*60*60*24*3;

function logoCache(){
  try{return JSON.parse(localStorage.getItem(APP_LOGO_CACHE_KEY)||'{}')}catch{return{}}
}
function saveLogoCache(cache){
  try{localStorage.setItem(APP_LOGO_CACHE_KEY,JSON.stringify(cache))}catch{}
}
function normalizeAppName(v){
  return String(v||'').toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g,' ').replace(/[^a-z0-9\u4e00-\u9fff]+/g,'').trim();
}
function pickBestLogo(name,results){
  const q=normalizeAppName(name);
  let best=null,bestScore=-1;
  for(const r of results||[]){
    const n=normalizeAppName(r.trackName||'');
    const seller=normalizeAppName(r.sellerName||'');
    let score=0;
    if(n===q)score=100;
    else if(n&&q&&(n.includes(q)||q.includes(n)))score=82;
    else if(seller&&q&&(seller.includes(q)||q.includes(seller)))score=58;
    const delta=Math.abs((n||'').length-q.length);
    score-=Math.min(delta,20)*0.5;
    if(score>bestScore){bestScore=score;best=r}
  }
  if(!best||bestScore<35)return null;
  return best.artworkUrl512||best.artworkUrl100||best.artworkUrl60||null;
}
function itunesSearch(name,country='us'){
  return new Promise((resolve,reject)=>{
    const cb='__wobbinItunes_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    const timer=setTimeout(()=>finish(new Error('timeout')),7000);
    let done=false;
    function finish(err,data){
      if(done)return;done=true;clearTimeout(timer);try{delete window[cb]}catch{};script.remove();err?reject(err):resolve(data||[]);
    }
    window[cb]=data=>finish(null,data?.results||[]);
    script.onerror=()=>finish(new Error('network'));
    script.src=`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=software&limit=8&country=${encodeURIComponent(country)}&callback=${encodeURIComponent(cb)}`;
    document.head.appendChild(script);
  });
}
async function resolveAppLogo(name){
  const key=normalizeAppName(name);
  if(!key)return null;
  const cache=logoCache();
  const hit=cache[key];
  if(hit?.url)return hit.url;
  if(hit?.miss&&Date.now()-hit.miss<APP_LOGO_MISS_TTL)return null;
  for(const country of ['us','cn']){
    try{
      const results=await itunesSearch(name,country);
      const url=pickBestLogo(name,results);
      if(url){cache[key]={url,at:Date.now()};saveLogoCache(cache);return url}
    }catch{}
  }
  cache[key]={miss:Date.now()};saveLogoCache(cache);return null;
}
function appLogoTargets(){
  const out=[];
  document.querySelectorAll('.app-card').forEach(card=>{
    const name=card.querySelector('[data-open-app]')?.dataset.openApp;
    const icon=card.querySelector('.card-info .app-icon');
    if(name&&icon)out.push({name,icon});
  });
  if(S.view==='app'&&S.app){
    const icon=document.querySelector('.app-title .app-icon');
    if(icon)out.push({name:S.app,icon});
  }
  return out;
}
async function hydrateRealAppLogos(){
  const targets=appLogoTargets();
  await Promise.all(targets.map(async({name,icon})=>{
    if(icon.dataset.logoLoaded==='1')return;
    icon.dataset.logoLoaded='1';
    const url=await resolveAppLogo(name);
    if(!url||!icon.isConnected)return;
    icon.innerHTML=`<img src="${attr(url)}" alt="${attr(name)} logo" loading="lazy" referrerpolicy="no-referrer">`;
    icon.classList.add('has-logo');
  }));
}

function ownScreenById(id){return S.items.find(x=>x.id===id)}
function removeCoverIfNeeded(item){
  const c=covers();
  if(c[item.app]===item.id){delete c[item.app];localStorage.setItem(COVER_KEY,JSON.stringify(c))}
}
async function deleteSingleScreen(id){
  const item=ownScreenById(id);
  if(!item)return toast('演示截图不可删除');
  if(!confirm(`确定删除「${item.title}」这张截图吗？`))return;
  await dbDelete(item.id);
  removeCoverIfNeeded(item);
  if(item.imageUrl?.startsWith('blob:')){try{URL.revokeObjectURL(item.imageUrl)}catch{}}
  S.items=S.items.filter(x=>x.id!==item.id);
  if(S.selected?.id===item.id)S.selected=null;
  render();
  toast('截图已删除');
}
function decorateScreenDeleteButtons(){
  document.querySelectorAll('.screen-card').forEach(card=>{
    const frame=card.querySelector('[data-screen]');
    const id=frame?.dataset.screen;
    if(!id||!ownScreenById(id)||card.querySelector('[data-delete-screen]'))return;
    frame.classList.add('screen-frame-actions');
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='screen-delete-btn';
    btn.dataset.deleteScreen=id;
    btn.title='删除截图';
    btn.setAttribute('aria-label','删除截图');
    btn.innerHTML='×';
    frame.appendChild(btn);
  });
}
function decoratePreviewDelete(){
  if(!S.selected||!ownScreenById(S.selected.id))return;
  const head=document.querySelector('.preview-modal .modal-head');
  if(!head||head.querySelector('[data-preview-delete]'))return;
  const close=head.querySelector('#preview-close');
  const wrap=document.createElement('div');
  wrap.className='preview-actions';
  const del=document.createElement('button');
  del.type='button';
  del.className='preview-delete';
  del.dataset.previewDelete=S.selected.id;
  del.textContent='删除截图';
  if(close){close.before(wrap);wrap.append(del);wrap.append(close)}else wrap.append(del);
}
function decorateDetailDeleteApp(){
  if(S.view!=='app'||!S.app||!S.items.some(x=>x.app===S.app))return;
  const head=document.querySelector('.app-head');
  if(!head||head.querySelector('[data-delete-current-app]'))return;
  const cover=head.querySelector('#set-cover-current');
  const group=document.createElement('div');
  group.className='app-head-actions';
  const del=document.createElement('button');
  del.type='button';
  del.className='danger-outline';
  del.dataset.deleteCurrentApp=S.app;
  del.textContent='删除文件包';
  if(cover){cover.before(group);group.append(cover);group.append(del)}else{group.append(del);head.append(group)}
}
function bindStable5Actions(){
  document.querySelectorAll('[data-delete-screen]').forEach(btn=>{
    btn.onclick=e=>{e.preventDefault();e.stopPropagation();deleteSingleScreen(btn.dataset.deleteScreen)};
  });
  document.querySelector('[data-preview-delete]')?.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();deleteSingleScreen(e.currentTarget.dataset.previewDelete);
  });
  document.querySelector('[data-delete-current-app]')?.addEventListener('click',e=>{
    e.preventDefault();deleteApp(e.currentTarget.dataset.deleteCurrentApp);
  });
}
function enhanceStable5(){
  decorateScreenDeleteButtons();
  decoratePreviewDelete();
  decorateDetailDeleteApp();
  bindStable5Actions();
  hydrateRealAppLogos();
}

const __wobbinRenderStable4=render;
render=function(){
  __wobbinRenderStable4();
  queueMicrotask(enhanceStable5);
};

enhanceStable5();
