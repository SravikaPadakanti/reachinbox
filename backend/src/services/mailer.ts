import nodemailer from "nodemailer";
import { env } from "../config/env";

export const transporter = nodemailer.createTransport({
  pool: true,
  host: env.etherealHost,
  port: env.etherealPort,
  secure: false,
  auth: {
    user: env.etherealUser,
    pass: env.etherealPass,
  },
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 45000,
  dnsTimeout: 10000,
});

export interface MailAttachment {
  filename: string;
  content: string; // base64 string
  contentType?: string;
}

export async function sendEmail(opts: {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}) {
  const mailOptions: any = {
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  };

  if (opts.attachments && opts.attachments.length > 0) {
    mailOptions.attachments = opts.attachments.map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, "base64"),
      contentType: att.contentType,
    }));
  }

  let lastErr: any;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info as any);
      return { messageId: info.messageId, previewUrl };
    } catch (err: any) {
      lastErr = err;
      console.warn(`[mailer] attempt ${attempt} error: ${err.message}`);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  throw lastErr;
}
