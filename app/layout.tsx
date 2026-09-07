import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "../components/PwaRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://freeagentstaff.com/";
const siteTitle = "Free Agent Staff | Talent Discovery & Professional Profiles";
const siteDescription =
  "Free Agent Staff connects employers with talent through professional FreeAgent Cards and Talent Passports. Build your profile, showcase your experience and get discovered.";
const isPreviewDeployment = process.env.VERCEL_ENV === "preview";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08111F",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "FreeAgentStaff",
  manifest: "/manifest.webmanifest",
  title: {
    default: siteTitle,
    template: "%s | Free Agent Staff",
  },
  description: siteDescription,
  robots: isPreviewDeployment
    ? {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      }
    : undefined,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon-v2.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: [{ url: "/favicon.ico" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "FreeAgentStaff",
  },
  openGraph: {
    type: "website",
    siteName: "Free Agent Staff",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/FullLogo-clean-v2.png",
        width: 1280,
        height: 1024,
        alt: "Free Agent Staff",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/FullLogo-clean-v2.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
