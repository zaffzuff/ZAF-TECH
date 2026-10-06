import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/zaf/rate-limit";

export const dynamic="force-dynamic";

export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get("id")?.trim();
 if(!id||id.length>128||!/^[a-f0-9]{64}$/i.test(id))return NextResponse.json({error:"A 64-character transaction hash is required."},{status:400,headers:{"Cache-Control":"no-store"}});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(`https://api.mainnet.minepi.com/transactions/${id}`,{cache:"no-store",headers:{Accept:"application/json"},signal:controller.signal});
  const body=await response.json().catch(()=>({}));
  return NextResponse.json(response.ok?{found:true,transaction:body}:{found:false,status:response.status,error:body?.title??"Transaction not found"},{status:response.ok?200:404,headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({found:false,error:error instanceof Error&&error.name==="AbortError"?"Pi Mainnet request timed out":"Pi Mainnet request failed"},{status:502,headers:{"Cache-Control":"no-store"}});}
 finally{clearTimeout(timer);}
}
