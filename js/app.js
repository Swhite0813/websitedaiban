// v3.2-auth
// ============================================================
// 待会·就办 — Main App (Vanilla JS SPA)
// Connects to real backend via window.API (js/api.js)
// ============================================================

// ---- State ----
const S = {
  user: null,
  page: 'home',   // home | login | dashboard
  dashTab: 'todos',  // todos | myteams | teamtodos
  todos: [],
  teams: [],
  currentTeamId: null,  // 当前查看的团队id
  teamFilter: '',       // 团队任务经办人筛选
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
        <div class="fgrid mt-4">
          <div class="card card-h p-5 fu d1">
            <div class="ficon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <h3 style="font-size:17px;margin-bottom:8px">个人待办管理</h3>
            <p class="text-muted text-sm" style="line-height:1.7">创建、分类、设置优先级和截止日期，把所有任务一网打尽。支持紧急 / 中 / 低三级优先级，随时掌控进度。</p>
          </div>
          <div class="card card-h p-5 fu d2">
            <div class="ficon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3 style="font-size:17px;margin-bottom:8px">团队协作</h3>
            <p class="text-muted text-sm" style="line-height:1.7">创建团队、邀请成员，共享团队任务清单。角色分明，创建者可管理成员，告别信息孤岛。</p>
          </div>
          <div class="card card-h p-5 fu d3">
            <div class="ficon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <h3 style="font-size:17px;margin-bottom:8px">数据概览</h3>
            <p class="text-muted text-sm" style="line-height:1.7">一屏看清全部任务状态：总量、已完成、进行中、紧急未完成，完成率一目了然，让效率可视化。</p>
          </div>
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
  const btn = document.getElementById('reg-btn');
  if (btn) { btn.disabled = true; btn.textContent = '注册中…'; }
  try {
    const res = await API.auth.register(email, username, nickname, password, loginState.captchaId, captchaAnswer);
    S.user = res.user;
    loginState.step = 'success';
    render();
    await loadDashboard();
    setTimeout(() => navigate('dashboard'), 1500);
  } catch(e) {
    if (errEl) errEl.textContent = e.message || '注册失败，请重试';
    if (btn) { btn.disabled = false; btn.textContent = '注册'; }
    // 验证码用过一次后刷新
    setTimeout(loadCaptcha, 300);
  }
}

