"use client";

import type { Locale } from "@/lib/zaf/i18n";
import type { RadarObservation } from "@/lib/zaf/radar";
import type { ZafSnapshot } from "@/lib/zaf/types";

function sourceStamp(value: string | null | undefined) {
  if (!value) return "—";
  const match = value.match(/^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]} UTC` : "—";
}

function Icon({ kind, size = 20 }: { kind: "verified" | "observed" | "limited"; size?: number }) {
  const body = {
    verified: <><path d="m5 12 4 4L19 6" /><path d="M12 3 20 7v5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V7l8-4Z" /></>,
    observed: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2" /><path d="M12 4.5V3M12 21v-1.5M4.5 12H3M21 12h-1.5" /></>,
    limited: <><path d="M12 4v10" /><circle cx="12" cy="18" r="1" /></>,
  }[kind];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{body}</svg>;
}

export function ZafTrust({ locale, snapshot, radar }: { locale: Locale; snapshot: ZafSnapshot | null; radar: RadarObservation | null }) {
  const total = radar?.sourceCoverage.total ?? 0;
  const available = radar?.sourceCoverage.available ?? 0;
  const coverage = total ? Math.round((available / total) * 100) : 0;
  const confidence = radar?.confidence.score ?? 0;
  const isTr = locale === "tr";
  const scope = snapshot?.networkScope === "mainnet" ? (isTr ? "Pi Mainnet" : "Pi Mainnet") : snapshot?.networkScope === "testnet" ? (isTr ? "Pi Testnet" : "Pi Testnet") : "—";
  const source = snapshot?.source ?? "—";
  return <section className="mt-5 sm:mt-7">
    <div className="mb-4"><h2 className="text-base font-semibold text-foreground">ZAF Trust</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">{isTr ? "ZAF TECH gözlemlenen veriyi doğrulanmamış iddialardan ayırır. Bu alan güvenlik veya finansal meşruiyet garantisi değildir." : "ZAF TECH separates observed evidence from unverified claims. This is not a guarantee of security or financial legitimacy."}</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="zaf-trust-card"><Icon kind="verified" /><div><strong>{isTr ? "Gözlemlenebilir" : "Observable"}</strong><span>{isTr ? "Herkese açık kaynaklardan doğrudan görülebilen sinyaller." : "Signals directly visible from public sources."}</span></div></div>
      <div className="zaf-trust-card"><Icon kind="observed" /><div><strong>{isTr ? "Kanıt tabanı" : "Evidence base"}</strong><span>{coverage}% {isTr ? "kaynak kapsamı · " : "source coverage · "}{confidence}% {isTr ? "güven" : "confidence"}</span></div></div>
      <div className="zaf-trust-card"><Icon kind="limited" /><div><strong>{isTr ? "Sınırlar" : "Boundaries"}</strong><span>{isTr ? "Özel kullanıcı verisi, sahiplik ve kapalı backend faaliyeti doğrulanmaz." : "Private user activity, ownership and closed backend activity are not verified."}</span></div></div>
    </div>
    <div className="mt-3 grid gap-2 rounded-2xl border border-border bg-background p-3 text-[10px] sm:grid-cols-3">
      <div><span className="block text-muted-foreground">{isTr ? "Gözlem kapsamı" : "Observation scope"}</span><strong className="mt-0.5 block text-foreground">{scope}</strong></div>
      <div><span className="block text-muted-foreground">{isTr ? "Kaynak" : "Source"}</span><strong className="mt-0.5 block truncate text-foreground">{source}</strong></div>
      <div><span className="block text-muted-foreground">{isTr ? "Gözlem zamanı" : "Observed at"}</span><strong className="mt-0.5 block text-foreground">{sourceStamp(radar?.generatedAt ?? snapshot?.generatedAt)}</strong></div>
    </div>
    <div className="mt-3 rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-foreground">{isTr ? "Evidence model" : "Evidence model"}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="zaf-trust-evidence"><span className="zaf-trust-icon"><Icon kind="verified" size={15} /></span><div><strong>{isTr ? "Gözlemlendi" : "Observed"}</strong><p>{isTr ? "Public URL, HTTP yanıtı, public Mainnet kaydı, ekosistem metaverisi veya yerel Node sinyali." : "Public URL, HTTP response, public Mainnet record, ecosystem metadata or local Node signal."}</p></div></div>
        <div className="zaf-trust-evidence"><span className="zaf-trust-icon zaf-trust-icon-muted"><Icon kind="limited" size={15} /></span><div><strong>{isTr ? "Doğrulanmadı" : "Not verified"}</strong><p>{isTr ? "Sahiplik, özel aktivite, uygulama güvenliği, finansal meşruiyet veya gelecek planları." : "Ownership, private activity, application security, financial legitimacy or future plans."}</p></div></div>
      </div>
    </div>
    <div className="mt-3 rounded-2xl border border-border bg-background p-4 text-[10px] leading-relaxed text-muted-foreground">{isTr ? "ZAF Trust kesinlik satmaz. Kullanıcıya hangi kanıtın gerçekten gözlemlendiğini ve hangi iddianın gözlemlenemediğini gösterir." : "ZAF Trust does not sell certainty. It shows what evidence was actually observed and which claims remain outside the observable boundary."}</div>
  </section>;
}
