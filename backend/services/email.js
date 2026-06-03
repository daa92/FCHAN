const { Resend } = require('resend');
require('dotenv').config();

// ── RESEND CLIENT ─────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);
console.log('Email service ready');

// ── DYNAMIC APP URL ───────────────────────────────
function getAppUrl(req) {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  if (req) {
    const host  = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const apiPort      = String(process.env.PORT || 3000);
    const frontendPort = process.env.FRONTEND_PORT || '8080';
    const frontendHost = host.replace(`:${apiPort}`, `:${frontendPort}`);
    return `${proto}://${frontendHost}`;
  }
  return 'http://localhost:8080';
}

// ── EMAIL TEMPLATES ───────────────────────────────
const templates = {

  verification: (name, token, appUrl) => ({
    subject: 'Verify your FCHAN account',
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:0}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
  .hdr{background:linear-gradient(135deg,#1a5276,#27ae60);padding:40px;text-align:center}
  .hdr h1{color:#fff;font-size:32px;margin:0;letter-spacing:2px}
  .hdr p{color:rgba(255,255,255,.8);margin:8px 0 0}
  .body{padding:40px}
  .body h2{color:#2c3e50;margin-bottom:16px}
  .body p{color:#7f8c8d;line-height:1.7;margin-bottom:16px}
  .btn{display:block;width:fit-content;margin:30px auto;padding:16px 40px;background:linear-gradient(135deg,#27ae60,#1a5276);color:#fff;text-decoration:none;border-radius:50px;font-weight:bold;font-size:16px}
  .token-box{background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:12px 20px;font-family:monospace;font-size:13px;color:#2c3e50;text-align:center;margin:20px 0;word-break:break-all}
  .info-box{background:#eaf5fb;border:1px solid #aed6f1;border-radius:8px;padding:14px 20px;font-size:13px;color:#1a5276;margin:20px 0;line-height:1.6}
  .footer{background:#f8f9fa;padding:20px 40px;text-align:center;color:#bdc3c7;font-size:12px;border-top:1px solid #e9ecef}
</style></head>
<body><div class="wrap">
  <div class="hdr"><h1>FCHAN</h1><p>Farm Intelligence Platform</p></div>
  <div class="body">
    <h2>Hello ${name}!</h2>
    <p>Thank you for joining FCHAN. Click the button below to verify your email address.</p>
    <a href="${appUrl}/pages/verify.html?token=${token}" class="btn">Verify My Email</a>
    <div class="info-box">
      <strong>If the button doesn't work:</strong><br>
      Open FCHAN in your browser, then go to:<br>
      <code style="background:#d6eaf8;padding:2px 6px;border-radius:4px">/pages/verify.html?token=${token}</code><br><br>
      Or copy this token and paste it manually on the verify page:
    </div>
    <div class="token-box">${token}</div>
    <p style="font-size:13px;color:#95a5a6;text-align:center;">This link expires in <strong>24 hours</strong>.</p>
  </div>
  <div class="footer"><p>© 2026 FCHAN — Farm Intelligence Platform</p></div>
</div></body></html>`
  }),

  passwordReset: (name, token, appUrl) => ({
    subject: 'Reset your FCHAN password',
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:0}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
  .hdr{background:linear-gradient(135deg,#e74c3c,#c0392b);padding:40px;text-align:center}
  .hdr h1{color:#fff;font-size:32px;margin:0}
  .hdr p{color:rgba(255,255,255,.8);margin:8px 0 0}
  .body{padding:40px}
  .body p{color:#7f8c8d;line-height:1.7;margin-bottom:16px}
  .btn{display:block;width:fit-content;margin:30px auto;padding:16px 40px;background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;text-decoration:none;border-radius:50px;font-weight:bold;font-size:16px}
  .warn{background:#fef9e7;border:1px solid #f39c12;border-radius:8px;padding:12px 20px;font-size:13px;color:#856404;margin-top:20px}
  .footer{background:#f8f9fa;padding:20px 40px;text-align:center;color:#bdc3c7;font-size:12px;border-top:1px solid #e9ecef}
</style></head>
<body><div class="wrap">
  <div class="hdr"><h1>FCHAN</h1><p>Password Reset Request</p></div>
  <div class="body">
    <h2>Hello ${name},</h2>
    <p>We received a request to reset your FCHAN password.</p>
    <a href="${appUrl}/pages/reset-password.html?token=${token}" class="btn">Reset My Password</a>
    <div class="warn">This link expires in <strong>1 hour</strong>. If you did not request this, ignore this email.</div>
  </div>
  <div class="footer"><p>© 2026 FCHAN — Farm Intelligence Platform</p></div>
</div></body></html>`
  }),

  collaboratorInvite: (inviterName, farmName, token, appUrl) => ({
    subject: `${inviterName} invited you to collaborate on FCHAN`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:0}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
  .hdr{background:linear-gradient(135deg,#1a5276,#27ae60);padding:40px;text-align:center}
  .hdr h1{color:#fff;font-size:32px;margin:0}
  .hdr p{color:rgba(255,255,255,.8);margin:8px 0 0}
  .body{padding:40px}
  .body p{color:#7f8c8d;line-height:1.7;margin-bottom:16px}
  .farm-box{background:#eafaf1;border:1px solid #a9dfbf;border-radius:8px;padding:16px 24px;margin:20px 0;text-align:center}
  .farm-box h3{color:#1a5276;margin:0;font-size:20px}
  .btn-row{display:flex;gap:16px;justify-content:center;margin:30px 0;flex-wrap:wrap}
  .btn-a{padding:14px 28px;background:linear-gradient(135deg,#27ae60,#1a5276);color:#fff;text-decoration:none;border-radius:50px;font-weight:bold}
  .btn-d{padding:14px 28px;background:#f8f9fa;color:#7f8c8d;text-decoration:none;border-radius:50px;font-weight:bold;border:1px solid #e9ecef}
  .footer{background:#f8f9fa;padding:20px 40px;text-align:center;color:#bdc3c7;font-size:12px}
</style></head>
<body><div class="wrap">
  <div class="hdr"><h1>FCHAN</h1><p>Farm Collaboration Invitation</p></div>
  <div class="body">
    <p>Hello!</p>
    <p><strong>${inviterName}</strong> has invited you to collaborate on a farm in FCHAN.</p>
    <div class="farm-box">
      <p style="margin:0;color:#7f8c8d;font-size:12px;">Farm</p>
      <h3>${farmName}</h3>
    </div>
    <p>Log in to FCHAN, then open your <strong>Profile → Invitations</strong> tab to accept or decline — or use the buttons below.</p>
    <div class="btn-row">
      <a href="${appUrl}/pages/collaborate.html?token=${token}&action=accept" class="btn-a">Accept Invitation</a>
      <a href="${appUrl}/pages/collaborate.html?token=${token}&action=decline" class="btn-d">Decline</a>
    </div>
    <p style="font-size:13px;color:#95a5a6;">This invitation expires in 7 days.</p>
  </div>
  <div class="footer"><p>© 2026 FCHAN — Farm Intelligence Platform</p></div>
</div></body></html>`
  }),

  alertNotification: (name, farmName, alerts, appUrl) => ({
    subject: `FCHAN Alert — ${farmName}`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:0}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
  .hdr{background:linear-gradient(135deg,#f39c12,#e67e22);padding:40px;text-align:center}
  .hdr h1{color:#fff;font-size:32px;margin:0}
  .hdr p{color:rgba(255,255,255,.8);margin:8px 0 0}
  .body{padding:40px}
  .ai{border-left:4px solid #e74c3c;padding:12px 16px;margin-bottom:12px;background:#fdf2f2;border-radius:0 8px 8px 0}
  .ai.warning{border-color:#f39c12;background:#fef9e7}
  .ai.info{border-color:#3498db;background:#ebf5fb}
  .at{font-weight:bold;color:#2c3e50;text-transform:capitalize;margin-bottom:4px}
  .am{color:#7f8c8d;font-size:14px}
  .btn{display:block;width:fit-content;margin:30px auto;padding:14px 32px;background:linear-gradient(135deg,#27ae60,#1a5276);color:#fff;text-decoration:none;border-radius:50px;font-weight:bold}
  .footer{background:#f8f9fa;padding:20px 40px;text-align:center;color:#bdc3c7;font-size:12px;border-top:1px solid #e9ecef}
</style></head>
<body><div class="wrap">
  <div class="hdr"><h1>FCHAN</h1><p>Farm Alert Notification</p></div>
  <div class="body">
    <h2>Hello ${name},</h2>
    <p>Your farm <strong>${farmName}</strong> has triggered the following alerts:</p>
    ${alerts.map(a => `<div class="ai ${a.severity}"><div class="at">${a.type.replace(/_/g,' ')}</div><div class="am">${a.message}</div></div>`).join('')}
    <a href="${appUrl}/pages/alerts.html" class="btn">View All Alerts</a>
  </div>
  <div class="footer"><p>© 2026 FCHAN — Farm Intelligence Platform</p></div>
</div></body></html>`
  }),

  feedback: (senderName, senderEmail, subject, message) => ({
    subject: `FCHAN Feedback: ${subject}`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f0f4f8;margin:0;padding:0}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
  .hdr{background:linear-gradient(135deg,#1a5276,#27ae60);padding:32px 40px;text-align:center}
  .hdr h1{color:#fff;font-size:28px;margin:0}
  .hdr p{color:rgba(255,255,255,.8);margin:8px 0 0}
  .body{padding:40px}
  .meta{background:#f8f9fa;border-radius:8px;padding:16px 20px;margin-bottom:24px}
  .meta-row{display:flex;gap:8px;margin-bottom:6px;font-size:14px}
  .meta-label{font-weight:bold;color:#2c3e50;min-width:80px}
  .meta-val{color:#7f8c8d}
  .msg-box{background:#fff;border:1px solid #e9ecef;border-radius:8px;padding:20px;font-size:15px;color:#2c3e50;line-height:1.7;white-space:pre-wrap}
  .footer{background:#f8f9fa;padding:16px 40px;text-align:center;color:#bdc3c7;font-size:12px;border-top:1px solid #e9ecef}
</style></head>
<body><div class="wrap">
  <div class="hdr"><h1>FCHAN</h1><p>User Feedback</p></div>
  <div class="body">
    <div class="meta">
      <div class="meta-row"><span class="meta-label">From:</span><span class="meta-val">${senderName} (${senderEmail})</span></div>
      <div class="meta-row"><span class="meta-label">Subject:</span><span class="meta-val">${subject}</span></div>
    </div>
    <div class="msg-box">${message}</div>
  </div>
  <div class="footer"><p>© 2026 FCHAN — Farm Intelligence Platform</p></div>
</div></body></html>`
  })
};

// ── SEND EMAIL ────────────────────────────────────
const sendEmail = async (to, templateName, ...args) => {
  try {
    const template = templates[templateName](...args);
    const { data, error } = await resend.emails.send({
      from:    'FCHAN <onboarding@resend.dev>',
      to,
      subject: template.subject,
      html:    template.html
    });
    if (error) {
      console.error(`Email error (${templateName}):`, JSON.stringify(error));
      return false;
    }
    console.log(`Email sent to ${to}: ${data.id}`);
    return true;
  } catch (err) {
    console.error(`Email error (${templateName}): ${err.message}`);
    return false;
  }
};

module.exports = { sendEmail, getAppUrl };