// ============================================================
// RENDER LOGIN PAGE
// ============================================================
function renderLogin() {
  if (loginState.step === 'success') {
    return `
    <div class="page" style="background:linear-gradient(135deg,#EEF1FF 0%,#F5F3FF 50%,#EFFFFA 100%);display:flex;align-items:center;justify-content:center;min-height:100vh">
      <div class="card-brand p-6" style="max-width:420px;width:100%;text-align:center">
        <div style="width:64px;height:64px;border-radius:50%;background:#D1FAE5;border:2px solid #a8f0d5;display:flex;align-items:center;justify-content:center;margin:0 auto 18px">
          <svg width="32" height="32" viewBox="0 0 50 50" fill="none"><polyline points="12,25 22,35 38,15" stroke="#10B981" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h2 style="font-size:22px;margin-bottom:8px">登录成功！</h2>
        <p class="text-muted text-sm">正在进入工作台…</p>
        <div style="height:4px;background:#F3F4F8;border-radius:2px;margin-top:20px;overflow:hidden">
          <div style="height:100%;background:var(--brand);border-radius:2px;animation:progressFill 1.4s ease forwards"></div>
        </div>
      </div>
    </div>`;
  }

  const isLogin = loginState.step === 'login';
  const isRegister = loginState.step === 'register';

  return `
  <div class="page" style="background:linear-gradient(135deg,#EEF1FF 0%,#F5F3FF 50%,#EFFFFA 100%);display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px">
    <div style="width:100%;max-width:440px">
      <div class="text-center mb-6">
        <div class="logo" style="justify-content:center;margin-bottom:4px">
          <div class="logo-icon">待</div>
          <span class="logo-text">待会<span style="color:var(--brand)">·</span>就办</span>
        </div>
      </div>
      <div class="card-brand p-6">
        <div class="flex gap-2 mb-5" style="background:var(--s2);border-radius:10px;padding:4px">
          <button onclick="switchLoginTab('login')" style="flex:1;padding:8px;border-radius:7px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;${isLogin?'background:#fff;color:var(--brand);box-shadow:var(--ss)':'background:transparent;color:var(--muted)'}">登录</button>
          <button onclick="switchLoginTab('register')" style="flex:1;padding:8px;border-radius:7px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;${isRegister?'background:#fff;color:var(--brand);box-shadow:var(--ss)':'background:transparent;color:var(--muted)'}">注册</button>
        </div>

        ${isLogin ? `
        <label class="label">账号（用户名或邮箱）</label>
        <input id="account-inp" type="text" placeholder="请输入用户名或邮箱" class="inp mb-3" onkeydown="if(event.key==='Enter')doLogin()" />
        <label class="label">密码</label>
        <input id="password-inp" type="password" placeholder="请输入密码" class="inp mb-4" onkeydown="if(event.key==='Enter')doLogin()" />
        <p id="login-err" class="text-xs mb-3" style="color:var(--red);min-height:16px"></p>
        <button id="login-btn" class="btn btn-brand w-full" onclick="doLogin()">登录</button>
        ` : `
        <label class="label">用户名 <span style="color:var(--red)">*</span></label>
        <input id="reg-username" type="text" placeholder="2-20位，唯一标识" class="inp mb-3" />
        <label class="label">注册邮箱 <span style="color:var(--red)">*</span></label>
        <input id="reg-email" type="email" placeholder="请输入邮箱" class="inp mb-3" />
        <label class="label">昵称（选填）</label>
        <input id="reg-nickname" type="text" placeholder="显示名称，默认与用户名相同" class="inp mb-3" />
        <label class="label">密码 <span style="color:var(--red)">*</span></label>
        <input id="reg-password" type="password" placeholder="至少6位" class="inp mb-3" />
        <label class="label">确认密码 <span style="color:var(--red)">*</span></label>
        <input id="reg-password2" type="password" placeholder="再次输入密码" class="inp mb-3" />
        <label class="label">图形验证码 <span style="color:var(--red)">*</span></label>
        <div class="flex gap-2 items-center mb-1">
          <input id="reg-captcha" type="text" placeholder="请输入答案" class="inp flex-1" />
          <div style="background:var(--bl);border:1.5px solid var(--bb);border-radius:8px;padding:8px 14px;font-size:15px;font-weight:700;color:var(--brand);white-space:nowrap;min-width:100px;text-align:center">
            <span id="captcha-question">加载中…</span>
          </div>
          <button onclick="loadCaptcha()" style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;cursor:pointer;font-size:18px;flex-shrink:0" title="换一题">↻</button>
        </div>
        <p id="reg-err" class="text-xs mb-3" style="color:var(--red);min-height:16px"></p>
        <button id="reg-btn" class="btn btn-brand w-full" onclick="doRegister()">注册</button>
        `}
        <p class="text-xs text-center mt-4 text-muted">继续即表示同意 <a href="#" style="color:var(--brand)">服务条款</a> 和 <a href="#" style="color:var(--brand)">隐私政策</a></p>
      </div>
      <p class="text-center text-sm text-muted mt-4"><button class="nav-btn" onclick="navigate('home')">← 返回首页</button></p>
    </div>
  </div>`;
}

