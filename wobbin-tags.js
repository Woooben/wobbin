'use strict';

const WOBBIN_LABELS_URL='https://gzlenorybqyxstpwkqgf.supabase.co/functions/v1/wobbin-labels';

/* Controlled vocabulary for visual auto-tagging and bilingual search. */
const WOBBIN_TAXONOMY={
  uiElements:[
    'Accordion','Action Sheet','Alert','Avatar','Badge','Bottom Navigation','Bottom Sheet','Breadcrumb','Button','Card','Carousel','Chart','Checkbox','Chip','Color Picker','Date Picker','Dialog','Divider','Dropdown','Empty State','Icon','Image','List','Map','Modal','Navigation Bar','Pagination','Progress Bar','Radio Button','Rating Control','Search Bar','Segmented Control','Select','Sheet','Skeleton','Slider','Stepper','Switch','Tab Bar','Table','Tabs','Text Area','Text Field','Toast','Tooltip','Video'
  ],
  pageTypes:[
    'Home','Feed','Search','Search Results','Login','Sign Up','Onboarding','Profile','Settings','Listing','Detail','Product Detail','Cart','Checkout','Payment','Booking','Map','Chat','Notifications','Favorites','Subscription','Pricing','Dashboard','Analytics','Form','Confirmation','Permission','Error','Empty'
  ],
  featureTags:[
    'Search','Filter','Sort','Share','Favorite','Save','Upload','Download','Camera','Scan','Location','Map','Calendar','Date','Time','Payment','Booking','Message','Notification','Recommendation','Personalization','AI','Voice','Photo','Video'
  ],
  stateTags:[
    'Default','Active','Selected','Disabled','Loading','Skeleton','Empty','Error','Success','Offline','Permission','First Use'
  ],
  appTypes:[
    'Social','Messaging','Travel','Booking','Marketplace','E-commerce','Finance','Productivity','Utilities','Health','Fitness','Food','Delivery','Mobility','Navigation','Education','Entertainment','Music','Video','Photo','News','Lifestyle','Shopping','Business','AI'
  ]
};

const WOBBIN_LABEL_ALIASES={
  'Accordion':['折叠面板','手风琴'],
  'Action Sheet':['操作菜单','动作菜单'],
  'Alert':['警告','提示框'],
  'Avatar':['头像'],
  'Badge':['徽标','角标'],
  'Bottom Navigation':['底部导航','底部标签栏'],
  'Bottom Sheet':['底部浮层','底部弹层'],
  'Breadcrumb':['面包屑'],
  'Button':['按钮','CTA'],
  'Card':['卡片'],
  'Carousel':['轮播','轮播图'],
  'Chart':['图表','数据图'],
  'Checkbox':['复选框','多选框'],
  'Chip':['标签胶囊','胶囊标签'],
  'Color Picker':['颜色选择器'],
  'Date Picker':['日期选择器'],
  'Dialog':['对话框'],
  'Divider':['分割线'],
  'Dropdown':['下拉菜单'],
  'Empty State':['空状态','暂无'],
  'Icon':['图标'],
  'Image':['图片','图像'],
  'List':['列表'],
  'Map':['地图','定位'],
  'Modal':['弹窗','模态框'],
  'Navigation Bar':['导航栏','顶部导航'],
  'Pagination':['分页'],
  'Progress Bar':['进度条'],
  'Radio Button':['单选框'],
  'Rating Control':['评分','星级评分'],
  'Search Bar':['搜索框','搜索栏'],
  'Segmented Control':['分段控件','分段选择'],
  'Select':['选择器'],
  'Skeleton':['骨架屏'],
  'Slider':['滑块'],
  'Stepper':['步进器'],
  'Switch':['开关'],
  'Tab Bar':['标签栏'],
  'Table':['表格'],
  'Tabs':['标签页','选项卡'],
  'Text Area':['多行输入'],
  'Text Field':['输入框','文本框'],
  'Toast':['轻提示','吐司'],
  'Tooltip':['气泡提示'],
  'Video':['视频'],
  'Home':['首页'],
  'Feed':['信息流','动态流'],
  'Search':['搜索'],
  'Search Results':['搜索结果','结果页'],
  'Login':['登录'],
  'Sign Up':['注册'],
  'Onboarding':['引导','新手引导'],
  'Profile':['个人主页','个人资料'],
  'Settings':['设置'],
  'Listing':['列表页'],
  'Detail':['详情页'],
  'Product Detail':['商品详情','产品详情'],
  'Cart':['购物车'],
  'Checkout':['结算'],
  'Payment':['支付'],
  'Booking':['预订','预约'],
  'Chat':['聊天'],
  'Notifications':['通知','消息通知'],
  'Favorites':['收藏'],
  'Subscription':['订阅'],
  'Pricing':['价格','定价'],
  'Dashboard':['仪表盘','工作台'],
  'Analytics':['数据分析','分析'],
  'Form':['表单'],
  'Confirmation':['确认页','完成页'],
  'Permission':['权限'],
  'Error':['错误','失败'],
  'Empty':['空页面','空数据'],
  'Filter':['筛选'],
  'Sort':['排序'],
  'Share':['分享'],
  'Favorite':['收藏'],
  'Save':['保存'],
  'Upload':['上传'],
  'Download':['下载'],
  'Camera':['相机','拍照'],
  'Scan':['扫描','扫码'],
  'Location':['定位','位置'],
  'Calendar':['日历'],
  'Date':['日期'],
  'Time':['时间'],
  'Message':['消息'],
  'Notification':['通知'],
  'Recommendation':['推荐'],
  'Personalization':['个性化'],
  'AI':['AI','人工智能'],
  'Voice':['语音'],
  'Photo':['照片','图片'],
  'Default':['默认'],
  'Active':['激活','活跃'],
  'Selected':['选中'],
  'Disabled':['禁用','不可用'],
  'Loading':['加载'],
  'Success':['成功'],
  'Offline':['离线','断网'],
  'First Use':['首次使用','第一次使用'],
  'Social':['社交'],
  'Messaging':['通讯','聊天'],
  'Travel':['旅行','旅游'],
  'Marketplace':['交易平台','市场'],
  'E-commerce':['电商','购物'],
  'Finance':['金融','财务'],
  'Productivity':['效率','生产力'],
  'Utilities':['工具'],
  'Health':['健康'],
  'Fitness':['健身','运动'],
  'Food':['餐饮','美食'],
  'Delivery':['外卖','配送'],
  'Mobility':['出行'],
  'Navigation':['导航'],
  'Education':['教育','学习'],
  'Entertainment':['娱乐'],
  'Music':['音乐'],
  'News':['新闻'],
  'Lifestyle':['生活方式'],
  'Shopping':['购物'],
  'Business':['商业']
};

