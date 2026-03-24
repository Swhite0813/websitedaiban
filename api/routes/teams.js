const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Team = require('../models/Team');
const User = require('../models/User');
const Todo = require('../models/Todo');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未提供Token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.phone = decoded.phone;
    next();
  } catch {
    res.status(401).json({ error: 'Token无效' });
  }
};

// 获取我的团队
router.get('/', auth, async (req, res) => {
  try {
    const teams = await Team.find({ 'members.userId': req.userId });
    res.json({ success: true, teams });
  } catch (err) {
    res.status(500).json({ error: '获取团队失败' });
  }
});

// 创建团队
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '团队名称不能为空' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const team = new Team({
      name: name.trim(),
      ownerId: req.userId,
      members: [{
        userId: req.userId,
        phone: user.phone,
        nickname: user.nickname || `用户${user.phone.slice(-4)}`,
        role: 'owner'
      }]
    });
    await team.save();
    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ error: '创建团队失败' });
  }
});

// 检查手机号是否已注册（邀请前校验）
router.get('/check-phone/:phone', auth, async (req, res) => {
  try {
    const { phone } = req.params;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }
    const user = await User.findOne({ phone });
    if (!user) {
      return res.json({ exists: false, message: '该手机号尚未注册，无法邀请' });
    }
    res.json({
      exists: true,
      user: { phone: user.phone, nickname: user.nickname || `用户${user.phone.slice(-4)}` }
    });
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 邀请成员（先校验手机号是否注册）
router.post('/:teamId/invite', auth, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: '团队不存在' });

    // 只有 owner 可以邀请
    const requester = team.members.find(m => m.userId.toString() === req.userId.toString());
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ error: '只有管理员可以邀请成员' });
    }

    // 校验手机号是否已注册
    const invitee = await User.findOne({ phone });
    if (!invitee) {
      return res.status(400).json({ error: '该手机号尚未注册，请对方先注册后再邀请', exists: false });
    }

    // 检查是否已经是成员
    const alreadyMember = team.members.find(m => m.phone === phone);
    if (alreadyMember) {
      return res.status(400).json({ error: '该用户已是团队成员' });
    }

    team.members.push({
      userId: invitee._id,
      phone: invitee.phone,
      nickname: invitee.nickname || `用户${invitee.phone.slice(-4)}`,
      role: 'member'
    });
    await team.save();

    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ error: '邀请失败' });
  }
});

// 移除成员
router.delete('/:teamId/members/:phone', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: '团队不存在' });

    const requester = team.members.find(m => m.userId.toString() === req.userId.toString());
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ error: '只有管理员可以移除成员' });
    }

    const targetPhone = req.params.phone;
    const target = team.members.find(m => m.phone === targetPhone);
    if (!target) return res.status(404).json({ error: '成员不存在' });
    if (target.role === 'owner') return res.status(400).json({ error: '不能移除管理员' });

    team.members = team.members.filter(m => m.phone !== targetPhone);
    await team.save();

    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ error: '移除成员失败' });
  }
});

// 获取团队待办
router.get('/:teamId/todos', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: '团队不存在' });

    const isMember = team.members.find(m => m.userId.toString() === req.userId.toString());
    if (!isMember) return res.status(403).json({ error: '无权访问' });

    const todos = await Todo.find({ teamId: req.params.teamId }).sort({ createdAt: -1 });
    res.json({ success: true, todos });
  } catch (err) {
    res.status(500).json({ error: '获取团队待办失败' });
  }
});

// 创建团队待办
router.post('/:teamId/todos', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: '团队不存在' });

    const isMember = team.members.find(m => m.userId.toString() === req.userId.toString());
    if (!isMember) return res.status(403).json({ error: '无权操作' });

    const { title, description, priority, assigneePhone } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' });

    let assigneeId = null;
    if (assigneePhone) {
      const assignee = team.members.find(m => m.phone === assigneePhone);
      if (assignee) assigneeId = assignee.userId;
    }

    const todo = new Todo({
      userId: req.userId,
      teamId: req.params.teamId,
      assigneeId,
      assigneePhone: assigneePhone || null,
      title: title.trim(),
      description: description || '',
      priority: priority || 'medium',
      status: 'todo'
    });
    await todo.save();
    res.json({ success: true, todo });
  } catch (err) {
    res.status(500).json({ error: '创建团队待办失败' });
  }
});

module.exports = router;
