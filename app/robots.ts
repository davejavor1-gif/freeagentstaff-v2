import type { MetadataRoute } from "next";

const siteUrl = "https://freeagentstaff.com/";
const privateDisallowRules = [
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
  "/profile/",
  "/login",
  "/employer/auth",
  "/forgot-password",
  "/reset-password",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "facebookexternalhit",
        allow: ["/", "/talent/"],
        disallow: privateDisallowRules,
      },
      {
        userAgent: "Facebot",
        allow: ["/", "/talent/"],
        disallow: privateDisallowRules,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          ...privateDisallowRules,
          // Talent Passports are gated to the owner or verified employers, so crawlers only ever reach a sign-in wall.
          "/talent/",
        ],
      },
    ],
    sitemap: `${siteUrl}sitemap.xml`,
    host: siteUrl,
  };
}
