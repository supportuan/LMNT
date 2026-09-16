import nodemailer from "nodemailer";

function env(name: string) {
  return (process.env[name] ?? "").trim().replace(/^["']|["']$/g, "");
}

function getTransport() {
  const host = env("SMTP_HOST");
  const user = env("SMTP_USERNAME");
  const pass = env("SMTP_PASSWORD");
  const port = Number(env("SMTP_PORT") || "587");
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function mailConfigured() {
  return Boolean(env("SMTP_HOST") && env("SMTP_USERNAME") && env("SMTP_PASSWORD"));
}

export function senderAddress() {
  return env("SENDER_MAIL") || env("SMTP_USERNAME");
}

export async function sendMail(input: { to: string; subject: string; text: string; html?: string }) {
  const transport = getTransport();
  const from = senderAddress();
  if (!transport || !from) {
    console.warn("SMTP is not configured; email was not sent");
    return false;
  }

  try {
    await transport.sendMail({
      from: `LMNT Fitness Club <${from}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email", error);
    return false;
  }
}

export function appOrigin(request?: Request) {
  const configured = env("APP_URL");
  if (configured) return configured.replace(/\/$/, "");
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function mailLayout(title: string, body: string, cta?: { href: string; label: string }) {
  const button = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#B7F34A;color:#0B0F0D;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:12px">${escapeHtml(cta.label)}</a></p>`
    : "";
  return {
    text: [title, "", body, cta ? `${cta.label}: ${cta.href}` : "", "", "LMNT Fitness Club"].filter(Boolean).join("\n"),
    html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;color:#0B0F0D">
      <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
      <p style="line-height:1.55;color:#3d4541">${escapeHtml(body).replaceAll("\n", "<br/>")}</p>
      ${button}
      <p style="color:#7a847f;font-size:12px">LMNT Fitness Club</p>
    </div>`,
  };
}
