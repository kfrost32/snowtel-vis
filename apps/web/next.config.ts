import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@snotel/core"],
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
};

export default nextConfig;
