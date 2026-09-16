import "server-only";

import { Resend } from "resend";
import { createServiceRoleSupabaseClient } from "@/lib/server-supabase";

const FROM_ADDRESS = "FreeAgentStaff <notifications@freeagentstaff.com>";
const DASHBOARD_URL = "https://freeagentstaff.com/dashboard";

function buildHtml(): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;padding:32px;">
            <tr>
              <td>
                <h1 style="font-size:20px;margin:0 0 16px;color:#111111;">You've received a new introduction</h1>
                <p style="font-size:14px;line-height:1.5;color:#333333;margin:0 0 12px;">An employer would like to connect with you on FreeAgentStaff.</p>
                <p style="font-size:14px;line-height:1.5;color:#333333;margin:0 0 24px;">Log in to view the introduction and choose whether you'd like to accept or decline.</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:6px;background-color:#111111;">
                      <a href="${DASHBOARD_URL}" style="display:inline-block;padding:12px 24px;font-size:14px;color:#ffffff;text-decoration:none;font-weight:bold;">View Introduction</a>
                    </td>
                  </tr>
                </table>
                <p style="font-size:12px;color:#999999;margin:32px 0 0;">FreeAgentStaff.com</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildText(): string {
  return [
    "You've received a new introduction",
    "",
    "An employer would like to connect with you on FreeAgentStaff.",
    "Log in to view the introduction and choose whether you'd like to accept or decline.",
    "",
    `View Introduction: ${DASHBOARD_URL}`,
    "",
    "FreeAgentStaff.com",
  ].join("\n");
}

// Looks up the talent's real account email via the service-role client; never exposed to callers.
async function resolveTalentEmailBySlug(talentSlug: string): Promise<string | null> {
  const serviceClient = createServiceRoleSupabaseClient();

  if (!serviceClient) {
    return null;
  }

  const { data: profileRow } = await serviceClient
    .from("profiles")
    .select("user_id")
    .eq("account_type", "talent")
    .eq("slug", talentSlug)
    .maybeSingle<{ user_id: string }>();

  if (!profileRow?.user_id) {
    return null;
  }

  const { data, error } = await serviceClient.auth.admin.getUserById(profileRow.user_id);

  if (error || !data.user?.email) {
    return null;
  }

  return data.user.email;
}

/**
 * Sends the "new introduction request" notification email to a talent.
 * Never throws — all failures are caught and logged so email delivery can
 * never break the introduction request flow that triggers it.
 */
export async function sendNewIntroductionRequestEmail(talentSlug: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("sendNewIntroductionRequestEmail: missing RESEND_API_KEY env var, skipping send.");
    return;
  }

  try {
    const talentEmail = await resolveTalentEmailBySlug(talentSlug);

    if (!talentEmail) {
      console.error("sendNewIntroductionRequestEmail: no valid talent email found for slug", talentSlug);
      return;
    }

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: talentEmail,
      subject: "You have a new introduction on FreeAgentStaff",
      html: buildHtml(),
      text: buildText(),
    });
  } catch (error) {
    console.error("sendNewIntroductionRequestEmail: failed to send introduction request email.", error);
  }
}
