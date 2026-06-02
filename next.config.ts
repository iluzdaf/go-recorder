import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  htmlLimitedBots: /WhatsApp|facebookexternalhit|Facebot|Twitterbot|Slackbot|Discordbot|LinkedInBot|curl/i,
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