// ============================================================
// RENDER DASHBOARD
// ============================================================
function renderDashboard() {
  const u = S.user || {};
  const name = u.nickname || u.username || '用户';
  if (S.loading) {
    return `<div class="page" style="display:flex;align-items:center;justify-content:center;min-height:100vh">
      <div class="text-center">${ICON.spin}<p class="text-muted mt-3">加载中…</p></div>
    </div>`;
  }
  const needsBottomBar = S.dashTab === 'todos' || S.dashTab === 'teamtodos';
  return `
  <div class="dash">
    <aside class="sidebar">
      <div class="flex items-center gap-2 mb-4 p-2">
        <div class="av" style="background:linear-gradient(135deg,#3D5AFE,#7C3AED);color:#fff">${nameAv(name)}</div>
        <div class="min-w-0">
          <p class="font-semibold truncate" style="font-size:14px">${name}</p>
          <p class="text-xs text-muted truncate">${u.email||''}</p>
        </div>
      </div>
      <div class="divider"></div>
      <button class="si ${S.dashTab==='todos'?'active':''}" onclick="switchTab('todos')">${ICON.todo} 我的待办</button>
      <button class="si ${S.dashTab==='myteams'||S.dashTab==='teamtodos'?'active':''}" onclick="switchTab('myteams')">${ICON.team} 我的团队</button>
    </aside>
    <main class="dmain" style="${needsBottomBar?'padding-bottom:80px':''}">
      ${S.dashTab==='todos' ? renderTodos() : S.dashTab==='myteams' ? renderMyTeams() : renderTeamTodos()}
    </main>
    ${S.modal ? renderModal() : ''}
  </div>
  <nav class="mbnav">
    <button class="si ${S.dashTab==='todos'?'active':''}" style="flex:1;flex-direction:column;gap:3px;font-size:11px;padding:8px 4px" onclick="switchTab('todos')">${ICON.todo}<span>待办</span></button>
    <button class="si ${S.dashTab==='myteams'||S.dashTab==='teamtodos'?'active':''}" style="flex:1;flex-direction:column;gap:3px;font-size:11px;padding:8px 4px" onclick="switchTab('myteams')">${ICON.team}<span>我的团队</span></button>
  </nav>
  ${needsBottomBar ? `
  <div style="position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--surface);border-top:1px solid var(--border);padding:10px 16px 16px;box-shadow:0 -4px 20px rgba(40,50,120,.1)">
    <div class="flex gap-2 items-center" style="max-width:860px;margin:0 auto">
      <input id="quick-add-inp" class="inp flex-1" placeholder="${S.dashTab==='teamtodos'?'快速新建团队任务…':'快速记录待办，按 Enter 创建…'}" onkeydown="if(event.key==='Enter'){S.dashTab==='teamtodos'?quickAddTeamTodo('${S.currentTeamId}'):quickAddTodo()}" style="padding:10px 14px" />
      <select id="quick-add-prio" class="inp" style="width:80px;padding:10px 8px">
        <option value="high">紧急</option>
        <option value="medium" selected>中</option>
        <option value="low">低</option>
      </select>
      <button class="btn btn-brand" onclick="S.dashTab==='teamtodos'?quickAddTeamTodo('${S.currentTeamId}'):quickAddTodo()" style="padding:10px 16px">${ICON.plus}</button>
    </div>
  </div>` : ''}`;
}

function renderOverview() {
  const total = S.todos.length;
  const done = S.todos.filter(t=>t.status==='done').length;
  const doing = S.todos.filter(t=>t.status==='doing').length;
  const high = S.todos.filter(t=>t.priority==='high'&&t.status!=='done').length;
  return `
  <div>
    <h2 style="font-size:22px;margin-bottom:20px">概览</h2>
    <div class="grid-2" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px">
      <div class="card p-5"><p class="text-xs text-muted mb-1">全部任务</p><p class="snum">${total}</p></div>
      <div class="card p-5"><p class="text-xs text-muted mb-1">已完成</p><p class="snum" style="color:var(--green)">${done}</p></div>
      <div class="card p-5"><p class="text-xs text-muted mb-1">进行中</p><p class="snum" style="color:var(--amber)">${doing}</p></div>
      <div class="card p-5"><p class="text-xs text-muted mb-1">紧急未完成</p><p class="snum" style="color:var(--red)">${high}</p></div>
    </div>
    <h3 style="font-size:16px;margin-bottom:12px">最近待办</h3>
    <div class="space-y-2">
      ${S.todos.slice(0,5).map(t=>`
      <div class="trow ${t.status==='done'?'done':''}">
        <div class="chk ${t.status==='done'?'checked':t.status==='doing'?'doing':''}" onclick="cycleTodoStatus('${t._id}','${t.status}')"></div>
        <span class="flex-1 truncate" style="font-size:14px;${t.status==='done'?'text-decoration:line-through;color:var(--muted)':''}">${t.title}</span>
        ${badgePrio(t.priority)}
      </div>`).join('') || '<p class="text-muted text-sm">暂无待办事项</p>'}
    </div>
  </div>`;
}

