"use client";

import { translate } from "@/lib/zaf/i18n";
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
  const tx = (en: string, trText: string) => translate(locale, en, trText);
  const scope = snapshot?.networkScope === "mainnet" ? (tx("Pi Mainnet", "Pi Mainnet")) : snapshot?.networkScope === "testnet" ? (tx("Pi Testnet", "Pi Testnet")) : "—";
  const source = snapshot?.source ?? "—";
  return <section className="mt-5 sm:mt-7">
    <div className="mb-4"><h2 className="text-base font-semibold text-foreground">ZAF Trust</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">{tx("ZAF TECH separates observed evidence from unverified claims. This is not a guarantee of security or financial legitimacy.", "ZAF TECH gözlemlenen veriyi doğrulanmamış iddialardan ayırır. Bu alan güvenlik veya finansal meşruiyet garantisi değildir.")}</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="zaf-trust-card"><Icon kind="verified" /><div><strong>{tx("Observable", "Gözlemlenebilir")}</strong><span>{tx("Signals directly visible from public sources.", "Herkese açık kaynaklardan doğrudan görülebilen sinyaller.")}</span></div></div>
      <div className="zaf-trust-card"><Icon kind="observed" /><div><strong>{tx("Evidence base", "Kanıt tabanı")}</strong><span>{coverage}% {tx("source coverage · ", "kaynak kapsamı · ")}{confidence}% {tx("confidence", "güven")}</span></div></div>
      <div className="zaf-trust-card"><Icon kind="limited" /><div><strong>{tx("Boundaries", "Sınırlar")}</strong><span>{tx("Private user activity, ownership and closed backend activity are not verified.", "Özel kullanıcı verisi, sahiplik ve kapalı backend faaliyeti doğrulanmaz.")}</span></div></div>
    </div>
    <div className="mt-3 grid gap-2 rounded-2xl border border-border bg-background p-3 text-[10px] sm:grid-cols-3">
      <div><span className="block text-muted-foreground">{tx("Observation scope", "Gözlem kapsamı")}</span><strong className="mt-0.5 block text-foreground">{scope}</strong></div>
      <div><span className="block text-muted-foreground">{tx("Source", "Kaynak")}</span><strong className="mt-0.5 block truncate text-foreground">{source}</strong></div>
      <div><span className="block text-muted-foreground">{tx("Observed at", "Gözlem zamanı")}</span><strong className="mt-0.5 block text-foreground">{sourceStamp(radar?.generatedAt ?? snapshot?.generatedAt)}</strong></div>
    </div>
    <div className="mt-3 rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-foreground">{tx("Evidence model", "Evidence model")}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="zaf-trust-evidence"><span className="zaf-trust-icon"><Icon kind="verified" size={15} /></span><div><strong>{tx("Observed", "Gözlemlendi")}</strong><p>{tx("Public URL, HTTP response, public Mainnet record, ecosystem metadata or local Node signal.", "Public URL, HTTP yanıtı, public Mainnet kaydı, ekosistem metaverisi veya yerel Node sinyali.")}</p></div></div>
        <div className="zaf-trust-evidence"><span className="zaf-trust-icon zaf-trust-icon-muted"><Icon kind="limited" size={15} /></span><div><strong>{tx("Not verified", "Doğrulanmadı")}</strong><p>{tx("Ownership, private activity, application security, financial legitimacy or future plans.", "Sahiplik, özel aktivite, uygulama güvenliği, finansal meşruiyet veya gelecek planları.")}</p></div></div>
      </div>
    </div>
    <div className="mt-3 rounded-2xl border border-border bg-background p-4 text-[10px] leading-relaxed text-muted-foreground">{tx("ZAF Trust does not sell certainty. It shows what evidence was actually observed and which claims remain outside the observable boundary.", "ZAF Trust kesinlik satmaz. Kullanıcıya hangi kanıtın gerçekten gözlemlendiğini ve hangi iddianın gözlemlenemediğini gösterir.")}</div>
  </section>;
}
