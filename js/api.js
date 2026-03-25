// API服务配置
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : 'https://daihui-api-237979-9-1415563523.sh.run.tcloudbase.com/api';

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
  getCaptcha: () => apiRequest('/auth/captcha'),

  register: async (email, username, nickname, password, captcha, captchaAnswer) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: { email, username, nickname, password, captcha, captchaAnswer }
    });
    if (data.token) {
      storage.setToken(data.token);
      storage.setUser(data.user);
    }
    return data;
  },

  login: async (account, password) => {
    const data = await apiRequest('/auth/login', { method: 'POST', body: { account, password } });
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
  checkPhone: (email) => apiRequest(`/teams/check-phone/${encodeURIComponent(email)}`),
  invite: (teamId, email) => apiRequest(`/teams/${teamId}/invite`, { method: 'POST', body: { phone: email } }),
  removeMember: (teamId, email) => apiRequest(`/teams/${teamId}/members/${encodeURIComponent(email)}`, { method: 'DELETE' }),
  dissolve: (teamId) => apiRequest(`/teams/${teamId}`, { method: 'DELETE' }),
  leave: (teamId) => apiRequest(`/teams/${teamId}/leave`, { method: 'POST' }),
  getTeamTodos: (teamId) => apiRequest(`/teams/${teamId}/todos`),
  rename: (teamId, name) => apiRequest(`/teams/${teamId}/rename`, { method: 'PUT', body: { name } }),
  createTeamTodo: (teamId, data) => apiRequest(`/teams/${teamId}/todos`, { method: 'POST', body: data }),
  updateTeamTodo: (teamId, todoId, data) => apiRequest(`/teams/${teamId}/todos/${todoId}`, { method: 'PUT', body: data }),
  deleteTeamTodo: (teamId, todoId) => apiRequest(`/teams/${teamId}/todos/${todoId}`, { method: 'DELETE' })
};

// 导出
window.API = { auth: authAPI, todos: todoAPI, teams: teamAPI, storage };
