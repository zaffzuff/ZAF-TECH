/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve responsive derivatives of the owner's full-resolution PNG.
    unoptimized: false,
  },
  poweredByHeader: false,
  // Embed the server's selected SDK mode in the client build so a URL flag
  // cannot silently switch a hosted Mainnet deployment into Sandbox mode.
  env: {
    NEXT_PUBLIC_PI_SDK_MODE: (process.env.PI_SDK_MODE || process.env.NEXT_PUBLIC_PI_SDK_MODE || "hosted").trim().toLowerCase(),
    NEXT_PUBLIC_PI_SANDBOX_ROUTE: process.env.PI_NETWORK?.trim().toLowerCase() === "testnet" ? "enabled" : "disabled",
  },
  async headers() {
    const sandbox = (process.env.PI_SDK_MODE || process.env.NEXT_PUBLIC_PI_SDK_MODE || "hosted").trim().toLowerCase() === "sandbox" && process.env.PI_NETWORK?.trim().toLowerCase() !== "mainnet";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
      {
        // A standalone, anonymous diagnostic must be visible inside the native
        // browser shell so its actual frame origin can be identified.
        // Storage recovery GET and first-party bootstrap POST supply separate CSPs.
        source: "/((?!browser-check\\.html$|signin/storage/?$|sandbox/?$).*)",
        headers: [
          // Verified on physical iOS Pi Browser: its ancestor is app-cdn.minepi.com.
          // CSP keeps all other external embedders blocked. SAMEORIGIN would
          // conflict with the required cross-origin Pi host, so do not emit it.
          { key: "Content-Security-Policy", value: `connect-src 'self' https://socialchain.app http://127.0.0.1:39100; frame-ancestors 'self' https://app-cdn.minepi.com https://*.pinet.com https://*.minepi.com https://appstudio-u7cm9zhmha0ruwv8.piappengine.com${sandbox ? " https://sandbox.minepi.com" : ""};` },
        ],
      },
      {
        source: "/sandbox",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'self' https://app-cdn.minepi.com https://sandbox.minepi.com;" }],
      },
      {
        // Keep local Next and Vercel responses consistent for native form POSTs.
        source: "/signin/storage",
        headers: [{ key: "Referrer-Policy", value: "same-origin" }],
      },
      {
        source: "/browser-check.html",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none';" },
        ],
      },
    ];
  },
};

export default nextConfig;
