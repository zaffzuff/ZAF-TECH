import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  const tr = new URL(request.url).searchParams.get("lang") === "tr";
  // No redirect-only bounce: WebKit requires an actual first-party interaction.
  return new Response(`<!doctype html><html lang="${tr ? "tr" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZAF Tech — ${tr ? "Oturumu etkinleştir" : "Enable session"}</title><style>body{margin:0;padding:24px;background:#f8f7fb;color:#20202b;font:16px/1.6 system-ui}main{max-width:440px;margin:8vh auto;padding:24px;background:white;border:1px solid #ddd;border-radius:18px}img{width:64px;height:64px}h1{font-size:24px}button{font:inherit;background:#713b97;color:white;border:0;border-radius:10px;padding:12px 18px;cursor:pointer;max-width:100%}a{color:#713b97}p{overflow-wrap:anywhere}</style></head><body><main><img src="/zaf-tech-logo.png" alt="ZAF Tech"><h1>${tr ? "ZAF Tech oturumunu etkinleştir" : "Enable your ZAF Tech session"}</h1><p>${tr ? "iPhone’un bu sürümü, Pi içinde oturumu korumak için ZAF Tech’i önce doğrudan ziyaret etmeni gerektiriyor." : "This iPhone version needs a direct visit to ZAF Tech before it can keep your session inside Pi."}</p><p>${tr ? "Devam et, ardından Pi uygulamasında ‘Oturumu sürdür’ düğmesine dokun. Tarayıcı ZAF Tech için oturum izni sorarsa izin ver." : "Continue, then tap ‘Resume session’ in the Pi app. If the browser asks to allow session access for ZAF Tech, choose Allow."}</p><form method="post" action="/signin/storage"><button type="submit">${tr ? "Devam et ve Pi’ye dön" : "Continue and return to Pi"}</button></form><p>${tr ? "Bu adım ödeme başlatmaz veya Pi hesabına erişim izni vermez." : "This step does not start a payment or grant access to your Pi account."}</p><a href="${ZAF_PI_APP_URL}">${tr ? "Etkinleştirmeden geri dön" : "Go back without enabling"}</a></main></body></html>`, { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
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