function renderTodos() {
  const total = S.todos.length;
  const done = S.todos.filter(t=>t.status==='done').length;
  const doing = S.todos.filter(t=>t.status==='doing').length;
  const high = S.todos.filter(t=>t.priority==='high'&&t.status!=='done').length;
  return `
  <div>
    <div class="grid-2" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px">
      <div class="card p-4"><p class="text-xs text-muted mb-1">全部</p><p class="snum">${total}</p></div>
      <div class="card p-4"><p class="text-xs text-muted mb-1">已完成</p><p class="snum" style="color:var(--green)">${done}</p></div>
      <div class="card p-4"><p class="text-xs text-muted mb-1">进行中</p><p class="snum" style="color:var(--amber)">${doing}</p></div>
      <div class="card p-4"><p class="text-xs text-muted mb-1">紧急</p><p class="snum" style="color:var(--red)">${high}</p></div>
    </div>
    <div class="space-y-2">
      ${S.todos.length===0
        ? `<div class="card p-6 text-center"><p class="text-muted">还没有待办，在底部输入框快速创建吧</p></div>`
        : S.todos.map(t=>`
      <div class="trow ${t.status==='done'?'done':''}" style="padding:12px 14px">
        <div class="chk ${t.status==='done'?'checked':t.status==='doing'?'doing':''}" onclick="cycleTodoStatus('${t._id}','${t.status}')" title="点击切换状态">
          ${t.status==='done'?ICON.check:''}
        </div>
        <div class="flex-1 min-w-0">
          <p class="truncate" style="font-size:14px;font-weight:500;${t.status==='done'?'text-decoration:line-through;color:var(--muted)':''}">${t.title}</p>
          ${t.description?`<p class="text-xs text-muted truncate mt-1">${t.description}</p>`:''}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${badgePrio(t.priority)}
          ${badgeStatus(t.status)}
          <button class="btn btn-danger btn-xs" onclick="deleteTodo('${t._id}')">${ICON.trash}</button>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderMyTeams() {
  const canCreate = S.teams.length < 3;
  return `
  <div>
    <div class="flex items-center justify-between mb-4" style="flex-wrap:wrap;gap:10px">
      <h2 style="font-size:22px">我的团队</h2>
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm" onclick="openModal('inviteMember',null)">${ICON.team} 邀请成员</button>
        <button class="btn btn-brand btn-sm" onclick="openModal('createTeam')" ${!canCreate?'disabled title="最多加入/创建3个团队"':''}>${ICON.plus} 创建团队</button>
      </div>
    </div>
    ${!canCreate?'<p class="text-xs text-muted mb-3">已达上限（最多3个团队）</p>':''}
    ${S.teams.length===0
      ? `<div class="card p-6 text-center">
          <div style="width:56px;height:56px;border-radius:16px;background:var(--bl);border:1.5px solid var(--bb);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">${ICON.team}</div>
          <p class="font-semibold mb-2">还没有团队</p>
          <p class="text-muted text-sm mb-4">创建一个团队，邀请成员开始协作</p>
          <button class="btn btn-brand btn-sm" onclick="openModal('createTeam')">${ICON.plus} 创建团队</button>
        </div>`
      : S.teams.map(t=>{
          const isOwner = t.owner?.toString()===S.user?.id || t.ownerId?.toString()===S.user?.id;
          return `<div class="card card-h p-5 mb-3" style="cursor:pointer" onclick="enterTeam('${t._id}')">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="av" style="width:42px;height:42px;font-size:15px;${avBg(isOwner?'owner':'member')}">${nameAv(t.name)}</div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-semibold" style="font-size:15px">${t.name}</p>
                    ${isOwner?'<button class="btn btn-surface btn-xs" style="padding:2px 7px;font-size:11px" onclick="event.stopPropagation();openModal(\"editTeamName\",\"'+t._id+'|"+t.name.replace(/"/g,"")+"\")">编辑</button>':''}
                  </div>
                  <p class="text-xs text-muted mt-1">${(t.members||[]).length} 位成员 · ${(t.todos||[]).length} 项任务</p>
                </div>
              </div>
              <div class="flex items-center gap-2" onclick="event.stopPropagation()">
                <span class="badge ${isOwner?'b-owner':'b-member'}">${isOwner?'创建者':'成员'}</span>
                ${isOwner
                  ? `<button class="btn btn-danger btn-xs" onclick="dissolveTeam('${t._id}')">解散</button>`
                  : `<button class="btn btn-outline btn-xs" onclick="leaveTeam('${t._id}')">退出</button>`
                }
              </div>
            </div>
          </div>`;
        }).join('')}
  </div>`;
}

function renderTeamTodos() {
  const team = S.teams.find(t=>t._id===S.currentTeamId);
  if (!team) {
    return `<div class="card p-6 text-center">
      <p class="text-muted mb-3">请先在「我的团队」中选择一个团队</p>
      <button class="btn btn-outline btn-sm" onclick="switchTab('myteams')">去选择团队</button>
    </div>`;
  }
  const todos = team.todos || [];
  const assignees = [...new Set(todos.map(t=>t.assigneePhone||t.assigneeEmail||'').filter(Boolean))];
  const filtered = S.teamFilter ? todos.filter(t=>(t.assigneePhone||t.assigneeEmail||'')===S.teamFilter) : todos;
  const isOwner = team.owner?.toString()===S.user?.id || team.ownerId?.toString()===S.user?.id;
  return `
  <div>
    <div class="flex items-center gap-2 mb-1">
      <button class="btn btn-surface btn-xs" onclick="switchTab('myteams')">${ICON.back} 返回</button>
      <h2 style="font-size:20px;flex:1">${team.name}</h2>
    </div>
    <p class="text-xs text-muted mb-3">${(team.members||[]).length} 位成员 · ${todos.length} 项任务</p>
    ${assignees.length>0 ? `
    <div class="flex gap-2 mb-4" style="flex-wrap:wrap">
      <button class="badge ${!S.teamFilter?'b-owner':'b-todo'}" style="cursor:pointer" onclick="setTeamFilter('')">全部</button>
      ${assignees.map(a=>`<button class="badge ${S.teamFilter===a?'b-owner':'b-todo'}" style="cursor:pointer" onclick="setTeamFilter('${a}')">${a}</button>`).join('')}
    </div>` : ''}
    <div class="space-y-2">
      ${filtered.length===0
        ? `<div class="card p-5 text-center"><p class="text-muted text-sm">${S.teamFilter?'该成员暂无任务':'团队还没有任务，请开始创建吧'}</p></div>`
        : filtered.map(t=>{
            const assigneeLabel = t.assigneeEmail||'';
            return `<div class="trow ${t.status==='done'?'done':''}" style="padding:12px 14px">
              <div class="chk ${t.status==='done'?'checked':t.status==='doing'?'doing':''}" onclick="cycleTeamTodoStatus('${team._id}','${t._id}','${t.status}')" title="切换状态">
                ${t.status==='done'?ICON.check:''}
              </div>
              <div class="flex-1 min-w-0">
                <p class="truncate" style="font-size:14px;font-weight:500;${t.status==='done'?'text-decoration:line-through;color:var(--muted)':''}">${t.title}</p>
                ${assigneeLabel?`<p class="text-xs text-muted mt-1">经办人：${assigneeLabel}</p>`:''}
              </div>
              <div class="flex items-center gap-2 shrink-0">
                ${badgePrio(t.priority)}
                ${badgeStatus(t.status)}
                ${isOwner?`<button class="btn btn-danger btn-xs" onclick="deleteTeamTodo('${team._id}','${t._id}')">${ICON.trash}</button>`:''}
              </div>
            </div>`;
          }).join('')}
    </div>
  </div>`;
}

function renderModal() {
  const m = S.modal;
  if (!m) return '';
  if (m.type === 'addTodo') {
    return `<div class="mbd" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <button class="mclose" onclick="closeModal()">${ICON.x}</button>
        <p class="mtitle mb-4">新建待办</p>
        <label class="label">标题 *</label>
        <input id="m-title" class="inp mb-3" placeholder="待办事项标题" />
        <label class="label">描述</label>
        <input id="m-desc" class="inp mb-3" placeholder="可选描述" />
        <div class="grid-2 mb-4">
          <div><label class="label">优先级</label>
            <select id="m-prio" class="inp">
              <option value="high">紧急</option>
              <option value="medium" selected>中</option>
              <option value="low">低</option>
            </select></div>
          <div><label class="label">截止日期</label>
            <input id="m-due" type="date" class="inp" /></div>
        </div>
        <button class="btn btn-brand w-full" onclick="submitAddTodo()">创建</button>
      </div>
    </div>`;
  }
  if (m.type === 'createTeam') {
    return `<div class="mbd" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <button class="mclose" onclick="closeModal()">${ICON.x}</button>
        <p class="mtitle mb-4">创建团队</p>
        <label class="label">团队名称 *</label>
        <input id="m-team-name" class="inp mb-4" placeholder="给团队起个名字" />
        <button class="btn btn-brand w-full" onclick="submitCreateTeam()">创建</button>
      </div>
    </div>`;
  }
  if (m.type === 'inviteMember') {
    const ownerTeams = S.teams.filter(t => t.owner?.toString()===S.user?.id || t.ownerId?.toString()===S.user?.id);
    return `<div class="mbd" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <button class="mclose" onclick="closeModal()">${ICON.x}</button>
        <p class="mtitle mb-4">邀请成员</p>
        <label class="label">成员邮箱 *</label>
        <input id="m-invite-email" class="inp mb-3" placeholder="输入对方注册邮箱" />
        <label class="label">选择要加入的团队（可多选）*</label>
        <div class="mb-4" style="display:flex;flex-direction:column;gap:8px">
          ${ownerTeams.length===0
            ? '<p class="text-xs text-muted">你还没有创建任何团队，无法邀请他人</p>'
            : ownerTeams.map(t => `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--s2)">
                <input type="checkbox" value="${t._id}" style="width:16px;height:16px;cursor:pointer" />
                <span style="font-size:14px">${t.name}</span>
              </label>`).join('')
          }
        </div>
        <button class="btn btn-brand w-full" onclick="submitInviteMulti()">邀请</button>
      </div>
    </div>`;
  }
  if (m.type === 'editTeamName') {
    const parts = (m.data||'').split('|');
    const teamId = parts[0];
    const oldName = parts.slice(1).join('|');
    return `<div class="mbd" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <button class="mclose" onclick="closeModal()">${ICON.x}</button>
        <p class="mtitle mb-4">编辑团队名称</p>
        <label class="label">团队名称 *</label>
        <input id="m-team-edit-name" class="inp mb-4" value="${oldName}" />
        <button class="btn btn-brand w-full" onclick="submitEditTeamName('${teamId}')">保存</button>
      </div>
    </div>`;
  }
  if (m.type === 'addTeamTodo') {
    return `<div class="mbd" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <button class="mclose" onclick="closeModal()">${ICON.x}</button>
        <p class="mtitle mb-4">新建团队任务</p>
        <label class="label">标题 *</label>
        <input id="m-tt-title" class="inp mb-3" placeholder="任务标题" />
        <label class="label">经办人邮箱（选填）</label>
        <input id="m-tt-assignee" class="inp mb-3" placeholder="指定团队成员邮箱" />
        <div class="grid-2 mb-4">
          <div><label class="label">优先级</label>
            <select id="m-tt-prio" class="inp">
              <option value="high">紧急</option>
              <option value="medium" selected>中</option>
              <option value="low">低</option>
            </select></div>
          <div><label class="label">截止日期</label>
            <input id="m-tt-due" type="date" class="inp" /></div>
        </div>
        <button class="btn btn-brand w-full" onclick="submitAddTeamTodo('${m.data}')">创建</button>
      </div>
    </div>`;
  }
  return '';
}

