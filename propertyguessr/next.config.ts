import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Bypass Vercel's image optimizer entirely. Every <Image> must pass
    // `loader={imageLoader}`; see src/lib/imageLoader.ts for why.
    loader: "custom",
  },
};

export default nextConfig;
