'use strict';

(function fixWobbinDetailAppIcon(){
  if(window.__WOBBIN_DETAIL_ICON_FIX_INSTALLED)return;
  window.__WOBBIN_DETAIL_ICON_FIX_INSTALLED=true;

  const style=document.createElement('style');
  style.id='wobbin-detail-icon-fix-style';
  style.textContent=`
    .app-head .app-title > .app-icon{
      flex:0 0 52px!important;
      width:52px!important;
      height:52px!important;
      min-width:52px!important;
      min-height:52px!important;
      max-width:52px!important;
      max-height:52px!important;
      aspect-ratio:1 / 1!important;
      align-self:flex-start!important;
      overflow:hidden!important;
      box-sizing:border-box!important;
    }
    .app-head .app-title > .app-icon.has-image{
      padding:0!important;
    }
    .app-head .app-title > .app-icon.has-image img{
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
      object-fit:cover!important;
      object-position:center!important;
      aspect-ratio:1 / 1!important;
    }
  `;
  document.head.append(style);
})();