// ============================================================
// ACTIONS
// ============================================================
function openModal(type, data) { S.modal = { type, data }; render(); }
function closeModal() { S.modal = null; render(); }

function switchTab(tab) { S.dashTab = tab; render(); window.scrollTo(0,0); }
function enterTeam(teamId) { S.currentTeamId = teamId; S.teamFilter = ''; S.dashTab = 'teamtodos'; render(); }
function setTeamFilter(email) { S.teamFilter = email; render(); }

async function quickAddTeamTodo(teamId) {
  const inp = document.getElementById('quick-add-inp');
  const title = inp?.value?.trim();
  if (!title) { inp?.focus(); return; }
  const priority = document.getElementById('quick-add-prio')?.value || 'medium';
  try {
    const res = await API.teams.createTeamTodo(teamId, { title, priority });
    const team = S.teams.find(t=>t._id===teamId);
    if (team) { team.todos = team.todos || []; team.todos.unshift(res.todo); }
    inp.value = '';
    render();
    setTimeout(() => document.getElementById('quick-add-inp')?.focus(), 50);
    toast('创建成功', 'success');
  } catch(e) { toast(e.message||'创建失败', 'error'); }
}

async function quickAddTodo() {
  const inp = document.getElementById('quick-add-inp');
  const title = inp?.value?.trim();
  if (!title) { inp?.focus(); return; }
  const priority = document.getElementById('quick-add-prio')?.value || 'medium';
  try {
    const res = await API.todos.create({ title, priority });
    S.todos.unshift(res.todo);
    inp.value = '';
    render();
    setTimeout(() => document.getElementById('quick-add-inp')?.focus(), 50);
    toast('创建成功', 'success');
  } catch(e) { toast(e.message||'创建失败', 'error'); }
}

