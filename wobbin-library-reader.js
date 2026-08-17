'use strict';

(function installWobbinFullLibraryReader(){
  if(window.__WOBBIN_FULL_LIBRARY_READER_INSTALLED)return;
  if(typeof WOBBIN_SUPABASE_URL==='undefined'||typeof cloudLibrary!=='function'||typeof loadCloudLibrary!=='function'){
    setTimeout(installWobbinFullLibraryReader,60);
    return;
  }
  window.__WOBBIN_FULL_LIBRARY_READER_INSTALLED=true;

  const FULL_LIBRARY_URL=WOBBIN_SUPABASE_URL+'/functions/v1/wobbin-library';

  cloudLibrary=async function(){
    const res=await fetch(FULL_LIBRARY_URL,{cache:'no-store'});
    let data={};
    try{data=await res.json()}catch{}
    if(!res.ok)throw new Error(data.error||'云端读取失败');
    return data;
  };

  loadCloudLibrary({quiet:true}).catch(error=>{
    console.error('Wobbin full library reload failed',error);
  });
})();
