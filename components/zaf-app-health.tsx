"use client";

import { useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale, translate } from "@/lib/zaf/i18n";

type Result = {
  url: string;
  status?: number | null;
  ok?: boolean;
  reachable: boolean;
  responseTimeMs: number;
  https: boolean;
  redirect: boolean;
  error?: string | null;
  checkedAt: string;
  score?: number;
  healthStatus?: "healthy" | "degraded" | "limited" | "offline";
  scoreFactors?: { reachability: number; https: number; response: number; redirect: number };
};

type HistoryRecord = Result & { appName: string };

type TrendPoint = { checkedAt:string; reachable:boolean; responseTimeMs:number; status:number|null; https:boolean; redirect:boolean };
type TrendSummary = { checks:number; reachable:number; offline:number; reachabilityRate:number|null; online:number; onlineRate:number|null; averageResponseTimeMs:number|null; transitions:number; firstCheckedAt:string|null; lastCheckedAt:string|null };

function AppTrend({points,summary,locale,tr}:{points:TrendPoint[];summary:TrendSummary|null;locale:Locale;tr:(en:string,tr:string)=>string}){
 if(!points.length) return <div className="mt-3 text-[10px] text-muted-foreground">{tr("No stored trend data is available yet.","Henüz kaydedilmiş trend verisi bulunmuyor.")}</div>;
 const max=Math.max(...points.map(p=>p.responseTimeMs),1);
 return <div className="mt-4 rounded-lg border border-border p-3">
  <div className="text-xs font-semibold text-foreground">{tr("Response Time Trend","Yanıt Süresi Trendi")}</div>
  <p className="mt-1 text-[10px] text-muted-foreground">{tr("Historical response-time observations for this application.","Bu uygulama için tarihsel yanıt süresi gözlemleri.")}</p>
  <div className="mt-3 flex h-24 items-end gap-1 overflow-x-auto">
   {points.map(p=><div key={p.checkedAt} title={`${p.responseTimeMs} ms · ${new Date(p.checkedAt).toLocaleString(intlLocale(locale))}`} className="min-w-[7px] flex-1 rounded-t-sm bg-foreground/70" style={{height:`${Math.max(8,(p.responseTimeMs/max)*100)}%`}} />)}
  </div>
  <div className="mt-2 flex justify-between text-[9px] text-muted-foreground"><span>{new Date(points[0].checkedAt).toLocaleString(intlLocale(locale))}</span><span>{new Date(points[points.length-1].checkedAt).toLocaleString(intlLocale(locale))}</span></div>
 </div>;
}



type BatchResult = {
  generatedAt: string;
  checked: number;
  limit: number;
  summary: { reachable: number; online: number; offline: number; averageScore: number | null; healthy: number; degraded: number; limited: number };
  results: Array<{
    name: string;
    url: string;
    check: Result;
    score: { score: number; status: string };
    trend: {
      direction: "improving" | "stable" | "declining" | "insufficient";
      delta: number | null;
      freshness: { state: "fresh" | "aging" | "stale" | "old" | "unknown"; ageSeconds: number | null };
      confidence: { score: number; level: "high" | "medium" | "low" | "insufficient"; checks: number; observedWindowMinutes: number | null; cadenceStabilityScore: number };
    };
  }>;
};