async function cycleTeamTodoStatus(teamId, todoId, current) {
  const next = STATUS_NEXT[current] || 'todo';
  try {
    await API.teams.updateTeamTodo(teamId, todoId, { status: next });
    const team = S.teams.find(t=>t._id===teamId);
    if (team) {
      const todo = (team.todos||[]).find(t=>t._id===todoId);
      if (todo) todo.status = next;
    }
    render();
  } catch(e) { toast(e.message||'更新失败', 'error'); }
}

async function deleteTeamTodo(teamId, todoId) {
  if (!confirm('确认删除此任务？')) return;
  try {
    await API.teams.deleteTeamTodo(teamId, todoId);
    const team = S.teams.find(t=>t._id===teamId);
    if (team) team.todos = (team.todos||[]).filter(t=>t._id!==todoId);
    render();
    toast('已删除', 'success');
  } catch(e) { toast(e.message||'删除失败', 'error'); }
}

async function submitAddTeamTodo(teamId) {
  const title = document.getElementById('m-tt-title')?.value?.trim();
  if (!title) { toast('请输入标题', 'error'); return; }
  const assigneeEmail = document.getElementById('m-tt-assignee')?.value?.trim() || '';
  const priority = document.getElementById('m-tt-prio')?.value || 'medium';
  const dueDate = document.getElementById('m-tt-due')?.value || null;
  try {
    const res = await API.teams.createTeamTodo(teamId, { title, priority, dueDate, assigneeEmail });
    const team = S.teams.find(t=>t._id===teamId);
    if (team) { team.todos = team.todos || []; team.todos.unshift(res.todo); }
    closeModal();
    toast('创建成功', 'success');
  } catch(e) { toast(e.message||'创建失败', 'error'); }
}

