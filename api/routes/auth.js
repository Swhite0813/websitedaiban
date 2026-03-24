const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 邮箱+验证码登录
router.post('/login', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: '邮箱和验证码不能为空' });
    }

    // 验证码校验（支持DB和内存回退）
    let isValid = false;
    try {
      isValid = await User.verifyCode(email, code);
      console.log(`DB验证码校验: email=${email}, isValid=${isValid}`);
    } catch (dbErr) {
      console.error('DB验证码校验失败，回退内存:', dbErr.message);
      const memCodes = global._verificationCodes;
      if (memCodes) {
        const record = memCodes.get(email.toLowerCase());
        if (record && Date.now() <= record.expiresAt && record.code === code) {
          isValid = true;
          memCodes.delete(email.toLowerCase());
        }
      }
    }

    if (!isValid) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }

    // 查找或创建用户
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      const namePart = email.split('@')[0].slice(0, 8);
      user = await User.create({
        email: email.toLowerCase(),
        nickname: '用户' + namePart,
        isVerified: true
      });
    } else {
      await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('登录失败详情:', error.message, error.stack);
    res.status(500).json({ error: '登录失败: ' + error.message });
  }
});

// 验证Token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未提供Token' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: '用户不存在' });

    res.json({
      valid: true,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Token无效' });
  }
});

module.exports = router;