const __wobbinBaseMatchesQuery=matchesQuery;

function labelSearchTokens(label){
  const key=String(label||'').trim();
  return [key,...(WOBBIN_LABEL_ALIASES[key]||[])];
}

function wobbinSearchText(x){
  const raw=[
    x.app,x.title,x.flow,x.category,x.platform,
    ...(x.elements||[]),...(x.tags||[]),
    ...(x.pageTypes||[]),...(x.featureTags||[]),...(x.stateTags||[]),...(x.appTypes||[])
  ].filter(Boolean);
  const aliases=[];
  for(const value of raw)aliases.push(...labelSearchTokens(value));
  return [...raw,...aliases].join(' ').toLowerCase();
}

matchesQuery=function(x,q){
  q=String(q||'').trim().toLowerCase();
  if(!q)return true;
  return wobbinSearchText(x).includes(q);
};

async function loadWobbinLabels(){
  try{
    const res=await fetch(WOBBIN_LABELS_URL+'?action=metadata',{cache:'no-store'});
    if(!res.ok)return;
    const data=await res.json();
    const screenMap=new Map((data.screens||[]).map(x=>[x.id,x]));
    const appMap=new Map((data.apps||[]).map(x=>[x.id,x]));
    const cloudApps=WOBBIN_CLOUD?.apps instanceof Map?WOBBIN_CLOUD.apps:new Map();
    for(const item of S.items){
      const screen=screenMap.get(item.id);
      if(screen){
        item.pageTypes=Array.isArray(screen.page_types)?screen.page_types:[];
        item.featureTags=Array.isArray(screen.feature_tags)?screen.feature_tags:[];
        item.stateTags=Array.isArray(screen.state_tags)?screen.state_tags:[];
      }
      let appId='';
      for(const [id,row] of cloudApps){if(row?.name===item.app){appId=id;break}}
      const app=appMap.get(appId);
      item.appTypes=Array.isArray(app?.app_types)?app.app_types:[];
    }
    render();
  }catch(e){console.warn('Wobbin labels metadata unavailable',e)}
}

window.WOBBIN_TAXONOMY=WOBBIN_TAXONOMY;
window.addEventListener('load',()=>setTimeout(loadWobbinLabels,400));
setTimeout(loadWobbinLabels,900);
