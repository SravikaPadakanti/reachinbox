import nodemailer from "nodemailer";
import { env } from "../config/env";

export const transporter = nodemailer.createTransport({
  host: env.etherealHost,
  port: env.etherealPort,
  secure: false,
  auth: {
    user: env.etherealUser,
    pass: env.etherealPass,
  },
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

  const info = await transporter.sendMail(mailOptions);
  // Ethereal gives you a preview URL per message — handy for the demo video
  const previewUrl = nodemailer.getTestMessageUrl(info);
  return { messageId: info.messageId, previewUrl };
}
