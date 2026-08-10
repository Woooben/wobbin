export default async function handler(req, res) {
  try {
    const base='https://gzlenorybqyxstpwkqgf.supabase.co/functions/v1/wobbin-qwen-test';
    const jobs=Array.from({length:4},(_,i)=>fetch(`${base}?wave=${Date.now()}-${i}`,{cache:'no-store'}).then(async r=>({status:r.status,body:await r.json().catch(()=>({}))})));
    const results=await Promise.all(jobs);
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({ok:true,results});
  } catch (e) {
    res.status(500).json({ok:false,error:e instanceof Error?e.message:String(e)});
  }
}
