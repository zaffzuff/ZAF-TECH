import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";

export const dynamic="force-dynamic";

export async function GET(request:Request){
 const blocked=await enforceRateLimit(request,"transaction-lookup",{limit:30,windowMs:60_000});if(blocked)return blocked;
 const id=new URL(request.url).searchParams.get("id")?.trim();
 if(!id||id.length>128||!/^[a-f0-9]{64}$/i.test(id))return NextResponse.json({error:"A 64-character transaction hash is required."},{status:400,headers:{"Cache-Control":"no-store"}});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(`https://api.mainnet.minepi.com/transactions/${id}`,{cache:"no-store",headers:{Accept:"application/json"},signal:controller.signal});
  const body=await response.json().catch(()=>({}));
  const sourceUrl=`https://api.mainnet.minepi.com/transactions/${id}`;
  const checkedAt=new Date().toISOString();
  if(response.ok && body?.hash?.toLowerCase()!==id.toLowerCase())return NextResponse.json({found:false,error:"Invalid transaction response from source",sourceUrl,checkedAt},{status:502,headers:{"Cache-Control":"no-store"}});
  const status=response.ok?200:response.status===404?404:response.status===429?429:502;
  const error=response.status===404?"Transaction not found":response.status===429?"Source rate limit; retry later":"Pi Mainnet source unavailable";
  return NextResponse.json(response.ok?{found:true,transaction:body,sourceUrl,checkedAt}:{found:false,status:response.status,error,sourceUrl,checkedAt},{status,headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({found:false,error:error instanceof Error&&error.name==="AbortError"?"Pi Mainnet request timed out":"Pi Mainnet request failed"},{status:502,headers:{"Cache-Control":"no-store"}});}
 finally{clearTimeout(timer);}
}
