import "server-only";

import { Resend } from "resend";
import { createServiceRoleSupabaseClient } from "@/lib/server-supabase";

const FROM_ADDRESS = "FreeAgentStaff <notifications@freeagentstaff.com>";
const DASHBOARD_URL = "https://freeagentstaff.com/dashboard";
const LOGO_URL = "https://freeagentstaff.com/FullLogo-clean-v2.png";

function buildHtml(): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#F2E9D3;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2E9D3;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background-color:#FFFCF3;border-radius:28px;padding:40px 32px;">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:32px;border-top:1px solid #08111F;font-size:0;line-height:0;">&nbsp;</td>
                    <td style="padding:0 10px;white-space:nowrap;font-size:11px;font-weight:bold;letter-spacing:3px;color:#08111F;text-transform:uppercase;">Talent Works Here</td>
                    <td style="width:32px;border-top:1px solid #08111F;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:28px;">
                <img src="${LOGO_URL}" width="160" height="128" alt="FreeAgentStaff" style="display:block;width:160px;height:128px;max-width:100%;" />
              </td>
            </tr>
            <tr>
              <td align="center">
                <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.3;color:#08111F;font-weight:700;">You&rsquo;ve received a new introduction</h1>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    <td style="width:56px;height:3px;background-color:#AFF546;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 4px;">
                <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#0f2744;">An employer would like to connect with you on FreeAgentStaff.</p>
                <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#0f2744;">Log in to view the introduction and choose whether you'd like to accept or decline.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:36px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:999px;background-color:#AFF546;">
                      <a href="${DASHBOARD_URL}" style="display:inline-block;padding:16px 36px;font-size:14px;font-weight:bold;letter-spacing:1px;color:#08111F;text-decoration:none;border-radius:999px;">VIEW INTRODUCTION &rarr;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;">
                <div style="border-top:1px solid rgba(8,17,31,0.14);font-size:0;line-height:0;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:0 14px;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#08111F;text-transform:uppercase;">People</td>
                    <td style="padding:0 14px;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#08111F;text-transform:uppercase;">Opportunities</td>
                    <td style="padding:0 14px;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#08111F;text-transform:uppercase;">Flexibility</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center">
                <p style="margin:0;font-size:12px;font-weight:bold;letter-spacing:1px;color:#08111F;">FREEAGENTSTAFF<span style="color:#4C8C15;">.COM</span></p>
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
    "TALENT WORKS HERE",
    "",
    "You've received a new introduction",
    "",
    "An employer would like to connect with you on FreeAgentStaff.",
    "Log in to view the introduction and choose whether you'd like to accept or decline.",
    "",
    `View Introduction: ${DASHBOARD_URL}`,
    "",
    "People \u00b7 Opportunities \u00b7 Flexibility",
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
