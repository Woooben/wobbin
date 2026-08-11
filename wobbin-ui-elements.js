'use strict';

(function bootWobbinUiElements(){
  if(window.__WOBBIN_UI_ELEMENTS_INSTALLED)return;
  if(!window.WOBBIN_TAXONOMY||typeof quickElements!=='function'||typeof home!=='function'||typeof render!=='function'){
    setTimeout(bootWobbinUiElements,80);
    return;
  }
  window.__WOBBIN_UI_ELEMENTS_INSTALLED=true;

  window.WOBBIN_UI_ELEMENT_GROUPS=[
    ['Control',['Accordion','Button','Checkbox','Color Picker','Radio Button','Rating Control','Segmented Control','Slider','Stepper','Switch']],
    ['Navigation',['Bottom Navigation','Navigation Bar','Tab Bar','Tabs','Breadcrumb','Pagination']],
    ['Input',['Search Bar','Text Field','Text Area','Select','Dropdown','Date Picker']],
    ['Overlay',['Action Sheet','Bottom Sheet','Dialog','Modal','Sheet','Alert','Toast','Tooltip']],
    ['Content & Data',['Avatar','Badge','Card','Carousel','Chip','Divider','Icon','Image','List','Table','Map','Chart','Video']],
    ['Status',['Empty State','Progress Bar','Skeleton']]
  ];

  function elementLabel(key){const aliases=window.WOBBIN_LABEL_ALIASES?.[key]||[];return aliases[0]||key}

  /* The standalone dropdown has been retired. Full UI Element browsing now lives in the global search panel. */
  quickElements=function(){return ''};

  const baseHome=home;
  home=function(){
    if(S.element==='All')return baseHome();
    const list=currentItems();
    const zh=elementLabel(S.element);
    return `${header()}<main class="main"><div class="subnav"><div class="subnav-left"><span class="page-label"><strong>UI Elements</strong> · ${esc(S.element)}</span></div></div><div class="section-head"><div><h1>${esc(S.element)}</h1><p>${esc(zh)} · 所有匹配截图</p></div><span class="section-count">${list.length} screens</span></div>${list.length?screenView(list):`<div class="empty"><strong>没有对应截图</strong>可点击顶部搜索框重新选择 UI Element。</div>`}</main>${suggestions()}`;
  };

  render();
})();