async function cycleTodoStatus(id, current) {
  const next = STATUS_NEXT[current] || 'todo';
  try {
    await API.todos.update(id, { status: next });
    const t = S.todos.find(x=>x._id===id);
    if (t) t.status = next;
    render();
  } catch(e) { toast(e.message||'更新失败','error'); }
}

async function deleteTodo(id) {
  if (!confirm('确认删除此待办？')) return;
  try {
    await API.todos.delete(id);
    S.todos = S.todos.filter(t=>t._id!==id);
    render();
    toast('已删除','success');
  } catch(e) { toast(e.message||'删除失败','error'); }
}

async function submitAddTodo() {
  const title = document.getElementById('m-title')?.value?.trim();
  if (!title) { toast('请输入标题','error'); return; }
  const priority = document.getElementById('m-prio')?.value || 'medium';
  const description = document.getElementById('m-desc')?.value?.trim() || '';
  const dueDate = document.getElementById('m-due')?.value || null;
  try {
    const res = await API.todos.create({ title, description, priority, dueDate });
    S.todos.unshift(res.todo);
    closeModal();
    toast('创建成功','success');
  } catch(e) { toast(e.message||'创建失败','error'); }
}

async function submitCreateTeam() {
  const name = document.getElementById('m-team-name')?.value?.trim();
  if (!name) { toast('请输入团队名称','error'); return; }
  try {
    await API.teams.create(name);
    closeModal();
    toast('团队创建成功','success');
    await loadTeams(); render();
  } catch(e) { toast(e.message||'创建失败','error'); }
}

