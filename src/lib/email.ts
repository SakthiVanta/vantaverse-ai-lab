import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD in .env"
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

const FROM = () =>
  process.env.SMTP_FROM ?? "Vantaverse AI Builder Lab <no-reply@vantaverse.ai>";

const wrapper = (title: string, body: string) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:32px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#111117;border-radius:16px;border:1px solid #232330;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 0 32px;">
                <p style="margin:0;color:#8b8ba7;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">Vantaverse · AI Builder Lab</p>
                <h1 style="margin:8px 0 24px 0;color:#f5f5fa;font-size:22px;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px;color:#c8c8d8;font-size:15px;line-height:1.6;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#0d0d13;border-top:1px solid #232330;">
                <p style="margin:0;color:#5a5a72;font-size:12px;">Founding Builders — Cohort 01</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export async function sendOtpEmail(to: string, name: string, code: string) {
  const html = wrapper(
    "Verify your Builder Identity",
    `<p>Hey ${escapeHtml(name)},</p>
     <p>Enter this code to continue into the Lab:</p>
     <p style="font-size:32px;font-weight:700;letter-spacing:0.3em;color:#f5f5fa;margin:24px 0;">${code}</p>
     <p style="color:#8b8ba7;font-size:13px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>`
  );
  return getTransporter().sendMail({
    from: FROM(),
    to,
    subject: "Your Vantaverse verification code",
    html,
  });
}

export async function sendBuilderReportEmail(
  to: string,
  name: string,
  opts: { archetype: string; summary: string; cardImageUrl?: string; reportUrl: string }
) {
  const html = wrapper(
    "Your Vantaverse Builder Identity is ready",
    `<p>Hey ${escapeHtml(name)},</p>
     <p>Your signals have been analyzed. You've been identified as:</p>
     <p style="font-size:22px;font-weight:700;color:#f5f5fa;margin:16px 0;">${escapeHtml(
       opts.archetype
     )}</p>
     <p>${escapeHtml(opts.summary)}</p>
     ${
       opts.cardImageUrl
         ? `<img src="${opts.cardImageUrl}" alt="Builder Card" style="width:100%;border-radius:12px;margin:16px 0;" />`
         : ""
     }
     <p><a href="${opts.reportUrl}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#f5f5fa;color:#0a0a0f;border-radius:8px;text-decoration:none;font-weight:600;">View your full report</a></p>`
  );
  return getTransporter().sendMail({
    from: FROM(),
    to,
    subject: "Your Vantaverse Builder Identity is ready",
    html,
  });
}

export async function sendAssignmentEmail(
  to: string,
  name: string,
  opts: {
    title: string;
    description: string;
    deadline?: string;
    assignmentUrl: string;
  }
) {
  const html = wrapper(
    "New Vantaverse Builder Assignment",
    `<p>Hey ${escapeHtml(name)},</p>
     <p style="font-size:18px;font-weight:700;color:#f5f5fa;">${escapeHtml(opts.title)}</p>
     <p>${escapeHtml(opts.description)}</p>
     ${opts.deadline ? `<p style="color:#8b8ba7;font-size:13px;">Deadline: ${escapeHtml(opts.deadline)}</p>` : ""}
     <p><a href="${opts.assignmentUrl}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#f5f5fa;color:#0a0a0f;border-radius:8px;text-decoration:none;font-weight:600;">Open assignment</a></p>`
  );
  return getTransporter().sendMail({
    from: FROM(),
    to,
    subject: "New Vantaverse Builder Assignment",
    html,
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
