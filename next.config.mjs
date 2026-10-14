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
          ...(sandbox ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
          { key: "Content-Security-Policy", value: `frame-ancestors 'self'${sandbox ? " https://sandbox.minepi.com" : ""};` },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
