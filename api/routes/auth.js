const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 注册
router.post('/register', async (req, res) => {
  try {
    const { email, username, nickname, password, captcha, captchaAnswer } = req.body;

    if (!email || !username || !password || !captcha || !captchaAnswer) {
      return res.status(400).json({ error: '所有字段不能为空' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度需在 2-20 位之间' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度不能少于 6 位' });
    }

    // 验证图形验证码
    const captchaStore = global._captchaStore || (global._captchaStore = new Map());
    const stored = captchaStore.get(captcha);
    if (!stored || stored.answer !== captchaAnswer.trim() || Date.now() > stored.expiresAt) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }
    captchaStore.delete(captcha);

    // 检查邮箱和用户名是否已存在
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) return res.status(400).json({ error: '该邮箱已被注册' });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ error: '该用户名已被使用' });

    const user = new User({
      email: email.toLowerCase(),
      username,
      nickname: nickname || username,
      password
    });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, username: user.username, nickname: user.nickname }
    });
  } catch (error) {
    console.error('注册失败:', error.message);
    res.status(500).json({ error: '注册失败: ' + error.message });
  }
});

// 登录（邮箱或用户名 + 密码）
router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body;
    if (!account || !password) {
      return res.status(400).json({ error: '账号和密码不能为空' });
    }

    // 邮箱或用户名查找
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account);
    const user = await User.findOne(
      isEmail ? { email: account.toLowerCase() } : { username: account }
    );

    if (!user) return res.status(400).json({ error: '账号不存在' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(400).json({ error: '密码错误' });

    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, username: user.username, nickname: user.nickname }
    });
  } catch (error) {
    console.error('登录失败:', error.message);
    res.status(500).json({ error: '登录失败: ' + error.message });
  }
});

// 生成图形验证码
router.get('/captcha', (req, res) => {
  const num1 = Math.floor(Math.random() * 10);
  const num2 = Math.floor(Math.random() * 10);
  const answer = (num1 + num2).toString();
  const id = Math.random().toString(36).slice(2);
  const captchaStore = global._captchaStore || (global._captchaStore = new Map());
  captchaStore.set(id, { answer, expiresAt: Date.now() + 5 * 60 * 1000 });
  // 过期清理
  if (captchaStore.size > 1000) {
    for (const [k, v] of captchaStore) {
      if (Date.now() > v.expiresAt) captchaStore.delete(k);
    }
  }
  res.json({ id, question: `${num1} + ${num2} = ?` });
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
      user: { id: user._id, email: user.email, username: user.username, nickname: user.nickname }
    });
  } catch (error) {
    res.status(401).json({ error: 'Token无效' });
  }
});

module.exports = router;
