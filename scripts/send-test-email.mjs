/**
 * Send a test email using the same provider as the API (.env).
 * Usage: node scripts/send-test-email.mjs [to@email.com]
 *
 * Gmail (recommended): EMAIL_PROVIDER=smtp + SMTP_USER + SMTP_PASS (App Password)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[trimmed.slice(0, eq).trim()] = value;
  }
  return env;
}

const to = process.argv[2] || 'cristianofeijon@gmail.com';
const env = loadEnvFile(join(rootDir, '.env'));
const provider = (env.EMAIL_PROVIDER || 'smtp').toLowerCase();
const contact = env.EMAIL_CONTACT || env.SMTP_USER || 'robertofeijon@gmail.com';

const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <div style="background:#C0392B;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-size:20px;font-weight:bold;">CRENIT</div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <p>Test email from CRENIT (${provider}).</p>
    <p style="color:#6b7280;font-size:14px;">${new Date().toISOString()}</p>
  </div>
  <p style="font-size:12px;color:#6b7280;margin-top:12px;">${contact}</p>
</div>`;

const subject = 'CRENIT test email';

async function sendSmtp() {
  const nodemailer = await import('nodemailer');
  const port = Number(env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: env.SMTP_SECURE === 'true' || port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  const from = env.EMAIL_FROM || `CRENIT <${env.SMTP_USER}>`;
  const info = await transporter.sendMail({
    from,
    to,
    replyTo: env.EMAIL_REPLY_TO || contact,
    subject,
    html,
  });
  return info.messageId;
}

async function sendResend() {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'CRENIT <onboarding@resend.dev>',
      reply_to: env.EMAIL_REPLY_TO || contact,
      to: [to],
      subject,
      html,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
  return body.id;
}

async function main() {
  console.log(`Provider: ${provider}`);
  console.log(`To: ${to}`);

  if (provider === 'smtp') {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      console.error('Set SMTP_USER and SMTP_PASS in .env (Gmail App Password).');
      console.error('https://myaccount.google.com/apppasswords');
      process.exit(1);
    }
    console.log(`From: ${env.EMAIL_FROM || `CRENIT <${env.SMTP_USER}>`}`);
    const id = await sendSmtp();
    console.log('Sent via SMTP. Message id:', id);
    return;
  }

  if (!env.EMAIL_PROVIDER_API_KEY || env.EMAIL_PROVIDER_API_KEY === 'dev-placeholder') {
    console.error('Set EMAIL_PROVIDER=smtp or a real Resend API key.');
    process.exit(1);
  }
  const id = await sendResend();
  console.log('Sent via Resend. Id:', id);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