export function ZafAppHealth({locale}:{locale:Locale}){
 const tr=(en:string,trText:string)=>translate(locale,en,trText);
 const [url,setUrl]=useState("");
 const [result,setResult]=useState<Result|null>(null);
 const [batch,setBatch]=useState<BatchResult|null>(null);
 const [loading,setLoading]=useState(false);
 const [batchLoading,setBatchLoading]=useState(false);
 const [history,setHistory]=useState<HistoryRecord[]|null>(null);
 const [historyUrl,setHistoryUrl]=useState("");
 const [historyLoading,setHistoryLoading]=useState(false);
 const [trend,setTrend]=useState<TrendPoint[]|null>(null);
 const [trendSummary,setTrendSummary]=useState<TrendSummary|null>(null);
 const [trendLoading,setTrendLoading]=useState(false);

 async function check(){
   if(!url.trim()) return;
   setLoading(true); setResult(null);
   try{const r=await fetch("/api/apps/check?url="+encodeURIComponent(url.trim()),{cache:"no-store"}); setResult(await r.json());}
   catch{setResult({url:url.trim(),reachable:false,responseTimeMs:0,https:url.startsWith("https://"),redirect:false,checkedAt:new Date().toISOString(),error:tr("Request failed", "La requête a échoué")});}
   finally{setLoading(false);}
 }

 async function loadHistory(target:string){
   setHistoryLoading(true); setHistory(null); setHistoryUrl(target); setTrend(null); setTrendSummary(null); setTrendLoading(true);
   try{
     const r=await fetch("/api/apps/health/history?url="+encodeURIComponent(target),{cache:"no-store"});
     if(!r.ok) throw new Error("History request failed");
     const data=await r.json();
     setHistory(data.records ?? []);
     const trendResponse=await fetch("/api/apps/health/trend?url="+encodeURIComponent(target),{cache:"no-store"});
     if(trendResponse.ok){ const trendData=await trendResponse.json(); setTrend(trendData.points ?? []); setTrendSummary(trendData.summary ?? null); }
   }catch{
     setHistory([]); setTrend([]); setTrendSummary(null);
   }finally{
     setHistoryLoading(false); setTrendLoading(false);
   }
 }

 async function checkEcosystem(){
   setBatchLoading(true); setBatch(null);
   try{
     const r=await fetch("/api/apps/health",{cache:"no-store"});
     if(!r.ok) throw new Error("Batch health check failed");
     setBatch(await r.json());
   }catch{
     setBatch(null);
   }finally{
     setBatchLoading(false);
   }
 }

 return <section className="mt-5 sm:mt-7">
   <div className="mb-3">
     <h2 className="text-sm font-semibold text-foreground">{tr("App Health","Uygulama Sağlığı")}</h2>
     <p className="text-[11px] text-muted-foreground">{tr("Server-side reachability and HTTPS checks for public application URLs.","Herkese açık uygulama URL'leri için sunucu tarafı erişilebilirlik ve HTTPS kontrolleri.")}</p>
   </div>
   <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex flex-col gap-2 sm:flex-row">
      <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void check()}} placeholder="https://example.com" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"/>
      <button type="button" onClick={()=>void check()} disabled={loading} className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50">{loading?tr("Checking…","Kontrol Ediliyor…"):tr("Check URL","URL'yi Kontrol Et")}</button>
    </div>
    {result?<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
      <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Reachability","Erişilebilirlik")}</div><div className="mt-1 text-sm font-semibold text-foreground">{result.reachable?tr("Online","Çevrimiçi"):tr("Offline","Çevrimdışı")}</div></div>
      <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">HTTPS</div><div className="mt-1 text-sm font-semibold text-foreground">{result.https?"✓":"—"}</div></div>
      <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Response","Yanıt")}</div><div className="mt-1 text-sm font-semibold text-foreground">{result.responseTimeMs} ms</div></div>
      <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">HTTP</div><div className="mt-1 text-sm font-semibold text-foreground">{result.status??"—"}</div></div>
      <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Health Score","Sağlık Skoru")}</div><div className="mt-1 text-sm font-semibold text-foreground">{result.score == null ? "—" : result.score + "/100"}</div></div>
    </div>:null}
    {result?.error?<div className="mt-3 text-[10px] text-muted-foreground">{result.error}</div>:null}
    {result?.scoreFactors ? (
      <div className="mt-3 rounded-lg border border-border bg-background p-3">
        <div className="text-[10px] font-medium text-foreground">{tr("Observable Health Factors","Gözlemlenebilir Sağlık Faktörleri")}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-border p-2">
            <div className="text-[9px] text-muted-foreground">{tr("Reachability","Erişilebilirlik")}</div>
            <div className="mt-1 text-xs font-semibold text-foreground">{result.scoreFactors.reachability} pts</div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-[9px] text-muted-foreground">HTTPS</div>
            <div className="mt-1 text-xs font-semibold text-foreground">{result.scoreFactors.https} pts</div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-[9px] text-muted-foreground">{tr("Response","Yanıt")}</div>
            <div className="mt-1 text-xs font-semibold text-foreground">{result.scoreFactors.response} pts</div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-[9px] text-muted-foreground">{tr("Redirect","Yönlendirme")}</div>
            <div className="mt-1 text-xs font-semibold text-foreground">{result.scoreFactors.redirect} pts</div>
          </div>
        </div>
        <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
          {tr("The score describes observable URL/infrastructure behavior only. It is not a security audit, ownership verification, or legitimacy assessment.", "Bu skor yalnızca gözlemlenebilir URL/altyapı davranışını açıklar. Güvenlik denetimi, sahiplik doğrulaması veya meşruiyet değerlendirmesi değildir.")}
        </p>
      </div>
    ) : null}

    <div className="mt-5 border-t border-border pt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-foreground">{tr("Ecosystem Health Check","Ekosistem Sağlık Kontrolü")}</div>
          <p className="mt-1 text-[10px] text-muted-foreground">{tr("Run a batch check against up to 20 applications currently exposed by the public ecosystem source.","Herkese açık ekosistem kaynağında şu anda açığa çıkan en fazla 20 uygulama için toplu kontrol çalıştırır.")}</p>
        </div>
        <button type="button" onClick={()=>void checkEcosystem()} disabled={batchLoading} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground disabled:opacity-50">{batchLoading?tr("Running Checks…","Kontroller Çalıştırılıyor…"):tr("Run Ecosystem Check","Ekosistem Kontrolünü Çalıştır")}</button>
      </div>
      {batch?<div className="mt-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Checked","Kontrol Edilen")}</div><div className="mt-1 text-sm font-semibold text-foreground">{batch.checked}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Online","Çevrimiçi")}</div><div className="mt-1 text-sm font-semibold text-foreground">{batch.summary.online}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Offline","Çevrimdışı")}</div><div className="mt-1 text-sm font-semibold text-foreground">{batch.summary.offline}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Avg Score","Ort. Skor")}</div><div className="mt-1 text-sm font-semibold text-foreground">{batch.summary.averageScore == null ? "—" : batch.summary.averageScore + "/100"}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Healthy","Sağlıklı")}</div><div className="mt-1 text-sm font-semibold text-foreground">{batch.summary.healthy}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Degraded","Düşük")}</div><div className="mt-1 text-sm font-semibold text-foreground">{batch.summary.degraded}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">{tr("Limited","Sınırlı")}</div><div className="mt-1 text-sm font-semibold text-foreground">{batch.summary.limited}</div></div>
        </div>
        <div className="mt-4 rounded-lg border border-border p-3">
          <div className="text-xs font-semibold text-foreground">{tr("Health Overview","Sağlık Genel Görünümü")}</div>
          <p className="mt-1 text-[10px] text-muted-foreground">{tr("Current scores plus stored-history trend signals for the checked application sample.","Kontrol edilen uygulama örneği için güncel skorlar ve kayıtlı geçmiş trend sinyalleri.")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Average","Ortalama")}</div><div className="mt-1 text-xs font-semibold text-foreground">{batch.summary.averageScore == null ? "—" : batch.summary.averageScore + "/100"}</div></div>
            <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Attention","Dikkat")}</div><div className="mt-1 text-xs font-semibold text-foreground">{batch.summary.attention}</div></div>
            <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Declining","Gerileyen")}</div><div className="mt-1 text-xs font-semibold text-foreground">{batch.summary.declining}</div></div>
            <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Improving","İyileşen")}</div><div className="mt-1 text-xs font-semibold text-foreground">{batch.summary.improving}</div></div>
            <div className="rounded-lg border border-border p-2.5"><div className="text-[9px] text-muted-foreground">{tr("Stale History","Eski Geçmiş")}</div><div className="mt-1 text-xs font-semibold text-foreground">{batch.summary.stale}</div></div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border p-3">
          <div className="text-xs font-semibold text-foreground">{tr("Health Change Radar","Sağlık Değişim Radarı")}</div>
          <p className="mt-1 text-[10px] text-muted-foreground">{tr("Signals are observational: they highlight current status and stored-history movement, not confirmed incidents.","Sinyaller gözlemseldir: mevcut durumu ve kayıtlı geçmiş hareketini öne çıkarır; doğrulanmış olay iddiası değildir.")}</p>
          <div className="mt-3 space-y-1.5">
            {[...batch.results]
              .sort((a,b) => {
                const priority = (item: typeof a) => item.score.status === "offline" ? 5 : item.score.status === "limited" ? 4 : item.score.status === "degraded" ? 3 : item.trend.direction === "declining" ? 2 : item.trend.direction === "improving" ? 1 : 0;
                return priority(b) - priority(a);
              })
              .filter(item => item.score.status !== "healthy" || item.trend.direction !== "stable")
              .slice(0,8)
              .map(item => (
                <button type="button" onClick={()=>void loadHistory(item.url)} key={item.url} className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left">
                  <span className="min-w-0 truncate text-[10px] font-medium text-foreground">{item.name}</span>
                  <span className="shrink-0 text-[9px] text-muted-foreground">
                    {item.score.score}/100 · {item.trend.direction === "declining" ? tr("Declining","Geriliyor") : item.trend.direction === "improving" ? tr("Improving","İyileşiyor") : item.score.status}
                  </span>
                </button>
              ))}
            {!batch.results.some(item => item.score.status !== "healthy" || item.trend.direction !== "stable") ? (
              <div className="rounded-lg border border-border p-3 text-[10px] text-muted-foreground">{tr("No health changes or attention signals detected in this sample.","Bu örnekte sağlık değişimi veya dikkat sinyali tespit edilmedi.")}</div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {batch.results.slice(0,8).map(item=><button type="button" onClick={()=>void loadHistory(item.url)} key={item.url} className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-[10px]">
            <span className="min-w-0 truncate text-foreground">{item.name}</span>
            <span className="shrink-0 text-muted-foreground">{item.score.score}/100 · {item.check.reachable?tr("Reachable","Erişilebilir"):tr("Offline","Çevrimdışı")} · {item.check.responseTimeMs} ms</span>
          </button>)}
        </div>
        <div className="mt-3 text-[10px] text-muted-foreground">{tr("Checks are persisted when DATABASE_URL is configured. Stored-history trend and confidence require historical checks to be available.","DATABASE_URL yapılandırıldığında kontroller geçmişe kaydedilir. Zamanlanmış kontroller yapılandırılmış sunucu tarafı zamanlayıcısı üzerinden çalışır.")}</div>
        {historyUrl?<div className="mt-4 border-t border-border pt-4">
          <div className="text-xs font-semibold text-foreground">{tr("Historical Checks","Geçmiş Kontroller")}</div>
          <div className="mt-1 truncate text-[10px] text-muted-foreground">{historyUrl}</div>
          {historyLoading?<div className="mt-3 text-[10px] text-muted-foreground">{tr("Loading History…","Geçmiş Yükleniyor…")}</div>:history?.length?<div className="mt-3 space-y-1.5">
            {history.slice(0,10).map((item,index)=><div key={item.checkedAt+"-"+index} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-[10px]">
              <span className="text-foreground">{new Date(item.checkedAt).toLocaleString(intlLocale(locale))}</span>
              <span className="shrink-0 text-muted-foreground">{item.reachable?tr("Reachable","Erişilebilir"):tr("Offline","Çevrimdışı")} · {item.responseTimeMs} ms</span>
            </div>)}
          {trendLoading?<div className="mt-3 text-[10px] text-muted-foreground">{tr("Loading Trend…","Trend Yükleniyor…")}</div>:<AppTrend points={trend ?? []} summary={trendSummary} locale={locale} tr={tr}/>}
          </div>:<div className="mt-3 text-[10px] text-muted-foreground">{tr("No Stored History Is Available Yet.","Henüz Kaydedilmiş Geçmiş Bulunmuyor.")}</div>}
        </div>:null}
      </div>:null}
    </div>
   </div>
 </section>
}
