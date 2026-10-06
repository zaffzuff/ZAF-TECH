"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/zaf/i18n";
import { intlLocale } from "@/lib/zaf/i18n";

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

function short(value:string, max=18){
  const clean=value.trim();
  return clean.length>max ? clean.slice(0,max-1)+"…" : clean;
}
function typeLabel(type:NodeType, locale:Locale){
  const map:Record<NodeType,[string,string]> = {
    network:["Network","Ağ"], app:["App","Uygulama"], asset:["Asset","Varlık"], pool:["Pool","Havuz"], launch:["Launch","Launch"], evidence:["Evidence","Kanıt"]
  };
  return map[type][locale==="tr"?1:0];
}
function scopeLabel(scope:Scope, locale:Locale){
  if(locale==="tr") return scope==="mainnet"?"Mainnet":scope==="testnet"?"Testnet":"Bilinmiyor";
  return scope==="mainnet"?"Mainnet":scope==="testnet"?"Testnet":"Unknown";
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
  return map[value]?.[locale==="tr"?1:0] ?? value;
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

  const visible=useMemo(()=>filtered.slice(0,54),[filtered]);
  const positionMap=useMemo(()=>{
    const hubs:Record<Scope,{x:number;y:number}>={
      mainnet:{x:170,y:270},testnet:{x:450,y:270},unknown:{x:730,y:270}
    };
    const positions=new Map<string,{x:number;y:number}>();
    (data?.nodes??[]).filter(node=>node.type==="network").forEach(node=>positions.set(node.id,hubs[node.networkScope]));
    const grouped:Record<Scope,GraphNode[]>={mainnet:[],testnet:[],unknown:[]};
    visible.filter(node=>node.type!=="network").forEach(node=>grouped[node.networkScope].push(node));
    (Object.keys(grouped) as Scope[]).forEach(scopeKey=>{
      const group=grouped[scopeKey];
      const hub=hubs[scopeKey];
      group.forEach((node,index)=>{
        const angle=(index/group.length)*Math.PI*2 - Math.PI/2;
        const radius=group.length<=5?92:118;
        positions.set(node.id,{x:hub.x+Math.cos(angle)*radius,y:hub.y+Math.sin(angle)*radius});
      });
    });
    return positions;
  },[data,visible]);

  const visibleIds=new Set(visible.map(node=>node.id));
  const graphEdges=(data?.edges??[]).filter(edge=>visibleIds.has(edge.from)&&visibleIds.has(edge.to));
  const displayNodes=visible.filter(node=>node.type!=="network");
  const networkNodes=(data?.nodes??[]).filter(node=>node.type==="network");
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
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr("Search nodes…","Düğümlerde ara…")} className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
        <div className="min-w-0 overflow-x-auto ty-no-scrollbar">
          <div className="flex min-w-max gap-1" aria-label={tr("Network Filter","Ağ Filtresi")}>
            {(["all","mainnet","testnet","unknown"] as const).map(item=><button key={item} type="button" onClick={()=>setScope(item)} className={"rounded-md border px-2.5 py-1.5 text-[10px] font-medium "+(scope===item?"border-foreground bg-foreground text-background":"border-border text-muted-foreground")}>{item==="all"?tr("All Networks","Tüm Ağlar"):scopeLabel(item,locale)}</button>)}
          </div>
        </div>
        <div className="min-w-0 overflow-x-auto ty-no-scrollbar">
          <div className="flex min-w-max gap-1" aria-label={tr("Node Type","Düğüm Tipi")}>
            {(["all","network","app","asset","pool","launch","evidence"] as const).map(item=><button key={item} type="button" onClick={()=>setKind(item)} className={"rounded-md border px-2.5 py-1.5 text-[10px] font-medium "+(kind===item?"border-foreground bg-foreground text-background":"border-border text-muted-foreground")}>{item==="all"?tr("All Types","Tüm Tipler"):typeLabel(item,locale)}</button>)}
          </div>
        </div>
      </div>
    </div>

    <div className="mt-3 grid gap-3 zaf-graph-layout lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-2">
        <svg viewBox="0 0 900 540" className="zaf-graph-canvas h-auto w-full" role="img" aria-label={tr("Ecosystem relationship graph","Ekosistem ilişki grafiği")}>
          <rect x="0" y="0" width="900" height="540" fill="transparent" />
          {graphEdges.map(edge=>{
            const from=positionMap.get(edge.from); const to=positionMap.get(edge.to);
            if(!from||!to) return null;
            const focused=selectedNode && (edge.from===selectedNode.id||edge.to===selectedNode.id);
            return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeOpacity={focused?0.75:0.22} strokeWidth={focused?2.2:1.1} vectorEffect="non-scaling-stroke" />;
          })}
          {networkNodes.map(node=>{
            const p=positionMap.get(node.id); if(!p) return null;
            return <g key={node.id}>
              <circle cx={p.x} cy={p.y} r="34" fill="currentColor" opacity="0.08" />
              <circle cx={p.x} cy={p.y} r="26" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.5" />
              <text x={p.x} y={p.y+4} textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">{node.label}</text>
            </g>;
          })}
          {displayNodes.map(node=>{
            const p=positionMap.get(node.id); if(!p) return null;
            const selected=selectedNode?.id===node.id;
            const radius=node.type==="pool"?13:node.type==="launch"?16:node.type==="evidence"?14:11;
            return <g key={node.id} onClick={()=>setSelectedNode(node)} className="cursor-pointer">
              <title>{node.label} — {node.detail}</title>
              <circle cx={p.x} cy={p.y} r={selected?radius+4:radius} fill="currentColor" opacity={selected?0.24:0.12} stroke="currentColor" strokeWidth={selected?2:1} />
              <text x={p.x} y={p.y+28} textAnchor="middle" fontSize="9" fill="currentColor">{short(node.label)}</text>
            </g>;
          })}
        </svg>
      </div>

      <aside className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs font-semibold text-foreground">{tr("Node Details","Düğüm Detayları")}</div>
        {!selectedNode ? <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{tr("Select a node in the graph to inspect its observable metadata.","Gözlemlenebilir üst verisini incelemek için grafikte bir düğüm seçin.")}</p> : <div className="mt-3">
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="break-words text-sm font-semibold text-foreground">{selectedNode.label}</div><div className="mt-1 text-[9px] text-muted-foreground">{typeLabel(selectedNode.type,locale)} · {scopeLabel(selectedNode.networkScope,locale)}</div></div><span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">{selectedNode.status==="published-evidence"?tr("Published Evidence","Yayınlanmış Kanıt"):tr("Observed","Gözlemlendi")}</span></div>
          <p className="mt-3 break-words text-[10px] leading-relaxed text-muted-foreground">{selectedNode.detail}</p>
          {Object.entries(selectedNode.metadata).length ? <div className="mt-3 space-y-1.5">{Object.entries(selectedNode.metadata).map(([key,value])=><div key={key} className="flex items-start justify-between gap-2 text-[9px]"><span className="text-muted-foreground">{key}</span><span className="max-w-[180px] break-words text-right text-foreground">{value==null?"—":String(value)}</span></div>)}</div>:null}
          {selectedNode.href ? <a href={selectedNode.href} target="_blank" rel="noreferrer" className="mt-3 inline-block max-w-full break-all text-[9px] text-foreground underline underline-offset-2">{tr("Open source","Kaynağı aç")}</a>:null}
          <div className="mt-3"><div className="text-[9px] font-medium text-foreground">{tr("Connected relationships","Bağlı ilişkiler")}</div><div className="mt-1 space-y-1.5">{selectedEdges.slice(0,10).map(edge=><div key={edge.id} className="rounded-md border border-border p-2 text-[9px] leading-relaxed text-muted-foreground">{relationshipLabel(edge.relation,locale)}</div>)}{!selectedEdges.length?<div className="text-[9px] text-muted-foreground">{tr("No visible relationships under the current filters.","Mevcut filtrelerde görünür ilişki yok.")}</div>:null}</div></div>
        </div>}
      </aside>
    </div>

    <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-foreground">{tr("Graph Scope","Graf Kapsamı")}</div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{tr("This graph joins only observable or explicitly published relationships. It does not infer ownership, legitimacy, security, hidden wallets, or private application connections. Network scope follows source metadata; where scope is unknown, the node stays unknown.", "Bu grafik yalnızca gözlemlenebilir veya açıkça yayınlanmış ilişkileri birleştirir. Sahiplik, meşruiyet, güvenlik, gizli cüzdanlar veya özel uygulama bağlantıları çıkarılmaz. Ağ kapsamı kaynak metadatasını izler; kapsam bilinmiyorsa düğüm bilinmeyen olarak kalır.")}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-muted-foreground"><span>read-only</span><span>•</span><span>{tr("Published evidence ≠ live observation","Yayınlanmış kanıt ≠ canlı gözlem")}</span><span>•</span><span>{tr("No inferred relationships","Çıkarımsal ilişki yok")}</span></div>
    </div>
  </section>;
}
