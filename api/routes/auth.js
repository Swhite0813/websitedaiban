const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 手机号+验证码登录
router.post('/login', async (req, res) => {
  try {
    const { phone, code } = req.body;
    
    if (!phone || !code) {
      return res.status(400).json({ error: '手机号和验证码不能为空' });
    }

    // 验证验证码
    const isValid = User.verifyCode(phone, code);
    if (!isValid) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }

    // 查找或创建用户
    let user = await User.findOne({ phone });
    
    if (!user) {
      user = new User({
        phone,
        nickname: `用户${phone.slice(-4)}`,
        isVerified: true
      });
      await user.save();
    } else {
      // 更新最后登录时间
      user.lastLoginAt = new Date();
      await user.save();
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 验证Token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: '未提供Token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Token无效' });
  }
});

// 更新用户信息
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: '未提供Token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { nickname, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { nickname, avatar },
      { new: true }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

module.exports = router;
