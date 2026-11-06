import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@snotel/core"],
  async redirects() {
    return [
      {
        source: "/basins",
        has: [{ type: "query", key: "basin", value: "(?<huc>\\d+)" }],
        destination: "/basins/:huc",
        permanent: true,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
};

export default nextConfig;
