import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = "ResqRide <noreply@resqride.co>";

function log(msg: string) {
  console.log(`[EMAIL] ${msg}`);
}

export async function sendPasswordResetEmail(to: string, name: string, code: string): Promise<boolean> {
  if (!resend) { log("No RESEND_API_KEY — skipping password reset email"); return false; }
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your ResqRide password reset code: ${code}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#04060E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#04060E;padding:40px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0D1117;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0A1628 0%,#0D1117 100%);padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:28px;font-weight:800;letter-spacing:-0.5px;">
            <span style="color:#FFFFFF;">Resq</span><span style="color:#0066FF;">Ride</span>
          </span>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:rgba(255,255,255,0.7);font-size:16px;line-height:1.6;margin:0 0 24px;">Hi ${name},</p>
          <p style="color:rgba(255,255,255,0.7);font-size:16px;line-height:1.6;margin:0 0 32px;">We received a request to reset your ResqRide password. Here is your 6-digit reset code:</p>
          <div style="background:rgba(0,102,255,0.1);border:1px solid rgba(0,102,255,0.3);border-radius:12px;padding:24px;text-align:center;margin:0 0 32px;">
            <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#0066FF;font-variant-numeric:tabular-nums;">${code}</span>
          </div>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:0 0 24px;">This code expires in <strong style="color:rgba(255,255,255,0.7);">15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:32px 0;">
          <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;text-align:center;">ResqRide · <a href="https://resqride.co" style="color:#0066FF;text-decoration:none;">resqride.co</a> · <a href="mailto:privacy@resqride.co" style="color:rgba(255,255,255,0.3);text-decoration:none;">privacy@resqride.co</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    log(`Password reset email sent to ${to}`);
    return true;
  } catch (err: any) {
    log(`Failed to send password reset email to ${to}: ${err.message}`);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name: string, role: string): Promise<void> {
  if (!resend) { log("No RESEND_API_KEY — skipping welcome email"); return; }
  const isProvider = role === "provider";
  const headline = isProvider ? "Welcome to ResqRide — start earning today" : "Welcome to ResqRide";
  const body = isProvider
    ? `You're now registered as a service provider on ResqRide. Once your account is verified by our team, you'll start receiving job requests from nearby drivers who need roadside assistance.`
    : `You're all set up on ResqRide. When you need roadside help — flat tire, jump start, tow, fuel delivery, or more — we connect you with a nearby provider fast.`;
  const cta = isProvider ? "Open Provider Dashboard" : "Open the App";

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: headline,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#04060E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#04060E;padding:40px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0D1117;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0A1628 0%,#0D1117 100%);padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:28px;font-weight:800;letter-spacing:-0.5px;">
            <span style="color:#FFFFFF;">Resq</span><span style="color:#0066FF;">Ride</span>
          </span>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="color:#FFFFFF;font-size:24px;font-weight:700;margin:0 0 16px;line-height:1.3;">${headline}</h1>
          <p style="color:rgba(255,255,255,0.7);font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ${name},</p>
          <p style="color:rgba(255,255,255,0.7);font-size:16px;line-height:1.6;margin:0 0 32px;">${body}</p>
          <div style="text-align:center;margin:0 0 32px;">
            <a href="https://resqride.co" style="display:inline-block;background:#0066FF;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">${cta}</a>
          </div>
          ${isProvider ? `
          <div style="background:rgba(0,102,255,0.08);border:1px solid rgba(0,102,255,0.2);border-radius:12px;padding:20px;margin:0 0 32px;">
            <p style="color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;margin:0 0 8px;">Next steps:</p>
            <ul style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
              <li>Complete your vehicle profile in the app</li>
              <li>Our team will review and verify your account</li>
              <li>Once approved, you'll receive job notifications</li>
            </ul>
          </div>` : ""}
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:32px 0;">
          <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;text-align:center;">ResqRide · <a href="https://resqride.co" style="color:#0066FF;text-decoration:none;">resqride.co</a> · <a href="mailto:privacy@resqride.co" style="color:rgba(255,255,255,0.3);text-decoration:none;">privacy@resqride.co</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    log(`Welcome email sent to ${to} (${role})`);
  } catch (err: any) {
    log(`Failed to send welcome email to ${to}: ${err.message}`);
  }
}

export async function sendReceiptEmail(
  to: string,
  name: string,
  opts: {
    serviceType: string;
    receiptNumber: string | null;
    location: string;
    totalCost: number | null;
    estimatedCost: number | null;
    providerName: string | null;
    createdAt: string;
  }
): Promise<void> {
  if (!resend) { log("No RESEND_API_KEY — skipping receipt email"); return; }
  const cost = opts.totalCost ?? opts.estimatedCost ?? 0;
  const costStr = cost > 0 ? `$${cost.toFixed(2)}` : "No charge";
  const receipt = opts.receiptNumber ? `#${opts.receiptNumber}` : "";
  const dateStr = new Date(opts.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const serviceLabel = opts.serviceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your ResqRide receipt ${receipt} — ${serviceLabel}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#04060E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#04060E;padding:40px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0D1117;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0A1628 0%,#0D1117 100%);padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:28px;font-weight:800;letter-spacing:-0.5px;">
            <span style="color:#FFFFFF;">Resq</span><span style="color:#0066FF;">Ride</span>
          </span>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:8px 0 0;">Service Receipt ${receipt}</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:rgba(255,255,255,0.7);font-size:16px;line-height:1.6;margin:0 0 24px;">Hi ${name}, your service is complete. Here is your receipt.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;margin:0 0 32px;">
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Service</span><br>
                <span style="color:#FFFFFF;font-size:16px;font-weight:600;">${serviceLabel}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Date</span><br>
                <span style="color:#FFFFFF;font-size:15px;">${dateStr}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Location</span><br>
                <span style="color:#FFFFFF;font-size:15px;">${opts.location}</span>
              </td>
            </tr>
            ${opts.providerName ? `<tr>
              <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <span style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Provider</span><br>
                <span style="color:#FFFFFF;font-size:15px;">${opts.providerName}</span>
              </td>
            </tr>` : ""}
            <tr>
              <td style="padding:16px 20px;">
                <span style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Total</span><br>
                <span style="color:#0066FF;font-size:24px;font-weight:800;">${costStr}</span>
              </td>
            </tr>
          </table>
          <p style="color:rgba(255,255,255,0.4);font-size:13px;line-height:1.6;margin:0 0 32px;">Questions about this service? Reply to this email or contact <a href="mailto:support@resqride.co" style="color:#0066FF;">support@resqride.co</a>.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:32px 0;">
          <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;text-align:center;">ResqRide · <a href="https://resqride.co" style="color:#0066FF;text-decoration:none;">resqride.co</a> · <a href="mailto:privacy@resqride.co" style="color:rgba(255,255,255,0.3);text-decoration:none;">privacy@resqride.co</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    log(`Receipt email sent to ${to} for job ${receipt}`);
  } catch (err: any) {
    log(`Failed to send receipt email to ${to}: ${err.message}`);
  }
}
