import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { assertPiSameOrigin } from "@/lib/zaf/pi/auth-input";
import { ZAF_PI_APP_URL } from "@/lib/zaf/pi/native-context";

export const dynamic = "force-dynamic";
const headers = {
  // no-referrer turns a native form POST's Origin into null. Preserve only
  // same-origin information; disclose no referrer on the fixed PiNet return.
  "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  // WebKit applies form-action to redirects too: allow only our fixed return.
  "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self' ${ZAF_PI_APP_URL}; frame-ancestors 'none'; base-uri 'none'`,
};

// Default to a useful, anonymous recovery screen even if scripts are disabled.
// Only a genuinely top-level document can offer the first-party visit form.
const contextScript = `if (window.parent === window) { document.getElementById("first-party").hidden = false; document.getElementById("embedded").hidden = true; }`;
const contextScriptHash = createHash("sha256").update(contextScript).digest("base64");
const recoveryHeaders = {
  "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "same-origin",
  // Pi Browser can wrap even a target=_top navigation in its native shell.
  // This GET contains no identity, cookies or automatic navigation. Keep the
  // actual POST bootstrap and its strict origin/frame policy unchanged.
  "Content-Security-Policy": `default-src 'none'; script-src 'sha256-${contextScriptHash}'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self' ${ZAF_PI_APP_URL}; frame-ancestors 'self' https://app-cdn.minepi.com ${ZAF_PI_APP_URL} https://appstudio-u7cm9zhmha0ruwv8.piappengine.com; base-uri 'none'`,
};

export async function GET(request: Request) {
  const tr = new URL(request.url).searchParams.get("lang") === "tr";
  // No redirect-only bounce: WebKit requires an actual first-party interaction.
  return new Response(`<!doctype html><html lang="${tr ? "tr" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZAF Tech — ${tr ? "Oturumu sürdür" : "Resume session"}</title><style>body{margin:0;padding:24px;background:#f8f7fb;color:#20202b;font:16px/1.6 system-ui}main{max-width:440px;margin:8vh auto;padding:24px;background:white;border:1px solid #ddd;border-radius:18px}img{width:64px;height:64px}h1{font-size:24px}button{font:inherit;background:#713b97;color:white;border:0;border-radius:10px;padding:12px 18px;cursor:pointer;max-width:100%}a{color:#713b97}p{overflow-wrap:anywhere}[hidden]{display:none!important}</style></head><body><main><img src="/zaf-tech-logo.png" alt="ZAF Tech"><section id="embedded"><h1>${tr ? "ZAF Tech’i Pi içinde aç" : "Open ZAF Tech in Pi"}</h1><p>${tr ? "Bu tarayıcı ZAF Tech oturumuna erişemedi. Kayıtlı Pi uygulamasına dönüp giriş yapmayı veya oturumu sürdürmeyi dene." : "This browser could not access your ZAF Tech session. Return to the registered Pi app and try signing in or resuming your session."}</p></section><section id="first-party" hidden><h1>${tr ? "ZAF Tech oturumunu etkinleştir" : "Enable your ZAF Tech session"}</h1><p>${tr ? "Devam et, ardından Pi uygulamasında ‘Oturumu sürdür’ düğmesine dokun. Tarayıcı ZAF Tech için oturum izni sorarsa izin ver." : "Continue, then tap ‘Resume session’ in the Pi app. If the browser asks to allow session access for ZAF Tech, choose Allow."}</p><form method="post" action="/signin/storage"><button type="submit">${tr ? "Devam et ve Pi’ye dön" : "Continue and return to Pi"}</button></form><p>${tr ? "Bu adım ödeme başlatmaz veya Pi hesabına erişim izni vermez." : "This step does not start a payment or grant access to your Pi account."}</p></section><a href="${ZAF_PI_APP_URL}" target="_top">${tr ? "ZAF Tech’i Pi’de aç" : "Open ZAF Tech in Pi"}</a></main><script>${contextScript}</script></body></html>`, { headers: { ...recoveryHeaders, "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(request: Request) {
  try { assertPiSameOrigin(request); }
  catch { return NextResponse.json({ error: "A same-origin request is required." }, { status: 403, headers }); }
  const response = NextResponse.redirect(ZAF_PI_APP_URL, { status: 303, headers });
  // Harmless first-party visit marker, not identity or an authentication bypass.
  response.cookies.set("__Host-zaf-pi-storage-visit", "1", {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 1800,
  });
  return response;
}
