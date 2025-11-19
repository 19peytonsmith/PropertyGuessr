import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "photos.zillowstatic.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
