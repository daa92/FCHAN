const nodemailer = require('nodemailer');
require('dotenv').config();

// ── CREATE TRANSPORTER ────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ── VERIFY CONNECTION ─────────────────────────────
transporter.verify((error) => {
  if (error) {
    console.error('Email service error:', error.message);
  } else {
    console.log('Email service ready');
  }
});

// ── EMAIL TEMPLATES ───────────────────────────────
const templates = {

  verification: (name, token) => ({
    subject: 'Verify your FCHAN account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
	<link rel="icon" type="image/png" href="../assets/images/logo.png">
        <style>
          body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1a5276, #27ae60); padding: 40px; text-align: center; }
          .header h1 { color: white; font-size: 32px; margin: 0; letter-spacing: 2px; }
          .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; }
          .body { padding: 40px; }
          .body h2 { color: #2c3e50; margin-bottom: 16px; }
          .body p { color: #7f8c8d; line-height: 1.7; margin-bottom: 16px; }
          .btn { display: block; width: fit-content; margin: 30px auto; padding: 16px 40px; background: linear-gradient(135deg, #27ae60, #1a5276); color: white; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; }
          .footer { background: #f8f9fa; padding: 20px 40px; text-align: center; color: #bdc3c7; font-size: 12px; border-top: 1px solid #e9ecef; }
          .token-box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 12px 20px; font-family: monospace; font-size: 14px; color: #2c3e50; text-align: center; margin: 20px 0; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>FCHAN</h1>
            <p>Farm Intelligence Platform</p>
          </div>
          <div class="body">
            <h2>Hello ${name}!</h2>
            <p>Thank you for joining FCHAN. To complete your registration and start monitoring your farm, please verify your email address.</p>
            <a href="${process.env.APP_URL}/pages/verify.html?token=${token}" class="btn">
              Verify My Email
            </a>
            <p style="font-size:13px;color:#95a5a6;text-align:center;">
              Or copy this link into your browser:
            </p>
            <div class="token-box">
              ${process.env.APP_URL}/pages/verify.html?token=${token}
            </div>
            <p style="font-size:13px;color:#95a5a6;">
              This link expires in <strong>24 hours</strong>.
              If you did not create an account, ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 FCHAN — Farm Intelligence Platform</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (name, token) => ({
    subject: 'Reset your FCHAN password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #e74c3c, #c0392b); padding: 40px; text-align: center; }
          .header h1 { color: white; font-size: 32px; margin: 0; letter-spacing: 2px; }
          .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; }
          .body { padding: 40px; }
          .body h2 { color: #2c3e50; margin-bottom: 16px; }
          .body p { color: #7f8c8d; line-height: 1.7; margin-bottom: 16px; }
          .btn { display: block; width: fit-content; margin: 30px auto; padding: 16px 40px; background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; }
          .footer { background: #f8f9fa; padding: 20px 40px; text-align: center; color: #bdc3c7; font-size: 12px; border-top: 1px solid #e9ecef; }
          .warning { background: #fef9e7; border: 1px solid #f39c12; border-radius: 8px; padding: 12px 20px; font-size: 13px; color: #856404; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>FCHAN</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="body">
            <h2>Hello ${name},</h2>
            <p>We received a request to reset your FCHAN account password. Click the button below to create a new password.</p>
            <a href="${process.env.APP_URL}/pages/reset-password.html?token=${token}" class="btn">
              Reset My Password
            </a>
            <div class="warning">
              This link expires in <strong>1 hour</strong>.
              If you did not request a password reset,
              please ignore this email — your password will not change.
            </div>
          </div>
          <div class="footer">
            <p>© 2026 FCHAN — Farm Intelligence Platform</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  alertNotification: (name, farmName, alerts) => ({
    subject: `FCHAN Alert — ${farmName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f39c12, #e67e22); padding: 40px; text-align: center; }
          .header h1 { color: white; font-size: 32px; margin: 0; }
          .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; }
          .body { padding: 40px; }
          .alert-item { border-left: 4px solid #e74c3c; padding: 12px 16px; margin-bottom: 12px; background: #fdf2f2; border-radius: 0 8px 8px 0; }
          .alert-item.warning { border-color: #f39c12; background: #fef9e7; }
          .alert-item.info { border-color: #3498db; background: #ebf5fb; }
          .alert-type { font-weight: bold; color: #2c3e50; text-transform: capitalize; margin-bottom: 4px; }
          .alert-msg { color: #7f8c8d; font-size: 14px; }
          .btn { display: block; width: fit-content; margin: 30px auto; padding: 14px 32px; background: linear-gradient(135deg, #27ae60, #1a5276); color: white; text-decoration: none; border-radius: 50px; font-weight: bold; }
          .footer { background: #f8f9fa; padding: 20px 40px; text-align: center; color: #bdc3c7; font-size: 12px; border-top: 1px solid #e9ecef; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>FCHAN</h1>
            <p>Farm Alert Notification</p>
          </div>
          <div class="body">
            <h2>Hello ${name},</h2>
            <p>Your farm <strong>${farmName}</strong> has triggered the following alerts:</p>
            ${alerts.map(alert => `
              <div class="alert-item ${alert.severity}">
                <div class="alert-type">${alert.type.replace(/_/g,' ')}</div>
                <div class="alert-msg">${alert.message}</div>
              </div>
            `).join('')}
            <a href="${process.env.APP_URL}/pages/alerts.html" class="btn">
              View All Alerts
            </a>
          </div>
          <div class="footer">
            <p>© 2026 FCHAN — Farm Intelligence Platform</p>
            <p>To unsubscribe from alerts, update your notification settings.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};


collaboratorInvite: (inviterName, farmName, token) => ({
  subject: `${inviterName} invited you to collaborate on FCHAN`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1a5276, #27ae60); padding: 40px; text-align: center; }
        .header h1 { color: white; font-size: 32px; margin: 0; }
        .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; }
        .body { padding: 40px; }
        .body p { color: #7f8c8d; line-height: 1.7; margin-bottom: 16px; }
        .farm-box { background: #eafaf1; border: 1px solid #a9dfbf; border-radius: 8px; padding: 16px 24px; margin: 20px 0; text-align: center; }
        .farm-box h3 { color: #1a5276; margin: 0; font-size: 20px; }
        .btn-row { display: flex; gap: 16px; justify-content: center; margin: 30px 0; }
        .btn-accept { padding: 14px 28px; background: linear-gradient(135deg, #27ae60, #1a5276); color: white; text-decoration: none; border-radius: 50px; font-weight: bold; }
        .btn-decline { padding: 14px 28px; background: #f8f9fa; color: #7f8c8d; text-decoration: none; border-radius: 50px; font-weight: bold; border: 1px solid #e9ecef; }
        .footer { background: #f8f9fa; padding: 20px 40px; text-align: center; color: #bdc3c7; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>FCHAN</h1>
          <p>Farm Collaboration Invitation</p>
        </div>
        <div class="body">
          <p>Hello!</p>
          <p><strong>${inviterName}</strong> has invited you to collaborate on their farm on FCHAN — the Farm Intelligence Platform.</p>
          <div class="farm-box">
            <p style="margin:0;color:#7f8c8d;font-size:12px;">Farm</p>
            <h3>${farmName}</h3>
          </div>
          <p>As a collaborator, you'll be able to view farm data, sensor readings, plant forecasts and alerts.</p>
          <div class="btn-row">
            <a href="${process.env.APP_URL}/pages/collaborate.html?token=${token}&action=accept" class="btn-accept">
              Accept Invitation
            </a>
            <a href="${process.env.APP_URL}/pages/collaborate.html?token=${token}&action=decline" class="btn-decline">
              Decline
            </a>
          </div>
          <p style="font-size:13px;color:#95a5a6;">This invitation expires in 7 days. If you don't have an FCHAN account, you'll need to create one first.</p>
        </div>
        <div class="footer">
          <p>© 2026 FCHAN — Farm Intelligence Platform</p>
        </div>
      </div>
    </body>
    </html>
  `
});


// ── SEND EMAIL ────────────────────────────────────
const sendEmail = async (to, templateName, ...args) => {
  try {
    const template = templates[templateName](...args);

    const info = await transporter.sendMail({
      from:    process.env.EMAIL_FROM,
      to,
      subject: template.subject,
      html:    template.html
    });

    console.log(`Email sent to ${to}: ${info.messageId}`);
    return true;

  } catch (err) {
    console.error(`Email error: ${err.message}`);
    return false;
  }
};

module.exports = { sendEmail };
