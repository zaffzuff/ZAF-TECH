/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  // Embed the server's selected SDK mode in the client build so a URL flag
  // cannot silently switch a hosted Mainnet deployment into Sandbox mode.
  env: { NEXT_PUBLIC_PI_SDK_MODE: (process.env.PI_SDK_MODE || process.env.NEXT_PUBLIC_PI_SDK_MODE || "hosted").trim().toLowerCase() },
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
        // browser shell so its actual frame origin can be identified. Keep the
        // app and OAuth callback protected until that origin is verified.
        source: "/((?!browser-check\\.html$).*)",
        headers: [
          ...(sandbox ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
          { key: "Content-Security-Policy", value: `frame-ancestors 'self'${sandbox ? " https://sandbox.minepi.com" : ""};` },
        ],
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
