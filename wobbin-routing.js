'use strict';

(function installWobbinRouting(){
  if(window.__WOBBIN_ROUTING_INSTALLED)return;
  if(typeof render!=='function'||typeof S==='undefined'){
    setTimeout(installWobbinRouting,80);
    return;
  }
  window.__WOBBIN_ROUTING_INSTALLED=true;

  function detailUrl(app){
    const url=new URL(location.href);
    url.searchParams.set('app',app);
    return url.pathname+(url.search?url.search:'')+(url.hash||'');
  }
  function homeUrl(){
    const url=new URL(location.href);
    url.searchParams.delete('app');
    return url.pathname+(url.search?url.search:'')+(url.hash||'');
  }
  function resetDetailState(app){
    S.view='app';
    S.app=app;
    S.platform='All';
    S.element='All';
    S.query='';
    S.tab='screens';
    if(typeof S.productType!=='undefined')S.productType='All';
    S.selected=null;
    S.coverPicker=null;
  }
  function goDetail(app,push=true){
    if(!app)return;
    resetDetailState(app);
    if(push)history.pushState({wobbinApp:app},'',detailUrl(app));
    render();
    window.scrollTo({top:0,behavior:'auto'});
  }
  function goHomeRoute(replace=false){
    S.view='home';
    S.app=null;
    S.tab='screens';
    S.platform='All';
    S.element='All';
    S.query='';
    if(typeof S.productType!=='undefined')S.productType='All';
    S.selected=null;
    S.coverPicker=null;
    const url=homeUrl();
    if(replace)history.replaceState({},'',url);
    render();
    window.scrollTo({top:0,behavior:'auto'});
  }
  function syncFromUrl(){
    const app=new URL(location.href).searchParams.get('app');
    if(app){
      resetDetailState(app);
      render();
      window.scrollTo({top:0,behavior:'auto'});
    }else{
      goHomeRoute(false);
    }
  }

  document.addEventListener('click',e=>{
    const target=e.target.closest?.('[data-open-app]');
    if(!target)return;
    if(e.target.closest('.card-actions'))return;
    const app=target.dataset.openApp;
    if(!app)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    goDetail(app,true);
  },true);

  window.addEventListener('popstate',()=>syncFromUrl());

  const originalGoHome=goHome;
  window.goHome=function(){
    if(new URL(location.href).searchParams.has('app')){
      if(history.state?.wobbinApp===S.app){
        history.back();
        return;
      }
      history.replaceState({},'',homeUrl());
      goHomeRoute(false);
      return;
    }
    originalGoHome();
    window.scrollTo({top:0,behavior:'auto'});
  };

  const initialApp=new URL(location.href).searchParams.get('app');
  if(initialApp){
    resetDetailState(initialApp);
    render();
    window.scrollTo({top:0,behavior:'auto'});
  }else{
    history.replaceState(history.state||{},'',homeUrl());
  }

  if(!document.querySelector('script[data-wobbin-mobbin-detail]')){
    const script=document.createElement('script');
    script.src='./wobbin-detail-mobbin.js';
    script.dataset.wobbinMobbinDetail='1';
    script.onload=()=>{
      const mobbinDetail=detail;
      if(typeof mobbinDetail!=='function')return;
      detail=function(){
        const html=mobbinDetail();
        return html.includes('class="topbar"')?html:`${header()}${html}`;
      };
      render();
    };
    document.body.append(script);
  }
})();
