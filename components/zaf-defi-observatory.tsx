"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale } from "@/lib/zaf/i18n";

type AssetRef = { assetType:string|null; assetCode:string|null; issuer:string|null; label:string };
type Pool = { networkScope:"testnet"; poolId:string; feeBp:number|null; totalShares:number|null; reserves:Array<{asset:AssetRef;amount:number|null}>; lastModifiedLedger:string|null };
type Trade = { networkScope:"testnet"; id:string; ledgerCloseTime:string|null; tradeType:string|null; base:{asset:AssetRef;amount:number|null;poolId:string|null;offerId:string|null}; counter:{asset:AssetRef;amount:number|null;poolId:string|null;offerId:string|null}; price:number|null };
type Payload = {
  generatedAt:string;
  networkScope:"testnet";
  summary:{pools:number;trades:number;distinctAssets:number;state:"observed"|"empty"|"unavailable"};
  sources:{liquidityPools:{state:string;source:string;count:number;error:string|null;records:Pool[]};trades:{state:string;source:string;count:number;error:string|null;records:Trade[]}};
  assets:AssetRef[];
  notes:string[];
  errors:string[];
};

function num(value:number|null, locale:Locale, digits=7){
  return value==null||!Number.isFinite(value) ? "—" : value.toLocaleString(intlLocale(locale), {maximumFractionDigits:digits});
}
function stateLabel(state:string, tr:(en:string,trText:string)=>string){
  if(state==="observed") return tr("Observed","Gözlemleniyor");
  if(state==="empty") return tr("No Records","Kayıt Yok");
  return tr("Unavailable","Kullanılamıyor");
}

