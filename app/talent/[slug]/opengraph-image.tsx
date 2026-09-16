import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadPublicTalentPassport } from "@/lib/discovery-access";

export const alt = "FreeAgentStaff Talent Passport";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const runtime = "nodejs";

const colors = {
  navy: "#08111F",
  cream: "#F7EBCF",
  mutedCream: "rgba(247,235,207,0.74)",
  gold: "#CDA64D",
  lime: "#AFF546",
  burgundy: "#651D2A",
};

function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function clampText(value: string | null, maxLength: number) {
  if (!value) return null;
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trimEnd()}...` : value;
}

function fontSizeFor(value: string | null, sizes: { short: number; medium: number; long: number }) {
  const length = value?.length ?? 0;
  if (length > 42) return sizes.long;
  if (length > 26) return sizes.medium;
  return sizes.short;
}

function CompanyLogo({ src }: { src: string }) {
  return (
    <div
      style={{
        width: 760,
        height: 312,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: "translateX(24px)",
      }}
    >
      <img src={src} alt="FreeAgent Staff" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: colors.navy,
        color: colors.cream,
        display: "flex",
        padding: 58,
        position: "relative",
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 28,
          border: `1px solid rgba(205,166,77,0.42)`,
          borderRadius: 34,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          borderRadius: 999,
          right: -260,
          top: -230,
          background: "radial-gradient(circle, rgba(175,245,70,0.22) 0%, rgba(175,245,70,0.07) 34%, rgba(175,245,70,0) 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: 999,
          left: -180,
          bottom: -220,
          background: "radial-gradient(circle, rgba(205,166,77,0.18) 0%, rgba(205,166,77,0.04) 42%, rgba(205,166,77,0) 70%)",
        }}
      />
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex" }}>{children}</div>
    </div>
  );
}

function GenericCard({ logoSrc }: { logoSrc: string }) {
  return (
    <Frame>
      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", gap: 58 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 26, maxWidth: 760 }}>
          <div style={{ color: colors.lime, fontSize: 24, fontWeight: 800, letterSpacing: 3 }}>FREEAGENTSTAFF</div>
          <div style={{ fontSize: 82, fontWeight: 850, lineHeight: 0.96 }}>Talent Passport</div>
          <div style={{ color: colors.mutedCream, fontSize: 30, lineHeight: 1.3 }}>Professional identity, experience and discovery.</div>
        </div>
        <CompanyLogo src={logoSrc} />
      </div>
    </Frame>
  );
}

function TalentCard({ name, title, location, logoSrc }: { name: string; title: string | null; location: string | null; logoSrc: string }) {
  const displayName = clampText(name, 58) ?? "Talent";
  const displayTitle = clampText(title, 70);
  const displayLocation = clampText(location, 46);
  const nameSize = fontSizeFor(displayName, { short: 78, medium: 66, long: 56 });
  const titleSize = fontSizeFor(displayTitle, { short: 38, medium: 34, long: 30 });

  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: colors.lime, fontSize: 24, fontWeight: 900, letterSpacing: 3 }}>FREEAGENTSTAFF</div>
            <div style={{ color: colors.mutedCream, fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>TALENT PASSPORT</div>
          </div>
          <CompanyLogo src={logoSrc} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 870 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ color: colors.gold, fontSize: 20, fontWeight: 800, letterSpacing: 4 }}>PUBLIC PASSPORT</div>
          </div>
          <div style={{ fontSize: nameSize, fontWeight: 900, lineHeight: 0.96, letterSpacing: -1 }}>{displayName}</div>
          {displayTitle ? <div style={{ color: colors.cream, fontSize: titleSize, fontWeight: 700, lineHeight: 1.12 }}>{displayTitle}</div> : null}
          {displayLocation ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14, color: colors.mutedCream, fontSize: 30, fontWeight: 650 }}>
              <div style={{ width: 14, height: 14, borderRadius: 999, background: colors.lime }} />
              {displayLocation}
            </div>
          ) : null}
        </div>
      </div>
    </Frame>
  );
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = await loadPublicTalentPassport(slug);
  const logo = await readFile(path.join(process.cwd(), "public", "FullLogo-clean-v2.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  if (!payload.allowed || !payload.profile?.slug) {
    return new ImageResponse(<GenericCard logoSrc={logoSrc} />, size);
  }

  const profile = payload.profile;
  const name = cleanText(profile.name) ?? "Talent";
  const title = cleanText(profile.title);
  const location = cleanText(profile.location);

  return new ImageResponse(<TalentCard name={name} title={title} location={location} logoSrc={logoSrc} />, size);
}
