import Image from "next/image";

/** Shared brand artwork: never translate, uppercase or restyle the wordmark. */
export function ZafWordmark({ className = "" }: { className?: string }) {
  return <div className={`ty-brand-text zaf-wordmark ${className}`} aria-label="ZAF Tech">ZAF Tech</div>;
}

export function ZafBrand({ className = "" }: { className?: string }) {
  return <a href="/" aria-label="ZAF Tech" className={`zaf-brand-lockup ${className}`}>
    <Image src="/zaf-tech-logo.png?v=20261016" alt="" width={48} height={48} className="h-12 w-12 shrink-0 object-contain" />
    <ZafWordmark />
  </a>;
}
