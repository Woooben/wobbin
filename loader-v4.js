(async()=>{
  const root=document.getElementById("app");
  try{
    const names=["wobbin-v4.data1.txt","wobbin-v4.data2.txt","wobbin-v4.data3.txt"];
    const rs=await Promise.all(names.map(n=>fetch(`./${n}?v=4`,{cache:"no-store"})));
    const bad=rs.find(r=>!r.ok);
    if(bad) throw new Error(`资源加载失败（${bad.status}）`);
    const b64=(await Promise.all(rs.map(r=>r.text()))).join("");
    const bin=atob(b64);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    if(!("DecompressionStream" in window)) throw new Error("当前浏览器版本过低，请升级后重试");
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const code=await new Response(stream).text();
    new Function(`${code}\n//# sourceURL=wobbin-v4.js`)();
  }catch(error){
    console.error(error);
    root.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#111210;color:#f4f4f1"><section style="max-width:480px;padding:28px;border:1px solid #2d2e2a;border-radius:16px;background:#181917;text-align:center"><h2 style="margin:0 0 10px">Wobbin 加载失败</h2><p style="margin:0;color:#a3a39b;line-height:1.7">${String(error.message||error)}</p><button onclick="location.reload()" style="margin-top:18px;padding:10px 16px;border:0;border-radius:9px;background:#f2f2ee;color:#111;cursor:pointer">重新加载</button></section></main>`;
  }
})();
