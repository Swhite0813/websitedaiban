// API服务配置
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : 'https://webstatedalban-api.vercel.app/api';

// 存储Token
const storage = {
  setToken: (token) => localStorage.setItem('daihui_token', token),
  getToken: () => localStorage.getItem('daihui_token'),
  removeToken: () => localStorage.removeItem('daihui_token'),
  setUser: (user) => localStorage.setItem('daihui_user', JSON.stringify(user)),
  getUser: () => {
    try {
      const u = localStorage.getItem('daihui_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  },
  removeUser: () => localStorage.removeItem('daihui_user')
};

// API请求封装
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = storage.getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.error || '请求失败');
    err.data = data;
    throw err;
  }
  return data;
}

// 认证相关API
const authAPI = {
  sendCode: (phone) => apiRequest('/sms/send-code', { method: 'POST', body: { phone } }),

  login: async (phone, code) => {
    const data = await apiRequest('/auth/login', { method: 'POST', body: { phone, code } });
    if (data.token) {
      storage.setToken(data.token);
      storage.setUser(data.user);
    }
    return data;
  },

  verify: () => apiRequest('/auth/verify'),

  logout: () => {
    storage.removeToken();
    storage.removeUser();
  },

  getCurrentUser: () => storage.getUser(),
  isLoggedIn: () => !!storage.getToken()
};

// 待办事项相关API
const todoAPI = {
  getAll: (filters = {}) => {
    const q = new URLSearchParams(filters).toString();
    return apiRequest(`/todos${q ? '?' + q : ''}`);
  },
  create: (data) => apiRequest('/todos', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/todos/${id}`, { method: 'PUT', body: data }),
  delete: (id) => apiRequest(`/todos/${id}`, { method: 'DELETE' }),
  getStats: () => apiRequest('/todos/stats/summary')
};

// 团队相关API
const teamAPI = {
  getAll: () => apiRequest('/teams'),
  create: (name) => apiRequest('/teams', { method: 'POST', body: { name } }),

  // 邀请前校验手机号是否已注册
  checkPhone: (phone) => apiRequest(`/teams/check-phone/${phone}`),

  // 邀请成员（后端会再次校验手机号）
  invite: (teamId, phone) => apiRequest(`/teams/${teamId}/invite`, { method: 'POST', body: { phone } }),

  removeMember: (teamId, phone) => apiRequest(`/teams/${teamId}/members/${phone}`, { method: 'DELETE' }),

  getTeamTodos: (teamId) => apiRequest(`/teams/${teamId}/todos`),
  createTeamTodo: (teamId, data) => apiRequest(`/teams/${teamId}/todos`, { method: 'POST', body: data })
};

// 导出
window.API = { auth: authAPI, todos: todoAPI, teams: teamAPI, storage };
