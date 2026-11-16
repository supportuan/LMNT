import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  serverExternalPackages: ["postgres"],
  async redirects() {
    return [
      { source: "/app/home", destination: "/app/member-view", permanent: true },
      { source: "/app/overview", destination: "/", permanent: false },
      { source: "/app/close-os", destination: "/app/leads/consultation", permanent: true },
      { source: "/app/coach-pro", destination: "/app/programs", permanent: true },
      { source: "/app/workout-planner", destination: "/app/programs", permanent: true },
      { source: "/app/coach-mirror", destination: "/app/development/coach-mirror", permanent: true },
      { source: "/app/sales", destination: "/app/leads", permanent: true },
      { source: "/app/programmes", destination: "/app/programs", permanent: true },
    ];
  },
  async headers() {
    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (process.env.NODE_ENV === "production") {
      headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
    }
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
