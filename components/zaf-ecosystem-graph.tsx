"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { translate } from "@/lib/zaf/i18n";

type NodeType = "network" | "app" | "asset" | "pool" | "launch" | "evidence";
type Scope = "mainnet" | "testnet" | "unknown";
type GraphNode = {
  id: string;
  type: NodeType;
  label: string;
  networkScope: Scope;
  status: "observed" | "published-evidence";
  detail: string;
  href: string | null;
  metadata: Record<string, string | number | null>;
};
type GraphEdge = {
  id: string;
  from: string;
  to: string;
  relation: string;
  networkScope: Scope;
  status: "observed" | "published-evidence";
};
type Payload = {
  generatedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  counts: { nodes:number; edges:number; apps:number; assets:number; pools:number; launches:number; evidence:number };
  sourceStates: Record<string, string>;
  notes: string[];
};

function typeLabel(type:NodeType, locale:Locale){
  const map:Record<NodeType,[string,string]> = {
    network:["Network","Ağ"], app:["App","Uygulama"], asset:["Asset","Varlık"], pool:["Pool","Havuz"], launch:["Launch","Launch"], evidence:["Evidence","Kanıt"]
  };
  return translate(locale, map[type][0], map[type][1]);
}
function scopeLabel(scope:Scope, locale:Locale){
  if(locale==="tr") return scope==="mainnet"?"Mainnet":scope==="testnet"?"Testnet":"Bilinmiyor";
  return scope==="mainnet"?"Mainnet":scope==="testnet"?"Testnet":translate(locale,"Unknown","Bilinmiyor");
}
function relationshipLabel(value:string, locale:Locale){
  const map:Record<string,[string,string]> = {
    "observed-in":["Observed In","İçinde Gözlemlendi"],
    "observed-on":["Observed On","Üzerinde Gözlemlendi"],
    "pool-on":["Pool On","Havuz Ağında"],
    "reserve-asset":["Reserve Asset","Rezerv Varlığı"],
    "observed-pair":["Observed Pair","Gözlemlenen Parite"],
    "testnet-stage":["Testnet Stage","Testnet Aşaması"],
    "launch-token":["Launch Token","Launch Tokenı"],
    "published-mainnet-evidence":["Published Mainnet Evidence","Yayınlanmış Mainnet Kanıtı"],
    "published-staking-evidence":["Published Staking Evidence","Yayınlanmış Staking Kanıtı"],
  };
  return map[value] ? translate(locale, map[value][0], map[value][1]) : value;
}

