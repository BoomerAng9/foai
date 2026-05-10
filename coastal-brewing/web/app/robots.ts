import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: ["GPTBot", "ClaudeBot", "Claude-Bot", "anthropic-ai", "ChatGPT-User", "PerplexityBot", "Google-Extended"], allow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/admin", "/me", "/audit", "/checkout"] },
    ],
    sitemap: "https://brewing.foai.cloud/sitemap.xml",
  };
}
