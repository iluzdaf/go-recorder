import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "preact$": "react",
      "preact/hooks$": "react",
    };

    return config;
  },
};

export default nextConfig;