export function ZafDefiObservatory({locale,tr,view}:{locale:Locale;tr:(en:string,trText:string)=>string;view:"Overview"|"DEX"|"AMM & Pools"|"Tokens"}){
  const [data,setData]=useState<Payload|null>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      try{
        const response=await fetch("/api/zaf/defi?network=testnet&limit=100",{cache:"no-store"});
        const body=await response.json();
        if(active) setData(response.ok?body:null);
      }catch{
        if(active) setData(null);
      }finally{
        if(active) setLoading(false);
      }
    };
    void load();
    const id=window.setInterval(()=>void load(),60000);
    return()=>{active=false;window.clearInterval(id)};
  },[]);

  const pools=data?.sources.liquidityPools.records??[];
  const trades=data?.sources.trades.records??[];
  const unavailable=!data || data.summary.state==="unavailable";
  const empty=data?.summary.state==="empty";

  return <section className="mt-5 sm:mt-7">
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-foreground">{tr("DeFi Observatory","DeFi Gözlem Merkezi")}</h2>
      <p className="text-[11px] text-muted-foreground">{tr("A read-only observation layer for Pi Testnet DEX and AMM infrastructure.","Pi Testnet DEX ve AMM altyapısı için salt-okunur gözlem katmanı.")}</p>
    </div>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold ty-nums text-foreground">{loading?"…":data?.summary.pools??"—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Pools","Havuzlar")}</div><div className="mt-1 text-[9px] text-muted-foreground">Testnet</div></div>
      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold ty-nums text-foreground">{loading?"…":data?.summary.trades??"—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Trades","İşlemler")}</div><div className="mt-1 text-[9px] text-muted-foreground">Testnet</div></div>
      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold ty-nums text-foreground">{loading?"…":data?.summary.distinctAssets??"—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Assets In DeFi Sample","DeFi Örneğindeki Varlıklar")}</div></div>
      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold text-foreground">{loading?"…":stateLabel(data?.summary.state??"unavailable",tr)}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Observation State","Gözlem Durumu")}</div></div>
    </div>

    {unavailable || empty ? <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-foreground">{tr("Pi DEX / AMM Observatory","Pi DEX / AMM Gözlem Merkezi")}</div>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
        {unavailable
          ? tr("The required public Testnet DEX/AMM endpoint was not observable in this check. The observatory infrastructure is ready and will populate when a verifiable source responds.","Gerekli herkese açık Testnet DEX/AMM endpointi bu kontrolde gözlemlenemedi. Gözlem altyapısı hazır ve doğrulanabilir kaynak yanıt verdiğinde veriyle dolacak.")
          : tr("The public endpoints responded, but no DEX/AMM records were exposed in this observation window.","Herkese açık endpointler yanıt verdi ancak bu gözlem penceresinde DEX/AMM kaydı açığa çıkmadı.")}
      </p>
      <div className="mt-3 rounded-lg border border-border bg-background p-3 text-[10px] leading-relaxed text-muted-foreground">{tr("Coming Soon target: live pools, swaps/trades, liquidity, token pairs, historical changes and Mainnet readiness. No market-cap or USD value is inferred without an observable source.","Yaklaşan hedef: canlı havuzlar, swap/işlem verileri, likidite, token çiftleri, tarihsel değişimler ve Mainnet hazırlık durumu. Gözlemlenebilir kaynak olmadan market-cap veya USD değer çıkarımı yapılmaz.")}</div>
    </div>:null}

    {view==="Overview" ? <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {[
        [tr("DEX","DEX"),tr("Orderbook-style trades and exchange observations. Mainnet data is intentionally separated from Testnet data.","Emir defteri tipi işlemler ve borsa gözlemleri. Mainnet verisi Testnet verisinden bilinçli olarak ayrı tutulur.")],
        [tr("AMM & Pools","AMM & Havuzlar"),tr("Liquidity-pool reserves, pool identifiers and observed pool activity.","Likidite havuzu rezervleri, havuz kimlikleri ve gözlemlenen havuz aktivitesi.")],
        [tr("Tokens","Tokenlar"),tr("Assets observed in DEX/AMM records, linked to issuers where the source exposes them.","DEX/AMM kayıtlarında gözlemlenen varlıklar; kaynak açığa çıkardığında issuer bilgisiyle.")],
        [tr("Mainnet Readiness","Mainnet Hazırlığı"),tr("The interface is prepared for a future public Mainnet DeFi source; it does not imply that Mainnet DeFi is currently enabled.","Arayüz gelecekteki herkese açık Mainnet DeFi kaynağı için hazırdır; Mainnet DeFi'nin şu anda etkin olduğu anlamına gelmez.")]
      ].map(([title,detail])=><div key={title} className="rounded-xl border border-border bg-card p-4"><div className="text-xs font-semibold text-foreground">{title}</div><p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{detail}</p></div>)}
    </div>:null}

    {view==="AMM & Pools" ? <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-foreground">{tr("Observed Liquidity Pools","Gözlemlenen Likidite Havuzları")}</div>
      <div className="mt-3 space-y-2">{pools.slice(0,50).map(pool=><div key={pool.poolId} className="rounded-lg border border-border p-3">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[10px] font-semibold text-foreground">{pool.poolId}</div><div className="mt-1 text-[9px] text-muted-foreground">{pool.reserves.map(r=>r.asset.label).join(" / ")||tr("Assets unavailable","Varlık bilgisi yok")}</div></div><span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">Testnet</span></div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"><div><div className="text-[9px] text-muted-foreground">{tr("Fee","Ücret")}</div><div className="text-[10px] text-foreground">{pool.feeBp==null?"—":num(pool.feeBp/10000,locale,4)}</div></div><div><div className="text-[9px] text-muted-foreground">{tr("Total Shares","Toplam Pay")}</div><div className="text-[10px] text-foreground">{num(pool.totalShares,locale)}</div></div><div><div className="text-[9px] text-muted-foreground">{tr("Reserves","Rezervler")}</div><div className="text-[10px] text-foreground">{pool.reserves.length}</div></div><div><div className="text-[9px] text-muted-foreground">{tr("Ledger","Ledger")}</div><div className="text-[10px] text-foreground">{pool.lastModifiedLedger??"—"}</div></div></div>
        <div className="mt-2 space-y-1">{pool.reserves.map((reserve,index)=><div key={reserve.asset.label+"-"+index} className="flex items-center justify-between gap-3 text-[9px]"><span className="text-muted-foreground">{reserve.asset.label}</span><span className="text-foreground">{num(reserve.amount,locale)}</span></div>)}</div>
      </div>)}{!pools.length?<div className="text-[10px] text-muted-foreground">{tr("No pool records are currently observable.","Şu anda gözlemlenebilir havuz kaydı yok.")}</div>:null}</div>
    </div>:null}

    {view==="DEX" ? <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-foreground">{tr("Observed Trades","Gözlemlenen İşlemler")}</div>
      <div className="mt-3 space-y-2">{trades.slice(0,50).map(trade=><div key={trade.id} className="rounded-lg border border-border p-3">
        <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-semibold text-foreground">{trade.base.asset.label} → {trade.counter.asset.label}</div><div className="mt-1 text-[9px] text-muted-foreground">{trade.ledgerCloseTime?new Date(trade.ledgerCloseTime).toLocaleString(intlLocale(locale)):"—"} · {trade.tradeType??"—"}</div></div><span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">Testnet</span></div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"><div><div className="text-[9px] text-muted-foreground">{tr("Base Amount","Baz Miktar")}</div><div className="text-[10px] text-foreground">{num(trade.base.amount,locale)}</div></div><div><div className="text-[9px] text-muted-foreground">{tr("Counter Amount","Karşı Miktar")}</div><div className="text-[10px] text-foreground">{num(trade.counter.amount,locale)}</div></div><div><div className="text-[9px] text-muted-foreground">{tr("Price","Fiyat")}</div><div className="text-[10px] text-foreground">{num(trade.price,locale)}</div></div><div><div className="text-[9px] text-muted-foreground">{tr("Pool","Havuz")}</div><div className="text-[10px] text-foreground">{trade.base.poolId??trade.counter.poolId??"—"}</div></div></div>
      </div>)}{!trades.length?<div className="text-[10px] text-muted-foreground">{tr("No trade records are currently observable.","Şu anda gözlemlenebilir işlem kaydı yok.")}</div>:null}</div>
    </div>:null}

    {view==="Tokens" ? <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-foreground">{tr("DeFi-Observed Tokens","DeFi Gözlemlerinde Bulunan Tokenlar")}</div>
      <div className="mt-3 space-y-2">{(data?.assets??[]).map((asset,index)=><div key={asset.label+"-"+index} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold text-foreground">{asset.label}</span><span className="text-[9px] text-muted-foreground">Testnet</span></div><div className="mt-1 break-all text-[9px] text-muted-foreground">{asset.issuer??tr("Issuer not exposed","Issuer açığa çıkmadı")}</div></div>)}{!data?.assets.length?<div className="text-[10px] text-muted-foreground">{tr("No DeFi-linked asset records are currently observable.","Şu anda DeFi bağlantılı gözlemlenebilir varlık kaydı yok.")}</div>:null}</div>
    </div>:null}

    <div className="mt-3 rounded-xl border border-border bg-card p-3 text-[9px] leading-relaxed text-muted-foreground">{tr("Boundary: Pi DEX/AMM features are currently described by Pi as Testnet functionality. ZAF TECH reports only public observations returned by the selected source and never treats unavailable data as proof that the underlying feature is absent.","Sınır: Pi, DEX/AMM özelliklerini şu anda Testnet işlevleri olarak tanımlıyor. ZAF TECH yalnızca seçilen kaynaktan dönen herkese açık gözlemleri raporlar ve kullanılamayan veriyi ilgili özelliğin yokluğunun kanıtı olarak kabul etmez.")}</div>
  </section>;
}
