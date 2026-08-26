import type { MetadataRoute } from "next";

const siteUrl = "https://freeagentstaff.com/";

// Public static pages only. Talent Passports are excluded because visibility is decided per viewer at request time.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}about`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}talent`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}employers`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}pricing`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}support`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
