(async()=>{
  const root=document.getElementById("app");
  const decode=async names=>{
    const rs=await Promise.all(names.map(name=>fetch(`./${name}?v=3`,{cache:"no-store"})));
    const bad=rs.find(r=>!r.ok); if(bad) throw new Error(`资源加载失败（${bad.status}）`);
    const b64=(await Promise.all(rs.map(r=>r.text()))).join("");
    const bin=atob(b64); const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    if(!("DecompressionStream" in window)) throw new Error("当前浏览器版本过低，请升级后重试");
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  };
  try{
    const [css,code]=await Promise.all([decode(['styles.v3.data1.txt']),decode(['app.v3.data1.txt', 'app.v3.data2.txt', 'app.v3.data3.txt', 'app.v3.data4.txt', 'app.v3.data5.txt'])]);
    const style=document.createElement("style"); style.textContent=css; document.head.appendChild(style);
    new Function(`${code}\n//# sourceURL=screenvault-v3.js`)();
  }catch(error){
    console.error(error);
    root.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f7f5;color:#222"><section style="max-width:480px;padding:28px;border:1px solid #ddd;border-radius:16px;background:#fff;text-align:center"><h2 style="margin:0 0 10px">ScreenVault 加载失败</h2><p style="margin:0;color:#777;line-height:1.7">${String(error.message||error)}</p><button onclick="location.reload()" style="margin-top:18px;padding:10px 16px;border:0;border-radius:9px;background:#111;color:#fff;cursor:pointer">重新加载</button></section></main>`;
  }
})();
