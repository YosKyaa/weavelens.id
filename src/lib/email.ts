import "server-only";

/**
 * Email transaksional lewat Resend (API HTTP, tanpa library).
 * Aktif hanya jika RESEND_API_KEY dan EMAIL_FROM diisi; tanpa itu semua kiriman dilewati diam-diam
 * supaya fitur lain tetap jalan.
 */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Template sederhana berwarna brand: judul, paragraf, satu tombol. */
export function emailLayout(input: {
  heading: string;
  paragraphs: string[];
  action?: { label: string; href: string };
  footer?: string;
}): string {
  const body = input.paragraphs
    .map((text) => `<p style="margin:0 0 14px;line-height:1.6;color:#2b1a17">${escape(text)}</p>`)
    .join("");
  const button = input.action
    ? `<p style="margin:22px 0 8px"><a href="${escape(input.action.href)}" style="display:inline-block;background:#74342b;color:#f9f9f9;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">${escape(input.action.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="id"><body style="margin:0;background:#f3ede6;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td>
<p style="margin:0 0 18px;font-weight:700;letter-spacing:.04em;color:#74342b">WeaveLens</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:#74342b">${escape(input.heading)}</h1>
${body}${button}
<p style="margin:24px 0 0;font-size:12px;color:#7a6a66">${escape(input.footer ?? "Email otomatis dari portal WeaveLens · weavelens.id")}</p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function sendEmail(input: {
  to: string[];
  subject: string;
  html: string;
}): Promise<boolean> {
  const to = [...new Set(input.to.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (!emailConfigured() || to.length === 0) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      // Banyak penerima lewat BCC supaya alamat penerima lain tidak saling terlihat.
      body: JSON.stringify(
        to.length === 1
          ? { from: process.env.EMAIL_FROM, to, subject: input.subject, html: input.html }
          : {
              from: process.env.EMAIL_FROM,
              to: [process.env.EMAIL_FROM],
              bcc: to,
              subject: input.subject,
              html: input.html,
            },
      ),
    });
    if (!response.ok) console.error("[email] gagal:", response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error("[email] gagal:", error);
    return false;
  }
}
