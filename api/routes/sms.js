const express = require('express');
const router = express.Router();
const https = require('https');
const crypto = require('crypto');
const User = require('../models/User');

// 腾讯云短信配置
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID;
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY;
const TENCENT_SMS_APP_ID = process.env.TENCENT_SMS_APP_ID;
const TENCENT_SMS_SIGN = process.env.TENCENT_SMS_SIGN;
const TENCENT_SMS_TEMPLATE_ID = process.env.TENCENT_SMS_TEMPLATE_ID;

// 生成随机验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 腾讯云短信发送
async function sendTencentSMS(phone, code) {
  const host = 'sms.tencentcloudapi.com';
  const service = 'sms';
  const version = '2021-01-11';
  const action = 'SendSms';
  const region = 'ap-guangzhou';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const payload = JSON.stringify({
    PhoneNumberSet: [`+86${phone}`],
    SmsSdkAppId: TENCENT_SMS_APP_ID,
    SignName: TENCENT_SMS_SIGN,
    TemplateId: TENCENT_SMS_TEMPLATE_ID,
    TemplateParamSet: [code]
  });

  const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');
  const canonicalRequest = `POST\n/\n\ncontent-type:application/json\nhost:${host}\n\ncontent-type;host\n${hashedPayload}`;
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  const secretDate = crypto.createHmac('sha256', `TC3${TENCENT_SECRET_KEY}`).update(date).digest();
  const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
  const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

  const authorization = `TC3-HMAC-SHA256 Credential=${TENCENT_SECRET_ID}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      path: '/',
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
        'Host': host,
        'X-TC-Action': action,
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Version': version,
        'X-TC-Region': region
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.Response && result.Response.Error) {
          reject(new Error(result.Response.Error.Message));
        } else {
          resolve(result);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// 发送短信验证码
router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    const code = generateCode();

    // 存储验证码
    User.storeVerificationCode(phone, code);

    // 检查是否有腾讯云配置
    if (TENCENT_SECRET_ID && TENCENT_SECRET_KEY && TENCENT_SMS_APP_ID) {
      try {
        await sendTencentSMS(phone, code);
        console.log(`已向 ${phone} 发送验证码`);
        res.json({ success: true, message: '验证码已发送至您的手机' });
      } catch (smsErr) {
        console.error('短信发送失败:', smsErr.message);
        // 短信失败时仍返回验证码（降级处理）
        res.json({ success: true, message: '短信发送失败，演示验证码：', code });
      }
    } else {
      // 未配置短信服务，返回演示验证码
      console.log(`演示验证码 - 手机号: ${phone}, 验证码: ${code}`);
      res.json({ success: true, message: '验证码已发送', code });
    }
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ error: '发送验证码失败，请稍后重试' });
  }
});

module.exports = router;
