// API服务配置
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api'
  : 'https://webstatedalban-api.vercel.app/api';

// 存储Token
const storage = {
  setToken: (token) => localStorage.setItem('token', token),
  getToken: () => localStorage.getItem('token'),
  removeToken: () => localStorage.removeItem('token'),
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  removeUser: () => localStorage.removeItem('user')
};

// API请求封装
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = storage.getToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
}

// 认证相关API
const authAPI = {
  // 发送验证码
  sendCode: async (phone) => {
    return apiRequest('/sms/send-code', {
      method: 'POST',
      body: { phone }
    });
  },

  // 登录
  login: async (phone, code) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { phone, code }
    });
    
    if (data.token) {
      storage.setToken(data.token);
      storage.setUser(data.user);
    }
    
    return data;
  },

  // 验证Token
  verify: async () => {
    return apiRequest('/auth/verify', {
      method: 'GET'
    });
  },

  // 退出登录
  logout: () => {
    storage.removeToken();
    storage.removeUser();
  },

  // 获取当前用户
  getCurrentUser: () => storage.getUser(),

  // 检查是否已登录
  isLoggedIn: () => !!storage.getToken()
};

// 待办事项相关API
const todoAPI = {
  // 获取所有待办事项
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiRequest(`/todos?${queryParams}`, {
      method: 'GET'
    });
  },

  // 创建待办事项
  create: async (todoData) => {
    return apiRequest('/todos', {
      method: 'POST',
      body: todoData
    });
  },

  // 更新待办事项
  update: async (id, todoData) => {
    return apiRequest(`/todos/${id}`, {
      method: 'PUT',
      body: todoData
    });
  },

  // 删除待办事项
  delete: async (id) => {
    return apiRequest(`/todos/${id}`, {
      method: 'DELETE'
    });
  },

  // 获取统计数据
  getStats: async () => {
    return apiRequest('/todos/stats/summary', {
      method: 'GET'
    });
  }
};

// 导出API
window.API = {
  auth: authAPI,
  todos: todoAPI,
  storage: storage
};
