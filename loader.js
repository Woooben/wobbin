(async()=>{
  const app=document.getElementById('app');
  try{
    const names=['app.part1.txt','app.part2.txt','app.part3.txt','app.part4.txt'];
    const responses=await Promise.all(names.map(name=>fetch(`./${name}?v=2`,{cache:'no-store'})));
    const failed=responses.find(response=>!response.ok);
    if(failed) throw new Error(`应用文件加载失败（${failed.status}）`);
    const code=(await Promise.all(responses.map(response=>response.text()))).join('\n');
    new Function(`${code}\n//# sourceURL=screenvault-app.js`)();
  }catch(error){
    console.error(error);
    app.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f7f5;color:#222"><section style="max-width:480px;padding:28px;border:1px solid #ddd;border-radius:16px;background:#fff;text-align:center"><h2 style="margin:0 0 10px">ScreenVault 加载失败</h2><p style="margin:0;color:#777;line-height:1.7">${String(error.message||error)}</p><button onclick="location.reload()" style="margin-top:18px;padding:10px 16px;border:0;border-radius:9px;background:#111;color:#fff;cursor:pointer">重新加载</button></section></main>`;
  }
})();
