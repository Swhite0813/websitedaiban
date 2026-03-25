const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Team = require('../models/Team');
const User = require('../models/User');
const Todo = require('../models/Todo');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未提供Token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.email = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Token无效' });
  }
};

// 获取我的团队
router.get('/', auth, async (req, res) => {
  try {
    const teams = await Team.find({ 'members.userId': req.userId });
    const teamsWithOwner = teams.map(t => ({
      ...t.toObject(),
      owner: t.ownerId
    }));
    res.json({ success: true, teams: teamsWithOwner });
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
        email: user.email,
        nickname: user.nickname || `用户${user.email.split('@')[0]}`,
        role: 'owner'
      }]
    });
    await team.save();
    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ error: '创建团队失败' });
  }
});

// 检查邮箱是否已注册
router.get('/check-phone/:phone', auth, async (req, res) => {
  try {
    const email = req.params.phone;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ exists: false, message: '该邮箱尚未注册' });
    res.json({ exists: true, user: { email: user.email, nickname: user.nickname } });
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 邀请成员
router.post('/:teamId/invite', auth, async (req, res) => {
  try {
    const { phone: email } = req.body;

    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: '团队不存在' });

    const requester = team.members.find(m => m.userId.toString() === req.userId.toString());
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ error: '只有管理员可以邀请成员' });
    }

    const invitee = await User.findOne({ email: email.toLowerCase() });
    if (!invitee) {
      return res.status(400).json({ error: '该邮箱尚未注册，请对方先注册后再邀请', exists: false });
    }

    const alreadyMember = team.members.find(m => m.email === email.toLowerCase());
    if (alreadyMember) return res.status(400).json({ error: '该用户已是团队成员' });

    team.members.push({
      userId: invitee._id,
      email: invitee.email,
      nickname: invitee.nickname || `用户${invitee.email.split('@')[0]}`,
      role: 'member'
    });
    await team.save();
    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ error: '邀请失败' });
  }
});

// 解散团队（仅管理员）
router.delete('/:teamId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: '团队不存在' });
    if (team.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: '只有管理员可以解散团队' });
    }
    await Team.findByIdAndDelete(req.params.teamId);
    await Todo.deleteMany({ teamId: req.params.teamId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '解散团队失败' });
  }
});

// 退出团队（成员）
router.post('/:teamId/leave', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: '团队不存在' });
    const member = team.members.find(m => m.userId.toString() === req.userId.toString());
    if (!member) return res.status(404).json({ error: '你不在该团队中' });
    if (member.role === 'owner') return res.status(400).json({ error: '管理员不能退出，请解散团队' });
    team.members = team.members.filter(m => m.userId.toString() !== req.userId.toString());
    await team.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '退出团队失败' });
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

    const targetEmail = req.params.phone;
    const target = team.members.find(m => m.email === targetEmail);
    if (!target) return res.status(404).json({ error: '成员不存在' });
    if (target.role === 'owner') return res.status(400).json({ error: '不能移除管理员' });

    team.members = team.members.filter(m => m.email !== targetEmail);
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

    const { title, description, priority, assigneeEmail } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '标题不能为空' });

    let assigneeId = null;
    if (assigneeEmail) {
      const assignee = team.members.find(m => m.email === assigneeEmail);
      if (assignee) assigneeId = assignee.userId;
    }

    const todo = new Todo({
      userId: req.userId,
      teamId: req.params.teamId,
      assigneeId,
      assigneePhone: assigneeEmail || null,
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

// 更新团队待办
router.put('/:teamId/todos/:todoId', auth, async (req, res) => {
  try {
    const todo = await Todo.findByIdAndUpdate(req.params.todoId, req.body, { new: true });
    res.json({ success: true, todo });
  } catch (err) {
    res.status(500).json({ error: '更新失败' });
  }
});

// 删除团队待办
router.delete('/:teamId/todos/:todoId', auth, async (req, res) => {
  try {
    await Todo.findByIdAndDelete(req.params.todoId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
