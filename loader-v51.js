(async()=>{
  const root=document.getElementById("app");
  try{
    const names=["wobbin-v51.part1.txt","wobbin-v51.part2.txt","wobbin-v51.part3.txt","wobbin-v51.part4.txt"];
    const rs=await Promise.all(names.map(n=>fetch(`./${n}?v=51`,{cache:"no-store"})));
    const bad=rs.find(r=>!r.ok);
    if(bad) throw new Error(`资源加载失败（${bad.status}）`);
    const b64=(await Promise.all(rs.map(r=>r.text()))).join("");
    const bin=atob(b64);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    if(!("DecompressionStream" in window)) throw new Error("当前浏览器版本过低，请升级后重试");
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const payload=JSON.parse(await new Response(stream).text());
    const style=document.createElement("style");
    style.textContent=payload.css;
    document.head.appendChild(style);
    new Function(`${payload.js}\n//# sourceURL=wobbin-v51.js`)();
  }catch(error){
    console.error(error);
    root.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#121212;color:#f5f5f5"><section style="max-width:480px;padding:28px;border:1px solid #303030;border-radius:16px;background:#1d1d1d;text-align:center"><h2 style="margin:0 0 10px">Wobbin 加载失败</h2><p style="margin:0;color:#aaa;line-height:1.7">${String(error.message||error)}</p><button onclick="location.reload()" style="margin-top:18px;padding:10px 16px;border:0;border-radius:9px;background:#f5f5f5;color:#111;cursor:pointer">重新加载</button></section></main>`;
  }
})();
