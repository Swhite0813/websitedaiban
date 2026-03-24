const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Todo = require('../models/Todo');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 验证中间件
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: '未提供Token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token无效' });
  }
};

// 获取所有待办事项
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    
    let query = { userId: req.userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const todos = await Todo.find(query).sort({ createdAt: -1 });
    res.json({ success: true, todos });
  } catch (error) {
    console.error('获取待办事项失败:', error);
    res.status(500).json({ error: '获取待办事项失败' });
  }
});

// 创建待办事项
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, priority, dueDate, tags } = req.body;
    
    const todo = new Todo({
      userId: req.userId,
      title,
      description,
      priority: priority || 'medium',
      dueDate,
      tags: tags || []
    });
    
    await todo.save();
    res.json({ success: true, todo });
  } catch (error) {
    console.error('创建待办事项失败:', error);
    res.status(500).json({ error: '创建待办事项失败' });
  }
});

// 更新待办事项
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, priority, status, dueDate, tags } = req.body;
    
    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title, description, priority, status, dueDate, tags },
      { new: true }
    );
    
    if (!todo) {
      return res.status(404).json({ error: '待办事项不存在' });
    }
    
    res.json({ success: true, todo });
  } catch (error) {
    console.error('更新待办事项失败:', error);
    res.status(500).json({ error: '更新待办事项失败' });
  }
});

// 删除待办事项
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!todo) {
      return res.status(404).json({ error: '待办事项不存在' });
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除待办事项失败:', error);
    res.status(500).json({ error: '删除待办事项失败' });
  }
});

// 获取统计数据
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const total = await Todo.countDocuments({ userId: req.userId });
    const completed = await Todo.countDocuments({ userId: req.userId, status: 'done' });
    const pending = await Todo.countDocuments({ userId: req.userId, status: { $ne: 'done' } });
    const highPriority = await Todo.countDocuments({ userId: req.userId, priority: 'high', status: { $ne: 'done' } });
    
    res.json({
      success: true,
      stats: {
        total,
        completed,
        pending,
        highPriority,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

module.exports = router;
