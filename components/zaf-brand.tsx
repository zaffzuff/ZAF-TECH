import Image from "next/image";

/** Shared brand artwork: never translate, uppercase or restyle the wordmark. */
export function ZafWordmark({ className = "" }: { className?: string }) {
  return <div className="min-w-0" aria-label="ZAF Tech Testnet">
    <div className={`ty-brand-text zaf-wordmark ${className}`}>ZAF Tech</div>
    <span className="mt-1 inline-block rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-sans text-[10px] font-semibold leading-tight tracking-wide text-foreground">Testnet</span>
  </div>;
}

export function ZafFooterName() {
  return <span className="zaf-footer-wordmark">ZAF Tech</span>;
}

export function ZafBrand({ className = "" }: { className?: string }) {
  return <a href="/" aria-label="ZAF Tech Testnet" className={`zaf-brand-lockup ${className}`}>
    <Image src="/zaf-tech-logo.png?v=20261016" alt="" width={48} height={48} className="h-12 w-12 shrink-0 object-contain" />
    <ZafWordmark />
  </a>;
}
