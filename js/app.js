// v3.1-auth
// ============================================================
// 待会·就办 — Main App (Vanilla JS SPA)
// Connects to real backend via window.API (js/api.js)
// ============================================================

// ---- State ----
const S = {
  user: null,
  page: 'home',   // home | login | dashboard
  dashTab: 'todos',
  todos: [],
  teams: [],
  loading: false,
  modal: null,    // null | { type, data }
};

// ---- Toast ----
function toast(msg, type = 'info') {
  const c = document.getElementById('toastc');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast t-${type === 'success' ? 'ok' : type === 'error' ? 'err' : 'info'}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ---- Router ----
function navigate(page, dashTab) {
  S.page = page;
  if (dashTab) S.dashTab = dashTab;
  render();
  window.scrollTo(0, 0);
}

// ---- Auth helpers ----
async function checkAuth() {
  const token = API.storage.getToken();
  if (!token) return;
  try {
    const res = await API.auth.verify();
    if (res.valid) {
      S.user = res.user;
      API.storage.setUser(res.user);
    }
  } catch {
    API.auth.logout();
  }
}

// ---- Data loaders ----
async function loadTodos() {
  try {
    const res = await API.todos.getAll();
    S.todos = res.todos || [];
  } catch { S.todos = []; }
}

async function loadTeams() {
  try {
    const res = await API.teams.getAll();
    S.teams = res.teams || [];
    for (const t of S.teams) {
      try {
        const r = await API.teams.getTeamTodos(t._id);
        t.todos = r.todos || [];
      } catch { t.todos = []; }
    }
  } catch { S.teams = []; }
}

async function loadDashboard() {
  S.loading = true;
  render();
  await Promise.all([loadTodos(), loadTeams()]);
  S.loading = false;
  render();
}

const PRIO_LABEL = { high: '紧急', medium: '中', low: '低' };
const PRIO_CLASS = { high: 'b-high', medium: 'b-medium', low: 'b-low' };
const STATUS_LABEL = { todo: '待办', doing: '进行中', done: '已完成' };
const STATUS_CLASS = { todo: 'b-todo', doing: 'b-doing', done: 'b-done' };
const STATUS_NEXT = { todo: 'doing', doing: 'done', done: 'todo' };

function badgePrio(p) { return `<span class="badge ${PRIO_CLASS[p]||'b-low'}">${PRIO_LABEL[p]||p}</span>`; }
function badgeStatus(s) { return `<span class="badge ${STATUS_CLASS[s]||'b-todo'}">${STATUS_LABEL[s]||s}</span>`; }
function avBg(role) { return role==='owner'?'background:linear-gradient(135deg,#3D5AFE,#7C3AED);color:#fff':'background:var(--s2);color:var(--t2);border:1px solid var(--border)'; }
function phoneMask(p) { return p?p.replace(/(\d{3})(\d{4})(\d{4})/,'$1****$3'):''; }
function nameAv(name) { return (name||'?').slice(-2,-1)||(name||'?')[0]||'?'; }

const ICON = {
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  rotate: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>`,
  logout: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  todo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  team: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  grid: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  spin: `<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>`,
  back: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

// ============================================================
// PAGE: HOME
// ============================================================
function renderHome() {
  return `
  <div class="page">
    <section class="hero">
      <div class="ctr">
        <div class="badge b-low fu" style="margin-bottom:18px;display:inline-flex">现已支持团队协作</div>
        <h1 class="fu d1">待会？<br><span style="color:var(--brand)">现在就办！</span></h1>
        <p class="fu d2">个人任务管理 + 团队协作，帮你把"待会再说"变成"马上搞定"。简单、快速、真实落地。</p>
        <div class="flex gap-2 fu d3" style="justify-content:center;flex-wrap:wrap">
          <button class="btn btn-brand" onclick="navigate('login')">免费开始使用</button>
          <button class="btn btn-outline" onclick="document.getElementById('features-section')?.scrollIntoView({behavior:'smooth'})">了解功能</button>
        </div>
      </div>
    </section>

    <section id="features-section" style="padding:70px 20px;font-family:'DM Sans',sans-serif">
      <div class="ctr">
        <div class="text-center mb-6">
          <div class="badge b-low" style="display:inline-flex;margin-bottom:12px">核心功能</div>
          <h2 style="font-size:clamp(1.8rem,4vw,2.8rem);margin-bottom:10px">简单，才是最大效率</h2>
          <p class="text-muted">三个核心模块，解决效率管理最本质的问题。</p>
        </div>
      </div>
    </section>

    <footer style="padding:28px 20px;border-top:1px solid var(--border);background:var(--surface)">
      <div class="ctr flex justify-between items-center flex-wrap gap-2">
        <div class="logo">
          <div class="logo-icon" style="width:28px;height:28px;font-size:12px">待</div>
          <span class="logo-text" style="font-size:15px">待会<span style="color:var(--brand)">·</span>就办</span>
        </div>
        <p class="text-sm text-muted">© 2026 待会·就办. 保留所有权利。</p>
      </div>
    </footer>
  </div>
  `;
}

// ============================================================
// PAGE: LOGIN
// ============================================================
let loginState = { step: 'login', error: '', captchaId: '', captchaQuestion: '' };

async function loadCaptcha() {
  try {
    const res = await API.auth.getCaptcha();
    loginState.captchaId = res.id;
    loginState.captchaQuestion = res.question;
    const el = document.getElementById('captcha-question');
    if (el) el.textContent = res.question;
  } catch(e) { console.error('验证码加载失败', e); }
}

function switchLoginTab(tab) {
  loginState.step = tab;
  render();
  if (tab === 'register') setTimeout(loadCaptcha, 100);
}

async function doLogin() {
  const account = document.getElementById('account-inp')?.value?.trim() || '';
  const password = document.getElementById('password-inp')?.value || '';
  const errEl = document.getElementById('login-err');
  if (!account || !password) { if (errEl) errEl.textContent = '账号和密码不能为空'; return; }
  if (errEl) errEl.textContent = '';
  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = '登录中…';
  try {
    const res = await API.auth.login(account, password);
    S.user = res.user; loginState.step = 'success'; render();
    await loadDashboard(); setTimeout(() => navigate('dashboard'), 1500);
  } catch(e) {
    if (errEl) errEl.textContent = e.message || '账号或密码错误';
    btn.disabled = false; btn.textContent = '登录';
  }
}

async function doRegister() {
  const email = document.getElementById('reg-email')?.value?.trim() || '';
  const username = document.getElementById('reg-username')?.value?.trim() || '';
  const nickname = document.getElementById('reg-nickname')?.value?.trim() || '';
  const password = document.getElementById('reg-password')?.value || '';
  const password2 = document.getElementById('reg-password2')?.value || '';
  const captchaAnswer = document.getElementById('reg-captcha')?.value?.trim() || '';
  const errEl = document.getElementById('reg-err');
  if (!email || !username || !password || !captchaAnswer) { if (errEl) errEl.textContent = '请填写所有必填项'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { if (errEl) errEl.textContent = '邮箱格式不正确'; return; }
  if (password.length < 6) { if (errEl) errEl.textContent = '密码不能少于 6 位'; return; }
  if (password !== password2) { if (errEl) errEl.textContent = '两次密码不一致'; return; }
  if (errEl) errEl.textContent = '';
  const 