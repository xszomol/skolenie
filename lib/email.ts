import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 1025),
  auth:
    process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
})

export async function sendInvitationEmail({
  to,
  inviterName,
  role,
  token,
}: {
  to: string
  inviterName: string
  role: string
  token: string
}) {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000"
  const link = `${baseUrl}/register?token=${token}`

  const roleLabel: Record<string, string> = {
    ADMIN: "administrátor",
    TRAINER: "školiteľ",
    PARTICIPANT: "účastník",
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@skolenie.local",
    to,
    subject: "Pozvánka do systému Školenie",
    html: `
      <p>${inviterName} vás pozýva ako <strong>${roleLabel[role] ?? role}</strong>.</p>
      <p><a href="${link}">Kliknite sem pre registráciu</a></p>
      <p>Odkaz platí 7 dní.</p>
    `,
  })
}
