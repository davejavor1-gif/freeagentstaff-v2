import "server-only";

import { Resend } from "resend";

const FROM_ADDRESS = "FreeAgentStaff <notifications@freeagentstaff.com>";
const LOGO_URL = "https://freeagentstaff.com/FullLogo-clean-v2.png";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function firstName(fullName: string) {
  const part = fullName.trim().split(/\s+/).find(Boolean);
  return part || "there";
}

function buildHtml(params: {
  refereeFirstName: string;
  talentFirstName: string;
  invitationUrl: string;
}) {
  const referee = escapeHtml(params.refereeFirstName);
  const talent = escapeHtml(params.talentFirstName);
  const url = escapeHtml(params.invitationUrl);

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
                <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#08111F;font-weight:700;">Professional reference request</h1>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    <td style="width:56px;height:3px;background-color:#AFF546;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 4px;">
                <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#0f2744;">Hi ${referee},</p>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#0f2744;">${talent} has invited you to provide a professional reference through FreeAgentStaff.</p>
                <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#0f2744;">Your reference will be kept private and can only be shared by ${talent} with Employers they connect with. You do not need a FreeAgentStaff account.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:999px;background-color:#AFF546;">
                      <a href="${url}" style="display:inline-block;padding:16px 36px;font-size:14px;font-weight:bold;letter-spacing:1px;color:#08111F;text-decoration:none;border-radius:999px;">PROVIDE REFERENCE</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:36px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#0f2744;">This invitation expires in 14 days.</p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;">
                <div style="border-top:1px solid rgba(8,17,31,0.14);font-size:0;line-height:0;">&nbsp;</div>
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

function buildText(params: {
  refereeFirstName: string;
  talentFirstName: string;
  invitationUrl: string;
}) {
  return [
    `Hi ${params.refereeFirstName},`,
    "",
    `${params.talentFirstName} has invited you to provide a professional reference through FreeAgentStaff.`,
    "",
    `Your reference will be kept private and can only be shared by ${params.talentFirstName} with Employers they connect with.`,
    "You do not need a FreeAgentStaff account.",
    "",
    `Provide reference: ${params.invitationUrl}`,
    "",
    "This invitation expires in 14 days.",
    "",
    "FreeAgentStaff",
  ].join("\n");
}

export async function sendTalentReferenceInvitationEmail(params: {
  refereeEmail: string;
  refereeName: string;
  talentDisplayName: string;
  invitationUrl: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("sendTalentReferenceInvitationEmail: missing RESEND_API_KEY.");
    return { ok: false, message: "Reference invitations are temporarily unavailable." };
  }

  try {
    const refereeFirstName = firstName(params.refereeName);
    const talentFirstName = firstName(params.talentDisplayName);
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.refereeEmail,
      subject: `${talentFirstName} has requested a professional reference`,
      html: buildHtml({
        refereeFirstName,
        talentFirstName,
        invitationUrl: params.invitationUrl,
      }),
      text: buildText({
        refereeFirstName,
        talentFirstName,
        invitationUrl: params.invitationUrl,
      }),
    });

    if (error) {
      console.error("sendTalentReferenceInvitationEmail: Resend rejected send.", {
        name: error.name,
        message: error.message,
      });
      return { ok: false, message: "We couldn't send the invitation email. Please try again." };
    }

    return { ok: true };
  } catch (error) {
    console.error("sendTalentReferenceInvitationEmail: send failed.", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, message: "We couldn't send the invitation email. Please try again." };
  }
}
