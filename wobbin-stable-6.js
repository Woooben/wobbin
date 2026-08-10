'use strict';

const HIDDEN_DEMO_APPS_KEY='wobbin_hidden_demo_apps_v1';
const HIDDEN_DEMO_SCREENS_KEY='wobbin_hidden_demo_screens_v1';

function readStringSet(key){
  try{return new Set(JSON.parse(localStorage.getItem(key)||'[]'))}catch{return new Set()}
}
function writeStringSet(key,set){
  try{localStorage.setItem(key,JSON.stringify([...set]))}catch{}
}
function hiddenDemoApps(){return readStringSet(HIDDEN_DEMO_APPS_KEY)}
function hiddenDemoScreens(){return readStringSet(HIDDEN_DEMO_SCREENS_KEY)}

const __wobbinAllStable5=all;
all=function(){
  const hiddenApps=hiddenDemoApps();
  const hiddenScreens=hiddenDemoScreens();
  return [
    ...S.items,
    ...DEMO.filter(x=>!hiddenApps.has(x.app)&&!hiddenScreens.has(x.id))
  ];
};

if(typeof S.batchMode==='undefined')S.batchMode=false;
if(!(S.batchSelected instanceof Set))S.batchSelected=new Set();

function clearBatchState(){
  S.batchMode=false;
  S.batchSelected.clear();
}
function selectedVisibleScreenIds(){
  return currentItems().map(x=>x.id);
}
function toggleBatchScreen(id){
  if(S.batchSelected.has(id))S.batchSelected.delete(id);
  else S.batchSelected.add(id);
  render();
}
function selectAllVisibleScreens(){
  selectedVisibleScreenIds().forEach(id=>S.batchSelected.add(id));
  render();
}
function clearBatchSelection(){S.batchSelected.clear();render()}

function hideDemoScreen(item){
  const hidden=hiddenDemoScreens();
  hidden.add(item.id);
  writeStringSet(HIDDEN_DEMO_SCREENS_KEY,hidden);
}
function hideDemoApp(name){
  const hidden=hiddenDemoApps();
  hidden.add(name);
  writeStringSet(HIDDEN_DEMO_APPS_KEY,hidden);
}

async function deleteSingleScreen(id,opts={}){
  const own=ownScreenById(id);
  const demo=DEMO.find(x=>x.id===id);
  const item=own||demo;
  if(!item)return;
  if(!opts.skipConfirm&&!confirm(`确定删除「${item.title}」这张截图吗？`))return;
  if(own){
    await dbDelete(own.id);
    removeCoverIfNeeded(own);
    if(own.imageUrl?.startsWith('blob:')){try{URL.revokeObjectURL(own.imageUrl)}catch{}}
    S.items=S.items.filter(x=>x.id!==own.id);
  }else if(demo){
    hideDemoScreen(demo);
    removeCoverIfNeeded(demo);
  }
  S.batchSelected.delete(id);
  if(S.selected?.id===id)S.selected=null;
  if(!opts.deferRender){render();toast('截图已删除')}
}

async function deleteApp(name){
  const own=S.items.filter(x=>x.app===name);
  const demos=DEMO.filter(x=>x.app===name&&!hiddenDemoScreens().has(x.id));
  const total=own.length+demos.length;
  if(!total)return;
  if(!confirm(`确定删除「${name}」文件包吗？\n将同时删除其中 ${total} 张截图。`))return;
  for(const x of own){
    await dbDelete(x.id);
    if(x.imageUrl?.startsWith('blob:')){try{URL.revokeObjectURL(x.imageUrl)}catch{}}
  }
  S.items=S.items.filter(x=>x.app!==name);
  if(demos.length)hideDemoApp(name);
  const c=covers();delete c[name];localStorage.setItem(COVER_KEY,JSON.stringify(c));
  for(const id of [...S.batchSelected]){
    const x=own.find(v=>v.id===id)||demos.find(v=>v.id===id);
    if(x)S.batchSelected.delete(id);
  }
  if(S.app===name){clearBatchState();goHome()}
  else{render();toast('文件包已删除')}
}

async function deleteSelectedScreens(){
  const ids=[...S.batchSelected];
  if(!ids.length)return toast('请先选择截图');
  if(!confirm(`确定删除已选的 ${ids.length} 张截图吗？`))return;
  for(const id of ids)await deleteSingleScreen(id,{skipConfirm:true,deferRender:true});
  S.batchSelected.clear();
  S.batchMode=false;
  render();
  toast(`已删除 ${ids.length} 张截图`);
}

function decorateHomePackageDelete(){
  if(S.view!=='home')return;
  document.querySelectorAll('.app-card').forEach(card=>{
    const open=card.querySelector('[data-open-app]');
    const name=open?.dataset.openApp;
    const actions=card.querySelector('.card-actions');
    if(!name||!actions||actions.querySelector('[data-delete-app]'))return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='danger';
    btn.dataset.deleteApp=name;
    btn.textContent='删除';
    actions.append(btn);
  });
}
function bindHomePackageDelete(){
  document.querySelectorAll('[data-delete-app]').forEach(btn=>{
    if(btn.dataset.v6Bound==='1')return;
    btn.dataset.v6Bound='1';
    btn.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      deleteApp(btn.dataset.deleteApp);
    });
  });
}

