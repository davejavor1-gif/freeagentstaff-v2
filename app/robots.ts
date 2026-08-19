import type { MetadataRoute } from "next";

const siteUrl = "https://freeagentstaff.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/builder",
          "/connections",
          "/notifications",
          "/saved-talent",
          "/settings/",
          "/onboarding/",
          "/find-talent",
          // Talent Passports are gated to the owner or verified employers, so crawlers only ever reach a sign-in wall.
          "/talent/",
          "/profile/",
          "/media-verification",
          "/talent-card-preview",
          "/login",
          "/employer/auth",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
