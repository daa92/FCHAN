const axios = require('axios');
require('dotenv').config();

// ── DYNAMIC APP URL ───────────────────────────────
function getAppUrl(req) {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  if (req) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const apiPort = String(process.env.PORT || 3000);
    const frontendPort = process.env.FRONTEND_PORT || '8080';
    const frontendHost = host.replace(`:${apiPort}`, `:${frontendPort}`);
    return `${proto}://${frontendHost}`;
  }
  return 'https://fchan-five.vercel.app';
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
  // Add more templates here later if needed (passwordReset, etc.)
};

// ── SEND EMAIL USING BREVO API ────────────────────────────────────
const sendEmail = async (to, templateName, ...args) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('  BREVO_API_KEY is not configured');
      return false;
    }

    const templateFunc = templates[templateName];
    if (typeof templateFunc !== 'function') {
      console.error(`  Template '${templateName}' not found or not a function`);
      return false;
    }

    const template = templateFunc(...args);

    const payload = {
      sender: {
        name: "FCHAN",
        email: process.env.EMAIL_FROM || "noreply@fchan.onrender.com"
      },
      to: [{ email: to }],
      subject: template.subject,
      htmlContent: template.html
    };

    await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`  Email sent successfully to ${to} (${templateName})`);
    return true;

  } catch (err) {
    console.error(`  Brevo API Error (${templateName}):`, err.response?.data || err.message);
    return false;
  }
};

module.exports = { sendEmail, getAppUrl };