async function submitInviteMulti() {
  const email = document.getElementById('m-invite-email')?.value?.trim();
  if (!email) { toast('请输入邮箱', 'error'); return; }
  const checkboxes = document.querySelectorAll('.mbd input[type="checkbox"]:checked');
  const teamIds = [...checkboxes].map(c => c.value);
  if (teamIds.length === 0) { toast('请至少选择一个团队', 'error'); return; }
  let successCount = 0;
  let lastErr = '';
  for (const teamId of teamIds) {
    try {
      await API.teams.invite(teamId, email);
      successCount++;
    } catch(e) { lastErr = e.message || '邀请失败'; }
  }
  closeModal();
  if (successCount > 0) toast(`已成功邀请至 ${successCount} 个团队`, 'success');
  else toast(lastErr || '邀请失败', 'error');
  await loadTeams(); render();
}

async function submitEditTeamName(teamId) {
  const name = document.getElementById('m-team-edit-name')?.value?.trim();
  if (!name) { toast('请输入团队名称', 'error'); return; }
  try {
    await API.teams.rename(teamId, name);
    const team = S.teams.find(t => t._id === teamId);
    if (team) team.name = name;
    closeModal();
    toast('团队名称已更新', 'success');
    render();
  } catch(e) { toast(e.message || '更新失败', 'error'); }
}

async function submitInvite(teamId) {
  const email = document.getElementById('m-invite-email')?.value?.trim();
  if (!email) { toast('请输入邮箱','error'); return; }
  try {
    await API.teams.invite(teamId, email);
    closeModal();
    toast('邀请成功','success');
    await loadTeams(); render();
  } catch(e) { toast(e.message||'邀请失败','error'); }
}

async function dissolveTeam(teamId) {
  if (!confirm('确认解散团队？此操作不可恢复。')) return;
  try {
    await API.teams.dissolve(teamId);
    toast('团队已解散','success');
    await loadTeams(); render();
  } catch(e) { toast(e.message||'操作失败','error'); }
}

async function leaveTeam(teamId) {
  if (!confirm('确认退出此团队？')) return;
  try {
    await API.teams.leave(teamId);
    toast('已退出团队','success');
    await loadTeams(); render();
  } catch(e) { toast(e.message||'操作失败','error'); }
}

function doLogout() {
  API.auth.logout();
  S.user = null;
  S.todos = [];
  S.teams = [];
  navigate('home');
  toast('已退出登录','success');
}

// ============================================================
// MAIN RENDER
// ============================================================
function render() {
  const app = document.getElementById('app');
  if (!app) return;

  // Inject CSS
  const styleEl = document.getElementById('app-styles');
  if (styleEl && !styleEl.dataset.loaded) {
    fetch('css/app.css').then(r=>r.text()).then(css=>{ styleEl.textContent=css; styleEl.dataset.loaded='1'; }).catch(()=>{});
  }

  // Navbar
  const navHtml = `
  <nav class="navbar">
    <div class="nbi">
      <div class="logo" onclick="navigate(S.user?'dashboard':'home')" style="cursor:pointer">
        <div class="logo-icon">待</div>
        <span class="logo-text">待会<span style="color:var(--brand)">·</span>就办</span>
      </div>
      <div class="spacer"></div>
      ${S.user
        ? `<span class="text-sm text-muted desktop-only" style="margin-right:6px">${S.user.nickname||S.user.username}</span>
           <button class="btn btn-outline btn-sm" onclick="doLogout()">${ICON.logout} 退出</button>`
        : `<button class="nav-btn ${S.page==='home'?'active':''}" onclick="navigate('home')">首页</button>
           <button class="btn btn-brand btn-sm" onclick="navigate('login')">登录 / 注册</button>`
      }
    </div>
  </nav>`;

  let pageHtml = '';
  if (S.page === 'home') pageHtml = renderHome();
  else if (S.page === 'login') pageHtml = renderLogin();
  else if (S.page === 'dashboard') pageHtml = renderDashboard();

  app.innerHTML = navHtml + pageHtml;
}

// ============================================================
// BOOT
// ============================================================
(async () => {
  // Try to restore session
  const saved = API.storage.getUser();
  if (saved) S.user = saved;
  await checkAuth();
  if (S.user) {
    S.page = 'dashboard';
    render();
    await loadDashboard();
  } else {
    render();
  }
})();  