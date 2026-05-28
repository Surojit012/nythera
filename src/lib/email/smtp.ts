import nodemailer from 'nodemailer';

export interface NytheraEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM,
  );
}

export async function sendEmail(email: NytheraEmail): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.');
  }

  const port = Number(process.env.SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}

export function renderNotificationEmail(type: string): Omit<NytheraEmail, 'to'> {
  if (type === 'vault_invite') {
    return {
      subject: 'You were added to a Nythera recovery vault',
      text: 'You were added as a recovery recipient for a Nythera vault. Connect with the same wallet or email in Nythera to decrypt if you are authorized.',
      html: baseHtml(
        'You were added to a Nythera vault',
        'Connect with the same wallet or email in Nythera to decrypt the protected secret if you are authorized by the vault owner.',
      ),
    };
  }

  if (type.startsWith('auto_renew_success')) {
    return {
      subject: 'Nythera storage auto-renewed successfully',
      text: 'Your Walrus-backed Nythera vault storage was renewed using your storage credits.',
      html: baseHtml(
        'Storage renewed',
        'Your Walrus-backed vault storage was renewed using your Nythera storage credits.',
      ),
    };
  }

  if (type.startsWith('auto_renew_failed_needs_credits')) {
    return {
      subject: 'Nythera vault needs storage credits',
      text: 'Your Walrus-backed Nythera vault could not auto-renew because you do not have enough credits.',
      html: baseHtml(
        'Storage credits needed',
        'Your Walrus-backed vault could not auto-renew because your Nythera credit balance is too low.',
      ),
    };
  }

  if (type.startsWith('auto_renew_failed')) {
    return {
      subject: 'Nythera storage auto-renewal failed',
      text: 'Nythera tried to renew your Walrus-backed vault storage, but the renewal failed. Please check your vault.',
      html: baseHtml(
        'Auto-renewal failed',
        'Nythera tried to renew your Walrus-backed vault storage, but the renewal failed. Please check your vault.',
      ),
    };
  }

  return {
    subject: 'Nythera vault storage expires soon',
    text: 'Your Walrus-backed Nythera vault storage is approaching expiry. Please renew it to keep the encrypted file available.',
    html: baseHtml(
      'Storage expires soon',
      'Your Walrus-backed vault storage is approaching expiry. Renew it to keep the encrypted file available.',
    ),
  };
}

function baseHtml(title: string, body: string): string {
  return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f8f2ea; padding:32px;">
      <div style="max-width:560px; margin:0 auto; background:#fffaf3; border:1px solid rgba(34,34,34,.12); padding:28px;">
        <p style="margin:0 0 12px; color:#b9875e; font-size:12px; letter-spacing:.14em; text-transform:uppercase;">Nythera</p>
        <h1 style="margin:0 0 16px; color:#1d1d1b; font-size:24px;">${escapeHtml(title)}</h1>
        <p style="margin:0; color:#4b4b45; line-height:1.6;">${escapeHtml(body)}</p>
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
