'use strict';

/* Wobbin video media enhancement.
 * Video items reuse imageUrl and are recognized by MIME type or file extension.
 * Autoplay stays muted + inline so modern browsers allow playback without interaction.
 */
function wobbinIsVideoItem(item){
  if(!item)return false;
  const type=String(item.mediaType||item.fileType||item.mimeType||'').toLowerCase();
  if(type.includes('video'))return true;
  const path=String(item.storagePath||'').toLowerCase();
  if(/\.(mp4|webm|mov|m4v|ogg|ogv)$/i.test(path))return true;
  const url=String(item.imageUrl||item.url||item.src||'').split('?')[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|ogg|ogv)$/i.test(url);
}

function wobbinVideoSrc(item){return item?.imageUrl||item?.url||item?.src||''}

function wobbinEnsureVideoStyles(){
  if(document.getElementById('wobbin-video-style'))return;
  const style=document.createElement('style');
  style.id='wobbin-video-style';
  style.textContent=`
    .wobbin-video-media{display:block;width:100%;height:100%;object-fit:cover;background:#111}
    video.wobbin-video-media{border:0;outline:0}
    .screen-frame .wobbin-video-media{width:auto;max-width:100%;height:390px;object-fit:contain;border-radius:16px;box-shadow:0 14px 30px rgba(0,0,0,.25);background:transparent}
    .screen-frame.web .wobbin-video-media{width:100%;height:auto;max-height:390px;object-fit:contain;border-radius:9px}
    .preview-body .wobbin-video-media{width:100%;height:100%;object-fit:contain;max-height:calc(100vh - 150px);margin:auto;background:transparent}
    .cover-option .wobbin-video-media{width:100%;height:100%;object-fit:contain;background:transparent}
    .cover-image .wobbin-video-media{width:auto;height:100%;max-width:100%;object-fit:contain;border-radius:18px;box-shadow:0 16px 36px rgba(0,0,0,.28);background:#111}
    .wobbin-video-badge{position:absolute;right:10px;bottom:10px;z-index:3;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.58);color:#fff;font-size:11px;line-height:1;pointer-events:none;backdrop-filter:blur(8px)}
    .wobbin-video-badge::before{content:'▶';transform:translateX(1px)}
    .cover-option .wobbin-video-badge{right:7px;bottom:7px;width:22px;height:22px;font-size:9px}
    .wobbin-video-media::-webkit-media-controls{display:none!important}
    @media(max-width:560px){.screen-frame .wobbin-video-media{height:270px}.screen-frame.web .wobbin-video-media{height:auto;max-height:270px}}
  `;
  document.head.appendChild(style);
}

function wobbinMountVideo(container,item){
  if(!container||!wobbinIsVideoItem(item))return false;
  const src=wobbinVideoSrc(item);if(!src)return false;
  const current=container.querySelector('video.wobbin-video-media');
  if(current){current.play().catch(()=>{});return true}
  container.querySelector('img')?.remove();
  const video=document.createElement('video');
  video.className='wobbin-video-media';video.src=src;video.autoplay=true;video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
  video.setAttribute('autoplay','');video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.setAttribute('preload','metadata');video.setAttribute('aria-label',item.title||'视频案例');
  video.addEventListener('loadedmetadata',()=>{video.play().catch(()=>{})},{once:true});
  container.appendChild(video);
  if(getComputedStyle(container).position==='static')container.style.position='relative';
  if(!container.querySelector('.wobbin-video-badge')){const badge=document.createElement('span');badge.className='wobbin-video-badge';badge.setAttribute('aria-hidden','true');container.appendChild(badge)}
  requestAnimationFrame(()=>video.play().catch(()=>{}));return true;
}

function wobbinHydrateVideos(){
  if(typeof all!=='function')return;
  wobbinEnsureVideoStyles();
  const items=all(),byId=new Map(items.map(x=>[String(x.id),x]));

  document.querySelectorAll('[data-screen]').forEach(frame=>{const item=byId.get(String(frame.dataset.screen));if(item)wobbinMountVideo(frame,item)});

  document.querySelectorAll('.cover-option[data-cover-id]').forEach(option=>{
    const item=byId.get(String(option.dataset.coverId));
    if(item&&wobbinIsVideoItem(item))wobbinMountVideo(option,item);
  });

  document.querySelectorAll('.cover-wrap[data-open-app]').forEach(wrap=>{
    const name=wrap.dataset.openApp;if(!name)return;
    let item=null;
    try{const pack=typeof apps==='function'?apps().find(a=>a.name===name):null;item=pack&&typeof appCover==='function'?appCover(pack):null}catch{}
    if(!item)item=items.find(x=>x.app===name&&wobbinIsVideoItem(x));
    if(item&&wobbinIsVideoItem(item))wobbinMountVideo(wrap.querySelector('.cover-image')||wrap,item);
  });

  if(typeof S!=='undefined'&&S.selected){
    const item=byId.get(String(S.selected.id))||S.selected;
    if(wobbinIsVideoItem(item)){const modal=document.querySelector('.preview-modal');const media=modal?.querySelector('.preview-body,.preview-media,.preview-stage,.modal-body');if(media)wobbinMountVideo(media,item)}
  }
}

const __wobbinVideoRender=typeof render==='function'?render:null;
if(__wobbinVideoRender){render=function(){__wobbinVideoRender();queueMicrotask(wobbinHydrateVideos)}}
wobbinHydrateVideos();
