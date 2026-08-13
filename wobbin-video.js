'use strict';

/* Wobbin video media enhancement.
 * Video items use the existing imageUrl field; no data model migration is required.
 * Autoplay is intentionally muted + inline so browsers allow it without user interaction.
 */
function wobbinIsVideoItem(item){
  if(!item)return false;
  const type=String(item.mediaType||item.fileType||item.mimeType||'').toLowerCase();
  if(type.includes('video'))return true;
  const url=String(item.imageUrl||item.url||item.src||'').split('?')[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|ogg)$/i.test(url);
}

function wobbinVideoSrc(item){
  return item?.imageUrl||item?.url||item?.src||'';
}

function wobbinEnsureVideoStyles(){
  if(document.getElementById('wobbin-video-style'))return;
  const style=document.createElement('style');
  style.id='wobbin-video-style';
  style.textContent=`
    .wobbin-video-media{display:block;width:100%;height:100%;object-fit:cover;background:#111}
    video.wobbin-video-media{border:0;outline:0}
    .wobbin-video-badge{position:absolute;right:10px;bottom:10px;z-index:3;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.58);color:#fff;font-size:11px;line-height:1;pointer-events:none;backdrop-filter:blur(8px)}
    .wobbin-video-badge::before{content:'▶';transform:translateX(1px)}
    .wobbin-video-media::-webkit-media-controls{display:none!important}
  `;
  document.head.appendChild(style);
}

function wobbinMountVideo(container,item){
  if(!container||!wobbinIsVideoItem(item))return false;
  const src=wobbinVideoSrc(item);
  if(!src)return false;
  if(container.querySelector('video.wobbin-video-media'))return true;
  const existing=container.querySelector('img');
  if(existing)existing.remove();
  const video=document.createElement('video');
  video.className='wobbin-video-media';
  video.src=src;
  video.autoplay=true;
  video.muted=true;
  video.defaultMuted=true;
  video.loop=true;
  video.playsInline=true;
  video.setAttribute('autoplay','');
  video.setAttribute('muted','');
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');
  video.setAttribute('preload','metadata');
  video.setAttribute('aria-label',item.title||'视频案例');
  video.addEventListener('loadedmetadata',()=>{video.play().catch(()=>{});},{once:true});
  container.appendChild(video);
  if(getComputedStyle(container).position==='static')container.style.position='relative';
  if(!container.querySelector('.wobbin-video-badge')){
    const badge=document.createElement('span');
    badge.className='wobbin-video-badge';
    badge.setAttribute('aria-hidden','true');
    container.appendChild(badge);
  }
  requestAnimationFrame(()=>video.play().catch(()=>{}));
  return true;
}

function wobbinHydrateVideos(){
  if(typeof all!=='function')return;
  wobbinEnsureVideoStyles();
  const items=all();
  const byId=new Map(items.map(x=>[String(x.id),x]));

  document.querySelectorAll('[data-screen]').forEach(frame=>{
    const item=byId.get(String(frame.dataset.screen));
    if(item)wobbinMountVideo(frame,item);
  });

  if(typeof S!=='undefined'&&S.selected){
    const item=byId.get(String(S.selected.id))||S.selected;
    if(wobbinIsVideoItem(item)){
      const modal=document.querySelector('.preview-modal');
      const media=modal?.querySelector('.preview-media,.preview-stage,.modal-body');
      if(media)wobbinMountVideo(media,item);
    }
  }
}

const __wobbinVideoRender=typeof render==='function'?render:null;
if(__wobbinVideoRender){
  render=function(){
    __wobbinVideoRender();
    queueMicrotask(wobbinHydrateVideos);
  };
}

wobbinHydrateVideos();