function decorateDetailHeaderV6(){
  if(S.view!=='app'||!S.app)return;
  const head=document.querySelector('.app-head');
  if(!head)return;

  const cover=head.querySelector('#set-cover-current');
  if(cover){
    cover.classList.remove('import-btn');
    cover.classList.add('cover-subtle');
    cover.textContent='设置封面';
  }

  let group=head.querySelector('.app-head-actions');
  if(!group){
    group=document.createElement('div');
    group.className='app-head-actions';
    head.append(group);
  }

  if(cover&&cover.parentElement!==group)group.append(cover);

  let batch=group.querySelector('[data-batch-toggle]');
  if(!batch){
    batch=document.createElement('button');
    batch.type='button';
    batch.className='detail-action-btn';
    batch.dataset.batchToggle='1';
    group.append(batch);
  }
  batch.textContent=S.batchMode?'取消多选':'多选';

  let del=group.querySelector('[data-delete-current-app]');
  if(!del){
    del=document.createElement('button');
    del.type='button';
    del.className='danger-outline';
    del.dataset.deleteCurrentApp=S.app;
    del.textContent='删除文件包';
    group.append(del);
  }
  del.classList.add('delete-package-btn');
  del.textContent='删除文件包';
}

function batchToolbar(){
  let bar=document.querySelector('.batch-toolbar');
  if(!S.batchMode){bar?.remove();return}
  if(!bar){
    bar=document.createElement('div');
    bar.className='batch-toolbar';
    const anchor=document.querySelector('.quick-elements');
    if(anchor)anchor.after(bar);
    else document.querySelector('.subnav')?.after(bar);
  }
  const visible=selectedVisibleScreenIds();
  const selectedVisible=visible.filter(id=>S.batchSelected.has(id)).length;
  bar.innerHTML=`<div class="batch-toolbar-left"><strong>已选 ${S.batchSelected.size} 张</strong><span>当前结果 ${visible.length} 张</span></div><div class="batch-toolbar-actions"><button type="button" data-batch-select-all>全选当前结果</button>${selectedVisible||S.batchSelected.size?'<button type="button" data-batch-clear>清空选择</button>':''}<button type="button" class="batch-delete" data-batch-delete ${S.batchSelected.size?'':'disabled'}>删除所选</button></div>`;
}

function decorateBatchSelectors(){
  if(S.view!=='app')return;
  document.querySelectorAll('.screen-card').forEach(card=>{
    const frame=card.querySelector('[data-screen]');
    const id=frame?.dataset.screen;
    if(!frame||!id)return;
    frame.classList.toggle('batch-mode-frame',!!S.batchMode);
    let mark=frame.querySelector('[data-batch-check]');
    if(!S.batchMode){mark?.remove();return}
    if(!mark){
      mark=document.createElement('button');
      mark.type='button';
      mark.className='batch-check';
      mark.dataset.batchCheck=id;
      mark.setAttribute('aria-label','选择截图');
      frame.append(mark);
    }
    const selected=S.batchSelected.has(id);
    mark.classList.toggle('selected',selected);
    mark.innerHTML=selected?'✓':'';

    if(frame.dataset.batchCapture!=='1'){
      frame.dataset.batchCapture='1';
      frame.addEventListener('click',e=>{
        if(!S.batchMode)return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const targetId=frame.dataset.screen;
        if(targetId)toggleBatchScreen(targetId);
      },true);
    }
  });
}

function bindBatchActions(){
  document.querySelector('[data-batch-toggle]')?.addEventListener('click',e=>{
    e.preventDefault();
    S.batchMode=!S.batchMode;
    if(!S.batchMode)S.batchSelected.clear();
    render();
  });
  document.querySelector('[data-batch-select-all]')?.addEventListener('click',selectAllVisibleScreens);
  document.querySelector('[data-batch-clear]')?.addEventListener('click',clearBatchSelection);
  document.querySelector('[data-batch-delete]')?.addEventListener('click',deleteSelectedScreens);
}

function makePreviewFitScreen(){
  const modal=document.querySelector('.preview-modal');
  if(!modal)return;
  modal.classList.add('fit-screen-preview');
}

function cleanStaleBatchSelection(){
  const valid=new Set(all().map(x=>x.id));
  for(const id of [...S.batchSelected])if(!valid.has(id))S.batchSelected.delete(id);
}

function enhanceStable6(){
  cleanStaleBatchSelection();
  decorateHomePackageDelete();
  decorateDetailHeaderV6();
  batchToolbar();
  decorateBatchSelectors();
  makePreviewFitScreen();
  bindBatchActions();
  bindHomePackageDelete();
}

const __wobbinRenderStable5ForV6=render;
render=function(){
  __wobbinRenderStable5ForV6();
  queueMicrotask(enhanceStable6);
};

const __wobbinGoHomeStable5=goHome;
goHome=function(){
  clearBatchState();
  __wobbinGoHomeStable5();
};

enhanceStable6();

(function loadWobbinCloud(){
  if(document.querySelector('script[data-wobbin-cloud]'))return;
  const css=document.createElement('link');css.rel='stylesheet';css.href='./wobbin-cloud.css';css.dataset.wobbinCloud='1';document.head.append(css);
  const script=document.createElement('script');script.src='./wobbin-cloud.js';script.dataset.wobbinCloud='1';document.body.append(script);
})();
