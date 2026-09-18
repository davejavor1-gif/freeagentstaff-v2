import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Free Agent Staff",
    short_name: "Free Agent Staff",
    description:
      "Free Agent Staff connects employers with talent through professional FreeAgent Cards and Talent Passports.",
    start_url: "/",
    display: "standalone",
    background_color: "#08111F",
    theme_color: "#08111F",
    orientation: "any",
    scope: "/",
    id: "/",
    lang: "en",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
