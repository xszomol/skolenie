import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
      bodySizeLimit: "50mb",
    },
  },
}

export default nextConfig