export function ZafEcosystemGraph({locale,tr}:{locale:Locale;tr:(en:string,trText:string)=>string}){
  const [data,setData]=useState<Payload|null>(null);
  const [loading,setLoading]=useState(true);
  const [scope,setScope]=useState<"all"|Scope>("all");
  const [kind,setKind]=useState<"all"|NodeType>("all");
  const [query,setQuery]=useState("");
  const [selectedNode,setSelectedNode]=useState<GraphNode|null>(null);

  useEffect(()=>{
    let active=true;
    const load=async()=>{
      try{
        const response=await fetch("/api/zaf/ecosystem/graph?maxNodes=120",{cache:"no-store"});
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

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return (data?.nodes??[]).filter(node=>{
      const scopeMatch=scope==="all"||node.networkScope===scope;
      const kindMatch=kind==="all"||node.type===kind;
      const text=(node.label+" "+node.detail).toLowerCase();
      return scopeMatch&&kindMatch&&(!q||text.includes(q));
    });
  },[data,scope,kind,query]);

  useEffect(()=>{
    if(selectedNode && !filtered.some(node=>node.id===selectedNode.id)) setSelectedNode(null);
  },[filtered,selectedNode]);

  const visible=useMemo(()=>filtered.slice(0,120),[filtered]);
  const visibleIds=new Set(visible.map(node=>node.id));
  const graphEdges=(data?.edges??[]).filter(edge=>visibleIds.has(edge.from)&&visibleIds.has(edge.to));
  const selectedEdges=selectedNode?graphEdges.filter(edge=>edge.from===selectedNode.id||edge.to===selectedNode.id):[];

  return <section className="mt-5 sm:mt-7">
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-foreground">{tr("Ecosystem Graph","Ekosistem Grafiği")}</h2>
      <p className="text-[11px] text-muted-foreground">{tr("A read-only graph of observable relationships across Pi ecosystem sources.","Pi ekosistem kaynakları arasındaki gözlemlenebilir ilişkilerin salt-okunur grafiği.")}</p>
    </div>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold ty-nums text-foreground">{loading?"…":data?.counts.nodes??"—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Graph Nodes","Graf Düğümleri")}</div></div>
      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold ty-nums text-foreground">{loading?"…":data?.counts.edges??"—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Observed relationships","Gözlemlenen ilişkiler")}</div></div>
      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold ty-nums text-foreground">{loading?"…":data?.counts.apps??"—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Apps","Uygulamalar")}</div></div>
      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xl font-bold ty-nums text-foreground">{loading?"…":data?.counts.assets??"—"}</div><div className="mt-1 text-[10px] font-medium text-foreground">{tr("Assets","Varlıklar")}</div></div>
    </div>

    <div className="mt-3 rounded-xl border border-border bg-card p-3">
      <div className="grid gap-2 md:grid-cols-[1.3fr_auto_auto]">
        <input aria-label={tr("Search nodes…","Düğümlerde ara…")} value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr("Search nodes…","Düğümlerde ara…")} className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
        <div className="zaf-graph-filter-group min-w-0">
          <div className="zaf-graph-filter-options flex flex-wrap gap-1" aria-label={tr("Network Filter","Ağ Filtresi")}>
            {(["all","mainnet","testnet","unknown"] as const).map(item=><button key={item} type="button" onClick={()=>setScope(item)} className={"rounded-md border px-2.5 py-1.5 text-[10px] font-medium "+(scope===item?"border-foreground bg-foreground text-background":"border-border text-muted-foreground")}>{item==="all"?tr("All Networks","Tüm Ağlar"):scopeLabel(item,locale)}</button>)}
          </div>
        </div>
        <div className="zaf-graph-filter-group min-w-0">
          <div className="zaf-graph-filter-options flex flex-wrap gap-1" aria-label={tr("Node Type","Düğüm Tipi")}>
            {(["all","network","app","asset","pool","launch","evidence"] as const).map(item=><button key={item} type="button" onClick={()=>setKind(item)} className={"rounded-md border px-2.5 py-1.5 text-[10px] font-medium "+(kind===item?"border-foreground bg-foreground text-background":"border-border text-muted-foreground")}>{item==="all"?tr("All Types","Tüm Tipler"):typeLabel(item,locale)}</button>)}
          </div>
        </div>
      </div>
    </div>

    <div className="mt-3 grid gap-3 zaf-graph-layout lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-2">
        <div className="zaf-relationship-map" aria-label={tr("Ecosystem relationship graph","Ekosistem ilişki grafiği")}>
          {(["mainnet", "testnet", "unknown"] as Scope[]).map(network => {
            const nodes = visible.filter(node => node.networkScope === network);
            if (!nodes.length) return null;
            return <section key={network} className="zaf-relationship-lane">
              <h3>{scopeLabel(network,locale)} <span className="ty-nums">{nodes.length}</span></h3>
              <ol>
                {nodes.map(node => <li key={node.id}>
                  <button type="button" aria-pressed={selectedNode?.id === node.id} onClick={()=>setSelectedNode(node)}>
                    <span className="zaf-relationship-dot" aria-hidden="true" />
                    <span className="min-w-0"><strong>{node.label}</strong><small>{typeLabel(node.type,locale)} · {graphEdges.filter(edge=>edge.from===node.id||edge.to===node.id).length} {tr("Visible relationships","Görünür ilişkiler")}</small></span>
                  </button>
                </li>)}
              </ol>
            </section>;
          })}
        </div>
        <p className="p-2 text-[10px] text-muted-foreground">{tr("Displayed nodes","Gösterilen düğümler")}: {visible.length} / {filtered.length}</p>
      </div>

      <aside className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Node Details","Düğüm Detayları")}</div>
        {!selectedNode ? <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{tr("Select a node in the graph to inspect its observable metadata.","Gözlemlenebilir üst verisini incelemek için grafikte bir düğüm seçin.")}</p> : <div className="mt-3">
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="break-words text-sm font-semibold text-foreground">{selectedNode.label}</div><div className="mt-1 text-[9px] text-muted-foreground">{typeLabel(selectedNode.type,locale)} · {scopeLabel(selectedNode.networkScope,locale)}</div></div><span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">{selectedNode.status==="published-evidence"?tr("Published Evidence","Yayınlanmış Kanıt"):tr("Observed","Gözlemlendi")}</span></div>
          <p className="mt-3 break-words text-[10px] leading-relaxed text-muted-foreground">{selectedNode.detail}</p>
          {Object.entries(selectedNode.metadata).length ? <div className="mt-3 space-y-1.5">{Object.entries(selectedNode.metadata).map(([key,value])=><div key={key} className="flex items-start justify-between gap-2 text-[9px]"><span className="min-w-0 break-words text-muted-foreground">{key}</span><span className="max-w-[180px] break-words text-right text-foreground">{value==null?"—":String(value)}</span></div>)}</div>:null}
          {selectedNode.href ? <a href={selectedNode.href} target="_blank" rel="noreferrer" className="mt-3 inline-block max-w-full break-all text-[9px] text-foreground underline underline-offset-2">{tr("Open source","Kaynağı aç")}</a>:null}
          <div className="mt-3"><div className="text-[9px] font-medium text-foreground">{tr("Connected relationships","Bağlı ilişkiler")}</div><div className="mt-1 space-y-1.5">{selectedEdges.slice(0,10).map(edge=><div key={edge.id} className="rounded-md border border-border p-2 text-[9px] leading-relaxed text-muted-foreground">{data?.nodes.find(node=>node.id===edge.from)?.label} → {data?.nodes.find(node=>node.id===edge.to)?.label}<br />{relationshipLabel(edge.relation,locale)}</div>)}{!selectedEdges.length?<div className="text-[9px] text-muted-foreground">{tr("No visible relationships under the current filters.","Mevcut filtrelerde görünür ilişki yok.")}</div>:null}</div></div>
        </div>}
      </aside>
    </div>

    <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-foreground">{tr("Graph Scope","Graf Kapsamı")}</div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{tr("This graph joins only observable or explicitly published relationships. It does not infer ownership, legitimacy, security, hidden wallets, or private application connections. Network scope follows source metadata; where scope is unknown, the node stays unknown.", "Bu grafik yalnızca gözlemlenebilir veya açıkça yayınlanmış ilişkileri birleştirir. Sahiplik, meşruiyet, güvenlik, gizli cüzdanlar veya özel uygulama bağlantıları çıkarılmaz. Ağ kapsamı kaynak metadatasını izler; kapsam bilinmiyorsa düğüm bilinmeyen olarak kalır.")}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-muted-foreground"><span>{tr("Read-only","Salt-okunur")}</span><span>•</span><span>{tr("Published evidence ≠ live observation","Yayınlanmış kanıt ≠ canlı gözlem")}</span><span>•</span><span>{tr("No inferred relationships","Çıkarımsal ilişki yok")}</span></div>
    </div>
  </section>;
}
