import { FREEAGENTSTAFF_PRODUCTION_ORIGIN } from "@/lib/site-url";
import { getPublicPassportPath } from "@/lib/passport-share";

const PASSPORT_LOGO_URL = `${FREEAGENTSTAFF_PRODUCTION_ORIGIN}/newpassportlogo.png`;
const PASSPORT_ALT_TEXT = "Free Agent Talent Passport";
const PASSPORT_IMAGE_WIDTH = 150;

type ClipboardCopyResult = "rich" | "plain";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getPublicPassportEmailUrl(slug: string) {
  return `${FREEAGENTSTAFF_PRODUCTION_ORIGIN}${getPublicPassportPath(slug)}`;
}

export function buildLinkedPassportEmailHtml(slug: string) {
  const passportUrl = getPublicPassportEmailUrl(slug);
  const escapedUrl = escapeHtml(passportUrl);
  const escapedAlt = escapeHtml(PASSPORT_ALT_TEXT);

  return `<a href="${escapedUrl}"><img src="${PASSPORT_LOGO_URL}" alt="${escapedAlt}" width="${PASSPORT_IMAGE_WIDTH}" style="display:block;width:${PASSPORT_IMAGE_WIDTH}px;max-width:100%;height:auto;border:0;" /></a>`;
}

async function copyPlainText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through to the legacy selection-based copy path.
    }
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  if (!document.execCommand("copy")) {
    throw new Error("Unable to copy Passport link.");
  }
  input.remove();
}

export async function copyLinkedPassportLogo(slug: string): Promise<ClipboardCopyResult> {
  const passportUrl = getPublicPassportEmailUrl(slug);
  const canWriteRichClipboard = Boolean(
    window.isSecureContext
    && typeof navigator.clipboard?.write === "function"
    && typeof ClipboardItem !== "undefined",
  );

  if (canWriteRichClipboard) {
    try {
      const html = buildLinkedPassportEmailHtml(slug);
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([passportUrl], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return "rich";
    } catch {
      // Fall through to the plain URL path when the browser or target clipboard rejects rich data.
    }
  }

  await copyPlainText(passportUrl);
  return "plain";
}
