import nodemailer from "nodemailer"
import type { FastifyBaseLogger } from "fastify"

// SMTP comes from the environment. In development docker-compose runs Mailpit (no real mail is sent;
// open http://localhost:8025 to read it). In production point these at the company mail server.
const host = process.env.SMTP_HOST
const transport = host
  ? nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null

const from = process.env.SMTP_FROM ?? "INFINI I.A. Portal <no-reply@infini-ia.com>"
export const appUrl = (process.env.APP_URL ?? "http://localhost:8080").replace(/\/$/, "")

export async function sendMail(log: FastifyBaseLogger, msg: { to: string; subject: string; text: string; html: string }) {
  if (!transport) {
    // Never print reset links in production logs; in development make the flow testable without SMTP
    if (process.env.NODE_ENV === "production") log.error("SMTP is not configured; email not sent")
    else log.warn({ to: msg.to, subject: msg.subject, text: msg.text }, "SMTP not configured — email printed instead (dev only)")
    return
  }
  await transport.sendMail({ from, ...msg })
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Bilingual (Thai / English) reset email. */
export function resetEmail(name: string, link: string, minutes: number) {
  const subject = "รีเซ็ตรหัสผ่าน / Reset your password — INFINI I.A."
  const text = [
    `สวัสดี ${name}`,
    `มีคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ เปิดลิงก์นี้ภายใน ${minutes} นาทีเพื่อตั้งรหัสผ่านใหม่:`,
    link,
    "ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้",
    "",
    `Hi ${name}`,
    `Someone asked to reset your password. Open this link within ${minutes} minutes to choose a new one:`,
    link,
    "If it wasn't you, ignore this email — your password stays the same.",
  ].join("\n")
  const html = `<p>สวัสดี ${esc(name)}</p>
<p>มีคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ กดปุ่มด้านล่างภายใน ${minutes} นาทีเพื่อตั้งรหัสผ่านใหม่</p>
<p><a href="${esc(link)}" style="display:inline-block;padding:10px 18px;background:#3a352e;color:#fff;border-radius:6px;text-decoration:none">ตั้งรหัสผ่านใหม่ / Reset password</a></p>
<p style="color:#666">ถ้าคุณไม่ได้ขอ ไม่ต้องทำอะไร — If it wasn't you, just ignore this email.</p>`
  return { subject, text, html }
}
