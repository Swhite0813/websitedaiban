const express = require('express');
const router = express.Router();
const https = require('https');
const User = require('../models/User');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailResend(to, code) {
  const body = JSON.stringify({
    from: FROM_EMAIL,
    to: [to],
    subject: '【待会·就办】您的登录验证码',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8f9fc;border-radius:12px"><h2 style="color:#3D5AFE;margin-bottom:8px">待会·就办</h2><p style="color:#555;margin-bottom:24px">您好，您的登录验证码为：</p><div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0F1117;text-align:center;padding:20px;background:#fff;border-radius:8px;border:2px solid #c7d2fe;margin-bottom:24px">${code}</div><p style="color:#888;font-size:13px">验证码 5 分钟内有效，请勿泄露给他人。</p></div>`
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (res.statusCode >= 400) reject(new Error(result.message || '邮件发送失败'));
        else resolve(result);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 发送验证码
router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    const code = generateCode();
    User.storeVerificationCode(email, code);

    if (RESEND_API_KEY) {
      try {
        await sendEmailResend(email.toLowerCase(), code);
        console.log(`验证码已发送至 ${email}`);
        res.json({ success: true, message: '验证码已发送至您的邮箱' });
      } catch (err) {
        console.error('邮件发送失败:', err.message);
        res.json({ success: true, message: '邮件发送失败，演示验证码：', code });
      }
    } else {
      console.log(`[演示] 邮箱: ${email}, 验证码: ${code}`);
      res.json({ success: true, message: '验证码已发送', code });
    }
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ error: '发送验证码失败，请稍后重试' });
  }
});

module.exports = router;
