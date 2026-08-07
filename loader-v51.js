(async()=>{
  const root=document.getElementById("app");

  function decodeBase64Loose(input){
    const table="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const clean=String(input||"")
      .replace(/^\uFEFF/,"")
      .replace(/\s+/g,"")
      .replace(/[^A-Za-z0-9+/=]/g,"")
      .replace(/=+$/g,"");
    if(!clean) throw new Error("应用资源为空，请刷新后重试");
    const out=[];
    let buffer=0,bits=0;
    for(const ch of clean){
      const value=table.indexOf(ch);
      if(value<0) continue;
      buffer=(buffer<<6)|value;
      bits+=6;
      while(bits>=8){
        bits-=8;
        out.push((buffer>>bits)&255);
      }
      buffer&=(1<<bits)-1;
    }
    return Uint8Array.from(out);
  }

  try{
    const names=["wobbin-v51.part1.txt","wobbin-v51.part2.txt","wobbin-v51.part3.txt","wobbin-v51.part4.txt"];
    const rs=await Promise.all(names.map(n=>fetch(`./${n}?v=52`,{cache:"no-store"})));
    const bad=rs.find(r=>!r.ok);
    if(bad) throw new Error(`资源加载失败（${bad.status}）`);

    const texts=await Promise.all(rs.map(r=>r.text()));
    if(texts.some(t=>/^\s*<!doctype|^\s*<html/i.test(t))){
      throw new Error("资源地址返回了网页内容，请刷新后重试");
    }

    const bytes=decodeBase64Loose(texts.join(""));
    if(bytes.length<2||bytes[0]!==0x1f||bytes[1]!==0x8b){
      throw new Error("应用资源不完整，请强制刷新页面后重试");
    }
    if(!("DecompressionStream" in window)) throw new Error("当前浏览器版本过低，请升级后重试");

    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const payload=JSON.parse(await new Response(stream).text());
    if(!payload||typeof payload.css!=="string"||typeof payload.js!=="string"){
      throw new Error("应用资源格式异常，请刷新后重试");
    }

    const style=document.createElement("style");
    style.textContent=payload.css;
    document.head.appendChild(style);
    new Function(`${payload.js}\n//# sourceURL=wobbin-v51.js`)();
  }catch(error){
    console.error(error);
    root.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#121212;color:#f5f5f5"><section style="max-width:520px;padding:28px;border:1px solid #303030;border-radius:16px;background:#1d1d1d;text-align:center"><h2 style="margin:0 0 10px">Wobbin 加载失败</h2><p style="margin:0;color:#aaa;line-height:1.7">${String(error.message||error)}</p><button onclick="location.reload()" style="margin-top:18px;padding:10px 16px;border:0;border-radius:9px;background:#f5f5f5;color:#111;cursor:pointer">重新加载</button></section></main>`;
  }
})();
