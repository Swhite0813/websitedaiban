const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');

// 阿里云短信配置
const ALIYUN_ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID;
const ALIYUN_ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET;
const SMS_SIGN_NAME = process.env.SMS_SIGN_NAME || '待会就办';
const SMS_TEMPLATE_CODE = process.env.SMS_TEMPLATE_CODE || 'SMS_12345678';

// 生成随机验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    
    // 检查是否有阿里云配置
    if (ALIYUN_ACCESS_KEY_ID && ALIYUN_ACCESS_KEY_SECRET) {
      // 实际发送短信
      await sendAliyunSMS(phone, code);
      console.log(`已向 ${phone} 发送验证码: ${code}`);
    } else {
      // 开发环境：仅打印验证码
      console.log('========================================');
      console.log(`手机号: ${phone}`);
      console.log(`验证码: ${code}`);
      console.log('========================================');
    }

    res.json({ 
      success: true, 
      message: '验证码已发送',
      // 未配置短信服务时返回验证码供演示使用
      ...(!ALIYUN_ACCESS_KEY_ID && { code })
    });
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

// 阿里云短信发送函数
async function sendAliyunSMS(phone, code) {
  const date = new Date().toISOString();
  const nonce = Math.random().toString(36).substring(2);
  
  const params = {
    PhoneNumbers: phone,
    SignName: SMS_SIGN_NAME,
    TemplateCode: SMS_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code }),
    AccessKeyId: ALIYUN_ACCESS_KEY_ID,
    Action: 'SendSms',
    Format: 'JSON',
    RegionId: 'cn-hangzhou',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: nonce,
    SignatureVersion: '1.0',
    Timestamp: date,
    Version: '2017-05-25'
  };

  // 排序并构造签名字符串
  const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
    acc[key] = params[key];
    return acc;
  }, {});

  const canonicalQueryString = Object.entries(sortedParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalQueryString)}`;
  const signature = crypto
    .createHmac('sha1', `${ALIYUN_ACCESS_KEY_SECRET}&`)
    .update(stringToSign)
    .digest('base64');

  const url = `https://dysmsapi.aliyuncs.com/?Signature=${encodeURIComponent(signature)}&${canonicalQueryString}`;
  
  const response = await axios.get(url);
  if (response.data.Code !== 'OK') {
    throw new Error(response.data.Message);
  }
  
  return response.data;
}

module.exports = router;
