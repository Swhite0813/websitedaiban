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
    // Load todos for each team
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

// ---- Priority / Status labels ----
const PRIO_LABEL = { high: '紧急', medium: '中', low: '低' };
const PRIO_CLASS = { high: 'b-high', medium: 'b-medium', low: 'b-low' };
const STATUS_LABEL = { todo: '待办', doing: '进行中', done: '已完成' };
const STATUS_CLASS = { todo: 'b-todo', doing: 'b-doing', done: 'b-done' };
const STATUS_NEXT = { todo: 'doing', doing: 'done', done: 'todo' };

function badgePrio(p) {
  return `<span class="badge ${PRIO_CLASS[p] || 'b-low'}">${PRIO_LABEL[p] || p}</span>`;
}
function badgeStatus(s) {
  return `<span class="badge ${STATUS_CLASS[s] || 'b-todo'}">${STATUS_LABEL[s] || s}</span>`;
}
function avBg(role) {
  return role === 'owner'
    ? 'background:linear-gradient(135deg,#3D5AFE,#7C3AED);color:#fff'
    : 'background:var(--s2);color:var(--t2);border:1px solid var(--border)';
}
function phoneMask(p) {
  return p ? p.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3') : '';
}
function nameAv(name) {
  return (name || '?').slice(-2, -1) || (name || '?')[0] || '?';
}

// ---- SVG icons ----
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
          <button class="btn btn-outline" onclick="navigate('features')">了解功能 →</button>
        </div>
      </div>
    </section>

    <section style="padding:40px 20px;background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
      <div class="ctr">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center;max-width:600px;margin:0 auto">
          ${[['8万+','活跃用户'],['99%','任务完成率'],['5x','协作效率提升']].map(([v,l],i)=>`
          <div class="fu d${i+1}">
            <div class="snum" style="color:var(--brand)">${v}</div>
            <div class="text-sm text-muted mt-1">${l}</div>
          </div>`).join('')}
        </div>
      </div>
    </section>

    <section style="padding:70px 20px">
      <div class="ctr">
        <div class="text-center mb-6">
          <div class="badge b-low" style="display:inline-flex;margin-bottom:12px">核心功能</div>
          <h2 style="font-size:clamp(1.8rem,4vw,2.8rem);margin-bottom:10px">简单，才是最大效率</h2>
          <p class="text-muted">三个核心模块，解决效率管理最本质的问题。</p>
        </div>
        <div class="fgrid">
          ${[
            ['个人待办','随手记录，设置优先级，三态流转。清单越做越短，效率越来越高。','M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
            ['团队协同','创建团队，邀请成员，分配任务。每个人知道自己该做什么，不再靠催。','M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75'],
            ['进度追踪','实时查看每位成员的任务状态，项目进展一目了然，不用开会也知道全局。','M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z']
          ].map(([title,desc,path],i)=>`
          <div class="card card-h p-6 fu d${i+1}">
            <div class="ficon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round">
                <path d="${path}"/>
              </svg>
            </div>
            <h3 style="font-size:17px;margin-bottom:8px">${title}</h3>
            <p class="text-sm text-muted" style="line-height:1.7">${desc}</p>
          </div>`)}
        </div>
      </div>
    </section>

    <section style="padding:60px 20px;background:var(--surface);border-top:1px solid var(--border)">
      <div class="ctr">
        <div class="card-brand p-6" style="max-width:560px;margin:0 auto;text-align:center">
          <h2 style="font-size:clamp(1.6rem,4vw,2.4rem);margin-bottom:12px">别再拖了</h2>
          <p class="text-muted mb-4">注册只需 30 秒，把那份拖了一周的事今天做完吧。</p>
          <button class="btn btn-brand" onclick="navigate('login')">马上开始，不拖了</button>
          <p class="text-xs text-muted mt-3">永久免费 · 无需信用卡</p>
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
let loginState = { step: 'form', email: '', countdown: 0, codeSent: false, error: '', otpError: '', devCode: '' };
let countdownTimer = null;

function _refreshSendBtn() {
  const btn = document.getElementById('send-btn');
  if (!btn) return;
  const email = document.getElementById('email-inp')?.value?.trim() || '';
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (loginState.countdown > 0) { btn.disabled = true; btn.textContent = loginState.countdown + 's'; }
  else { btn.disabled = !valid; btn.textContent = loginState.codeSent ? '重新发送' : '获取验证码'; }
}

function startCountdown() {
  loginState.countdown = 60; loginState.codeSent = true;
  clearInterval(countdownTimer); _refreshSendBtn();
  countdownTimer = setInterval(() => { loginState.countdown--; _refreshSendBtn(); if (loginState.countdown <= 0) clearInterval(countdownTimer); }, 1000);
}

async function sendCode() {
  const email = document.getElementById('email-inp')?.value?.trim() || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  loginState.email = email; loginState.error = '';
  const errEl = document.getElementById('email-err');
  if (errEl) errEl.textContent = '';
  const btn = document.getElementById('send-btn');
  btn.disabled = true; btn.textContent = '发送中…';
  try {
    const res = await API.auth.sendCode(email);
    loginState.devCode = res.code || '';
    if (loginState.devCode) { const d = document.getElementById('dev-code-hint'); if (d) { d.textContent = '演示验证码：' + loginState.devCode; d.style.display = 'block'; } }
    startCountdown();
    document.getElementById('code-inp')?.focus();
  } catch(e) {
    loginState.error = e.message || '发送失败，请稍后重试';
    if (errEl) errEl.textContent = loginState.error;
    _refreshSendBtn();
  }
}

async function verifyOtp() {
  const code = document.getElementById('code-inp')?.value?.trim() || '';
  const email = document.getElementById('email-inp')?.value?.trim() || loginState.email;
  const errEl = document.getElementById('otp-err');
  if (!loginState.codeSent) { if (errEl) errEl.textContent = '请先获取验证码'; return; }
  if (code.length < 4) { if (errEl) errEl.textContent = '请输入验证码'; return; }
  if (errEl) errEl.textContent = '';
  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = '登录中…';
  try {
    const res = await API.auth.login(email, code);
    S.user = res.user; loginState.step = 'success'; render();
    await loadDashboard(); setTimeout(() => navigate('dashboard'), 1500);
  } catch(e) {
    if (errEl) errEl.textContent = e.message || '验证码错误或已过期';
    btn.disabled = false; btn.textContent = '登录';
  }
}

function otpKeydown(e, i) {
  const boxes = Array.from({length:6},(_,k)=>document.getElementById(`otp-${k}`));
  if (e.key === 'Backspace') {
    if (boxes[i].value) { boxes[i].value = ''; boxes[i].classList.remove('filled'); }
    else if (i > 0) { boxes[i-1].focus(); boxes[i-1].value=''; boxes[i-1].classList.remove('filled'); }
  } else if (e.key === 'ArrowLeft' && i > 0) boxes[i-1].focus();
  else if (e.key === 'ArrowRight' && i < 5) boxes[i+1].focus();
  else if (e.key === 'Enter') verifyOtp();
}

function otpInput(e, i) {
  const val = e.target.value.replace(/\D/g,'').slice(-1);
  e.target.value = val;
  if (val) {
    e.target.classList.add('filled');
    if (i < 5) document.getElementById(`otp-${i+1}`)?.focus();
  } else e.target.classList.remove('filled');
  const code = Array.from({length:6},(_,k)=>document.getElementById(`otp-${k}`)?.value||'').join('');
  if (code.length === 6) verifyOtp();
}

function otpPaste(e) {
  e.preventDefault();
  const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
  text.split('').forEach((c,i) => {
    const box = document.getElementById(`otp-${i}`);
    if (box) { box.value=c; box.classList.add('filled'); }
  });
  document.getElementById(`otp-${Math.min(text.length,5)}`)?.focus();
  if (text.length === 6) verifyOtp();
}

function renderLogin() {
  const { step, phone, devCode } = loginState;
  return `
  <div class="page" style="background:linear-gradient(135deg,#EEF1FF 0%,#F5F3FF 50%,#EFFFFA 100%);display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px">
    <div style="width:100%;max-width:420px">
      <div class="text-center mb-6">
        <div class="logo" style="justify-content:center;margin-bottom:4px">
          <div class="logo-icon">待</div>
          <span class="logo-text">待会<span style="color:var(--brand)">·</span>就办</span>
        </div>
      </div>
      <div class="card-brand p-6">
        ${step !== 'success' ? renderLoginPhone() : renderLoginSuccess()}
      </div>
      ${step !== 'success' ? `<p class="text-center text-sm text-muted mt-4"><button class="nav-btn" onclick="navigate('home')">← 返回首页</button></p>` : ''}
    </div>
  </div>`;
}

function renderLoginPhone() {
  return `
    <h2 style="font-family:'Noto Serif SC',serif;font-size:22px;font-weight:700;margin-bottom:4px">登录 / 注册</h2>
    <p class="text-sm text-muted mb-5">邮箱验证，30 秒搞定</p>
    <label class="label">邮箱地址</label>
    <input id="email-inp" type="email" placeholder="请输入您的邮箱地址" class="inp mb-1" oninput="_refreshSendBtn()" onkeydown="if(event.key==='Enter')sendCode()" />
    <p id="email-err" class="text-xs mb-4" style="color:var(--red);min-height:16px"></p>
    <label class="label">验证码</label>
    <div class="flex gap-2 mb-1">
      <input id="code-inp" type="text" inputmode="numeric" maxlength="6" placeholder="输入验证码" class="inp flex-1" onkeydown="if(event.key==='Enter')verifyOtp()" />
      <button id="send-btn" class="btn btn-outline shrink-0" style="min-width:96px" onclick="sendCode()" disabled>获取验证码</button>
    </div>
    <p id="dev-code-hint" class="text-xs mb-1" style="color:var(--brand);display:none"></p>
    <p id="otp-err" class="text-xs mb-4" style="color:var(--red);min-height:16px"></p>
    <button id="login-btn" class="btn btn-brand w-full" onclick="verifyOtp()">登录</button>
    <p class="text-xs text-center mt-4 text-muted">登录即同意 <a href="#" style="color:var(--brand)">服务条款</a> 和 <a href="#" style="color:var(--brand)">隐私政策</a></p>
  `;
}

function renderLoginOtp(email, devCode) {
  return `
    <button class="flex items-center gap-2 text-sm text-muted mb-4" style="cursor:pointer" onclick="loginState.step='email';render()">← 返回</button>
    <h2 style="font-family:'Noto Serif SC',serif;font-size:22px;font-weight:700;margin-bottom:6px">输入验证码</h2>
    <p class="text-sm text-muted mb-4">已发送至 <strong>${email}</strong></p>
    ${devCode ? `<div class="flex items-center gap-2 p-4 rounded mb-4" style="background:var(--bl);border:1px solid var(--bb);font-size:13px"><span style="color:var(--brand)">💡 演示验证码：<strong>${devCode}</strong></span></div>` : ''}
    <label class="label">6 位验证码</label>
    <div class="otp-wrap mb-2" onpaste="otpPaste(event)">
      ${Array.from({length:6},(_,i)=>`<input id="otp-${i}" class="otp-box" type="text" inputmode="numeric" maxlength="1" oninput="otpInput(event,${i})" onkeydown="otpKeydown(event,${i})" />`).join('')}
    </div>
    <p id="otp-err" class="text-xs mb-3" style="color:var(--red);min-height:18px"></p>
    <button id="otp-btn" class="btn btn-brand w-full mt-2" onclick="verifyOtp()">确认登录</button>
    <p class="text-center text-sm mt-3 text-muted" id="cd-txt"><button class="nav-btn" onclick="startCountdown()">重新发送</button></p>
  `;
}

function renderLoginSuccess() {
  return `
    <div class="text-center" style="padding:20px 0">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--gl);border:2px solid #a8f0d5;display:flex;align-items:center;justify-content:center;margin:0 auto 18px">
        <svg width="32" height="32" viewBox="0 0 50 50" fill="none"><polyline class="chk-path" points="12,25 22,35 38,15" stroke="var(--green)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <h2 style="font-family:'Noto Serif SC',serif;font-size:22px;margin-bottom:8px">登录成功！</h2>
      <p class="text-muted text-sm">正在进入工作台…</p>
      <div style="height:4px;background:var(--s2);border-radius:2px;margin-top:20px;overflow:hidden">
        <div style="height:100%;background:var(--brand);border-radius:2px;animation:progressFill 1.4s ease forwards"></div>
      </div>
    </div>`;
}

// ============================================================
// DASHBOARD — TODOS TAB
// ============================================================
async function toggleTodo(id, currentStatus) {
  const next = STATUS_NEXT[currentStatus] || 'todo';
  try {
    await API.todos.update(id, { status: next });
    const t = S.todos.find(x => x._id === id);
    if (t) t.status = next;
    renderDashContent();
  } catch(e) { toast(e.message || '操作失败', 'error'); }
}

async function deleteTodo(id) {
  try {
    await API.todos.delete(id);
    S.todos = S.todos.filter(x => x._id !== id);
    renderDashContent();
    toast('已删除', 'success');
  } catch(e) { toast(e.message || '删除失败', 'error'); }
}

async function addTodo(e) {
  e.preventDefault();
  const titleEl = document.getElementById('new-todo-title');
  const prioEl = document.getElementById('new-todo-prio');
  const title = titleEl?.value?.trim();
  if (!title) return;
  const btn = document.getElementById('new-todo-btn');
  btn.disabled = true;
  btn.innerHTML = ICON.spin + '添加中…';
  try {
    const res = await API.todos.create({ title, priority: prioEl?.value || 'medium' });
    S.todos.unshift(res.todo);
    titleEl.value = '';
    renderDashContent();
    toast('已添加', 'success');
  } catch(e) { toast(e.message || '添加失败', 'error'); }
  btn.disabled = false;
  btn.innerHTML = '添加';
}

function renderTodosTab() {
  const filter = window._todoFilter || 'all';
  const myTodos = S.todos;
  const filtered = filter === 'all' ? myTodos : myTodos.filter(t => t.status === filter);
  const counts = {
    all: myTodos.length,
    todo: myTodos.filter(t=>t.status==='todo').length,
    doing: myTodos.filter(t=>t.status==='doing').length,
    done: myTodos.filter(t=>t.status==='done').length,
  };
  return `
  <div>
    <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
      <div>
        <h2 style="font-size:20px;font-weight:700">我的待办</h2>
        <p class="text-sm text-muted mt-1">共 ${counts.all} 项 · ${counts.done} 项已完成</p>
      </div>
    </div>
    <form class="card p-4 mb-4 sd" onsubmit="addTodo(event)" style="display:flex;gap:10px;flex-wrap:wrap">
      <input id="new-todo-title" class="inp flex-1" style="min-width:180px" placeholder="添加新待办…" required />
      <select id="new-todo-prio" class="inp" style="width:90px">
        <option value="high">紧急</option>
        <option value="medium" selected>中</option>
        <option value="low">低</option>
      </select>
      <button id="new-todo-btn" class="btn btn-brand btn-sm" type="submit">${ICON.plus} 添加</button>
    </form>
    <div class="flex gap-2 mb-4 flex-wrap">
      ${[['all','全部'],['todo','待办'],['doing','进行中'],['done','已完成']].map(([k,l])=>
        `<button class="btn btn-xs ${filter===k?'btn-ghost':'btn-surface'}" onclick="window._todoFilter='${k}';renderDashContent()">${l} (${counts[k]})</button>`
      ).join('')}
    </div>
    <div class="space-y-2">
      ${filtered.length === 0 ? `<div class="card p-6 text-center text-muted text-sm">暂无待办</div>` :
        filtered.map(t => `
        <div class="trow ${t.status==='done'?'done':''}">
          <button class="chk ${t.status==='done'?'checked':t.status==='doing'?'doing':''}" onclick="toggleTodo('${t._id}','${t.status}')">
            ${t.status==='done' ? ICON.check : t.status==='doing' ? `<div style="width:8px;height:8px;border-radius:2px;background:var(--amber)"></div>` : ''}
          </button>
          <span class="flex-1 min-w-0 truncate text-sm" style="font-weight:500;${t.status==='done'?'text-decoration:line-through':''}"
          >${t.title}</span>
          <div class="flex items-center gap-2 shrink-0">
            ${badgePrio(t.priority)}
            ${badgeStatus(t.status)}
            <button class="btn btn-xs btn-surface" title="切换状态" onclick="toggleTodo('${t._id}','${t.status}')">${ICON.rotate}</button>
            <button class="btn btn-xs btn-danger" title="删除" onclick="deleteTodo('${t._id}')">${ICON.trash}</button>
          </div>
        </div>`).join('')
      }
    </div>
  </div>`;
}

// ============================================================
// DASHBOARD — TEAM TAB
// ============================================================
function myTeam() {
  return S.teams.find(t => t.members?.some(m => m.userId === S.user?.id || m.userId === S.user?._id));
}
function myRole(team) {
  const uid = S.user?.id || S.user?._id;
  return team?.members?.find(m => m.userId === uid || m.userId?.toString() === uid?.toString())?.role;
}

async function createTeam(e) {
  e.preventDefault();
  const nameEl = document.getElementById('team-name-inp');
  const name = nameEl?.value?.trim();
  if (!name) return;
  const btn = document.getElementById('create-team-btn');
  btn.disabled = true; btn.innerHTML = ICON.spin + '创建中…';
  try {
    const res = await API.teams.create(name);
    S.teams.push({ ...res.team, todos: [] });
    toast('团队创建成功', 'success');
    window._teamView = 'main';
    renderDashContent();
  } catch(e) { toast(e.message || '创建失败', 'error'); }
  btn.disabled = false; btn.innerHTML = '确认创建';
}

async function inviteMember() {
  const inp = document.getElementById('invite-phone');
  const phone = inp?.value?.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(phone)) { toast('请输入正确的邮箱地址', 'error'); return; }
  const team = myTeam();
  if (!team) return;
  const btn = document.getElementById('invite-btn');
  btn.disabled = true; btn.innerHTML = ICON.spin + '邀请中…';
  const statusEl = document.getElementById('invite-status');
  try {
    // Check phone registered first
    const check = await API.teams.checkPhone(phone);
    if (!check.exists) {
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--red)">该邮箱尚未注册，请对方先注册后再邀请</span>`;
      btn.disabled = false; btn.innerHTML = '邀请';
      return;
    }
    await API.teams.invite(team._id, phone);
    // Reload team data
    const res = await API.teams.getAll();
    const updated = res.teams?.find(t => t._id === team._id);
    if (updated) {
      const idx = S.teams.findIndex(t => t._id === team._id);
      if (idx >= 0) S.teams[idx] = { ...updated, todos: S.teams[idx].todos || [] };
    }
    inp.value = '';
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)">✓ 邀请成功！</span>`;
    setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
    renderDashContent();
    toast('邀请成功', 'success');
  } catch(err) {
    const msg = err.message || '邀请失败';
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--red)">${msg}</span>`;
    toast(msg, 'error');
  }
  btn.disabled = false; btn.innerHTML = '邀请';
}

async function removeMember(phone) {
  const team = myTeam();
  if (!team) return;
  if (!confirm(`确认移除该成员？`)) return;
  try {
    await API.teams.removeMember(team._id, phone);
    const idx = S.teams.findIndex(t => t._id === team._id);
    if (idx >= 0) S.teams[idx].members = S.teams[idx].members.filter(m => m.phone !== phone);
    renderDashContent();
    toast('已移除', 'success');
  } catch(e) { toast(e.message || '操作失败', 'error'); }
}

function renderTeamTab() {
  const team = myTeam();
  const view = window._teamView || 'main';
  if (!team && view !== 'create') {
    return `
    <div>
      <h2 style="font-size:20px;font-weight:700;margin-bottom:6px">我的团队</h2>
      <p class="text-sm text-muted mb-6">你还没有加入任何团队</p>
      <div class="card p-6 text-center" style="max-width:360px">
        <div class="ficon" style="margin:0 auto 14px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        <h3 style="font-size:16px;font-weight:700;margin-bottom:8px">创建第一个团队</h3>
        <p class="text-sm text-muted mb-4">邀请成员，分配任务，共同完成目标。</p>
        <button class="btn btn-brand w-full" onclick="window._teamView='create';renderDashContent()">${ICON.plus} 创建团队</button>
      </div>
    </div>`;
  }
  if (view === 'create') {
    return `
    <div>
      <button class="flex items-center gap-2 text-sm text-muted mb-4" style="cursor:pointer" onclick="window._teamView='main';renderDashContent()">${ICON.back} 返回</button>
      <h2 style="font-size:20px;font-weight:700;margin-bottom:6px">创建团队</h2>
      <form class="card p-5" style="max-width:400px" onsubmit="createTeam(event)">
        <label class="label">团队名称</label>
        <input id="team-name-inp" class="inp mb-4" placeholder="例如：产品设计组、运营团队…" required autofocus />
        <div class="flex gap-2">
          <button id="create-team-btn" class="btn btn-brand flex-1" type="submit">确认创建</button>
          <button class="btn btn-surface" type="button" onclick="window._teamView='main';renderDashContent()">取消</button>
        </div>
      </form>
    </div>`;
  }
  const isOwner = myRole(team) === 'owner';
  return `
  <div>
    <div class="flex justify-between items-center mb-5 flex-wrap gap-2">
      <div>
        <h2 style="font-size:20px;font-weight:700">${team.name}</h2>
        <p class="text-sm text-muted mt-1">${team.members?.length || 0} 名成员</p>
      </div>
      <span class="badge b-done">团队活跃中</span>
    </div>
    <div class="card p-5 mb-4">
      <h3 class="font-semibold text-sm mb-3">成员列表</h3>
      <div class="space-y-3">
        ${(team.members||[]).map(m => `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="av" style="${avBg(m.role)}">${nameAv(m.nickname)}</div>
            <div>
              <p class="font-medium text-sm">${m.nickname || '用户'}</p>
              <p class="text-xs text-muted">${phoneMask(m.phone)}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge ${m.role==='owner'?'b-owner':'b-member'}">${m.role==='owner'?'管理员':'成员'}</span>
            ${isOwner && m.role !== 'owner' ? `<button class="btn btn-xs btn-danger" onclick="removeMember('${m.email}')">${ICON.x}</button>` : ''}
          </div>
        </div>`).join('')}
      </div>
    </div>
    ${isOwner ? `
    <div class="card p-5">
      <h3 class="font-semibold text-sm mb-3">邀请新成员</h3>
      <p class="text-xs text-muted mb-3">仅可邀请已注册的用户（系统会自动校验）</p>
      <div class="flex gap-2 flex-wrap">
        <input id="invite-phone" class="inp flex-1" style="min-width:160px" placeholder="输入对方邮箱地址" onkeydown="if(event.key==='Enter')inviteMember()" />
        <button id="invite-btn" class="btn btn-brand btn-sm shrink-0" onclick="inviteMember()">邀请</button>
      </div>
      <p id="invite-status" class="text-xs mt-2" style="min-height:18px"></p>
    </div>` : ''}
  </div>`;
}

// ============================================================
// DASHBOARD — MEMBERS TAB
// ============================================================
async function addTeamTodo(e, phone) {
  e.preventDefault();
  const titleEl = document.getElementById(`ttodo-${phone}`);
  const prioEl = document.getElementById(`tprio-${phone}`);
  const title = titleEl?.value?.trim();
  if (!title) return;
  const team = myTeam();
  if (!team) return;
  const btn = document.getElementById(`ttodo-btn-${phone}`);
  if (btn) { btn.disabled=true; btn.innerHTML=ICON.spin+'…'; }
  try {
    const res = await API.teams.createTeamTodo(team._id, { title, priority: prioEl?.value||'medium', assigneePhone: phone });
    const idx = S.teams.findIndex(t=>t._id===team._id);
    if (idx>=0) S.teams[idx].todos = [res.todo, ...(S.teams[idx].todos||[])];
    titleEl.value = '';
    renderDashContent();
    toast('任务已分配', 'success');
  } catch(e) { toast(e.message || '分配失败', 'error'); }
  if (btn) { btn.disabled=false; btn.innerHTML=ICON.plus+'分配'; }
}

async function toggleTeamTodo(teamId, todoId, currentStatus) {
  const next = STATUS_NEXT[currentStatus] || 'todo';
  try {
    await API.teams.updateTeamTodo(teamId, todoId, { status: next });
    const idx = S.teams.findIndex(t=>t._id===teamId);
    if (idx>=0) {
      const t = S.teams[idx].todos?.find(x=>x._id===todoId);
      if (t) t.status = next;
    }
    renderDashContent();
  } catch(e) { toast(e.message || '操作失败', 'error'); }
}

async function deleteTeamTodo(teamId, todoId) {
  try {
    await API.teams.deleteTeamTodo(teamId, todoId);
    const idx = S.teams.findIndex(t=>t._id===teamId);
    if (idx>=0) S.teams[idx].todos = (S.teams[idx].todos||[]).filter(x=>x._id!==todoId);
    renderDashContent();
    toast('已删除', 'success');
  } catch(e) { toast(e.message || '删除失败', 'error'); }
}

function renderMembersTab() {
  const team = myTeam();
  if (!team) {
    return `<div class="card p-6 text-center text-muted text-sm">请先加入或创建团队</div>`;
  }
  const isOwner = myRole(team) === 'owner';
  const members = team.members || [];
  const teamTodos = team.todos || [];

  return `
  <div>
    <div class="flex justify-between items-center mb-5 flex-wrap gap-2">
      <div>
        <h2 style="font-size:20px;font-weight:700">成员任务</h2>
        <p class="text-sm text-muted mt-1">${team.name} · ${members.length} 名成员</p>
      </div>
    </div>
    <div class="space-y-4">
      ${members.map(m => {
        const memberTodos = teamTodos.filter(t => t.assigneePhone === m.phone || t.assignee === m.userId);
        const safePhone = m.phone || m.userId || Math.random().toString(36).slice(2);
        return `
        <div class="card p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="av" style="${avBg(m.role)}">${nameAv(m.nickname)}</div>
              <div>
                <p class="font-medium text-sm">${m.nickname || '用户'}</p>
                <p class="text-xs text-muted">${phoneMask(m.phone)} · ${m.role==='owner'?'管理员':'成员'}</p>
              </div>
            </div>
            <span class="badge b-todo">${memberTodos.length} 项任务</span>
          </div>
          ${isOwner ? `
          <form onsubmit="addTeamTodo(event,'${m.phone}')" class="flex gap-2 mb-3 flex-wrap">
            <input id="ttodo-${m.phone}" class="inp flex-1" style="min-width:140px;font-size:13px" placeholder="分配新任务…" required />
            <select id="tprio-${m.phone}" class="inp" style="width:80px;font-size:13px">
              <option value="high">紧急</option>
              <option value="medium" selected>中</option>
              <option value="low">低</option>
            </select>
            <button id="ttodo-btn-${m.phone}" class="btn btn-brand btn-sm shrink-0" type="submit">${ICON.plus}分配</button>
          </form>` : ''}
          <div class="space-y-2">
            ${memberTodos.length === 0 ? `<p class="text-xs text-muted">暂无分配任务</p>` :
              memberTodos.map(t => `
              <div class="trow ${t.status==='done'?'done':''}">
                <button class="chk ${t.status==='done'?'checked':t.status==='doing'?'doing':''}" onclick="toggleTeamTodo('${team._id}','${t._id}','${t.status}')">
                  ${t.status==='done' ? ICON.check : t.status==='doing' ? `<div style="width:8px;height:8px;border-radius:2px;background:var(--amber)"></div>` : ''}
                </button>
                <span class="flex-1 min-w-0 truncate text-sm" style="${t.status==='done'?'text-decoration:line-through':''}">${t.title}</span>
                <div class="flex items-center gap-2 shrink-0">
                  ${badgePrio(t.priority)}
                  ${badgeStatus(t.status)}
                  <button class="btn btn-xs btn-surface" onclick="toggleTeamTodo('${team._id}','${t._id}','${t.status}')">${ICON.rotate}</button>
                  ${isOwner ? `<button class="btn btn-xs btn-danger" onclick="deleteTeamTodo('${team._id}','${t._id}')">${ICON.trash}</button>` : ''}
                </div>
              </div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ============================================================
// DASHBOARD SHELL
// ============================================================
function renderDashContent() {
  const el = document.getElementById('dash-content');
  if (!el) return;
  if (S.dashTab === 'todos') el.innerHTML = renderTodosTab();
  else if (S.dashTab === 'team') el.innerHTML = renderTeamTab();
  else if (S.dashTab === 'members') el.innerHTML = renderMembersTab();
}

function renderDashboard() {
  const u = S.user;
  const tabs = [
    { id:'todos', label:'我的待办', icon: ICON.todo },
    { id:'team',  label:'我的团队', icon: ICON.team },
    { id:'members', label:'成员任务', icon: ICON.grid }];
  return `
  <div class="page">
    <nav class="topnav">
      <div class="ctr flex justify-between items-center" style="height:56px">
        <div class="logo">
          <div class="logo-icon" style="width:30px;height:30px;font-size:13px">待</div>
          <span class="logo-text">待会<span style="color:var(--brand)">·</span>就办</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="av av-sm" style="${avBg('member')}">${nameAv(u?.nickname||u?.name||'?')}</div>
            <span class="text-sm font-medium hidden-xs">${u?.nickname||u?.name||'用户'}</span>
          </div>
          <button class="btn btn-xs btn-surface" onclick="handleLogout()" title="退出登录">${ICON.logout}</button>
        </div>
      </div>
    </nav>
    <div class="dash-wrap">
      <aside class="dash-side">
        <nav class="side-nav">
          ${tabs.map(t=>`
          <button class="side-btn ${S.dashTab===t.id?'active':''}" onclick="S.dashTab='${t.id}';renderDashContent();updateSideNav()">
            ${t.icon}<span>${t.label}</span>
          </button>`).join('')}
        </nav>
      </aside>
      <main class="dash-main">
        ${S.loading ? `<div class="flex items-center justify-center" style="height:200px;color:var(--t2)">${ICON.spin} <span class="ml-2">加载中…</span></div>` : ''}
        <div id="dash-content"></div>
      </main>
    </div>
  </div>`;
}

function updateSideNav() {
  document.querySelectorAll('.side-btn').forEach((btn, i) => {
    const tabs = ['todos','team','members'];
    btn.classList.toggle('active', S.dashTab === tabs[i]);
  });
}

function handleLogout() {
  API.auth.logout();
  S.user = null;
  S.todos = [];
  S.teams = [];
  S.page = 'home';
  render();
}

// ============================================================
// MAIN RENDER
// ============================================================
function render() {
  injectStyles();
  const app = document.getElementById('app');
  if (!app) return;
  if (S.page === 'home') {
    app.innerHTML = renderHome();
  } else if (S.page === 'login') {
    app.innerHTML = renderLogin();
  } else if (S.page === 'dashboard') {
    app.innerHTML = renderDashboard();
    if (!S.loading) renderDashContent();
  }
  // Fix toast container id
  const tc = document.getElementById('toast-c');
  if (tc) tc.id = 'toastc';
}

// ============================================================
// CSS
// ============================================================
function injectStyles() {
  const el = document.getElementById('app-styles');
  if (!el || el.dataset.injected) return;
  el.dataset.injected = '1';
  el.textContent = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --brand:#3D5AFE;--brand-d:#2a3fb5;--brand-l:#EEF1FF;
  --bg:#F8F9FC;--surface:#fff;--s2:#F3F4F8;
  --t1:#0F1117;--t2:#6B7280;--border:#E5E7EB;
  --green:#10B981;--gl:#ECFDF5;--gb:#a8f0d5;
  --red:#EF4444;--rl:#FEF2F2;
  --amber:#F59E0B;--al:#FFFBEB;
  --blue:#3B82F6;--bl:#EFF6FF;--bb:#BFDBFE;
}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--t1);min-height:100vh;line-height:1.5}
.page{min-height:100vh}
.ctr{max-width:1100px;margin:0 auto;padding:0 20px}
.flex{display:flex}.items-center{align-items:center}.justify-between{justify-content:space-between}
.justify-center{justify-content:center}.flex-wrap{flex-wrap:wrap}.flex-1{flex:1}.shrink-0{flex-shrink:0}
.gap-2{gap:8px}.gap-3{gap:12px}.gap-4{gap:16px}.min-w-0{min-width:0}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.grid{display:grid}.space-y-2>*+*{margin-top:8px}.space-y-3>*+*{margin-top:12px}.space-y-4>*+*{margin-top:16px}
.text-center{text-align:center}.text-sm{font-size:13px}.text-xs{font-size:12px}.text-muted{color:var(--t2)}
.font-medium{font-weight:500}.font-semibold{font-weight:600}.mt-1{margin-top:4px}.mt-2{margin-top:8px}
.mt-3{margin-top:12px}.mt-4{margin-top:16px}.mb-3{margin-bottom:12px}.mb-4{margin-bottom:16px}
.mb-5{margin-bottom:20px}.mb-6{margin-bottom:24px}.ml-2{margin-left:8px}.p-4{padding:16px}.p-5{padding:20px}
.p-6{padding:24px}.hidden-xs{display:inline}
.w-full{width:100%}
/* Hero */
.hero{padding:90px 20px 70px;text-align:center;background:linear-gradient(160deg,#EEF1FF 0%,#F5F3FF 50%,#EFFFFA 100%)}
.d1{font-family:'Noto Serif SC',serif;font-size:clamp(2.4rem,6vw,4rem);font-weight:900;line-height:1.15;margin-bottom:18px}
.d2{font-size:clamp(1rem,2.5vw,1.2rem);color:var(--t2);max-width:520px;margin:0 auto 28px;line-height:1.7}
.d3{}
.snum{font-family:'Noto Serif SC',serif;font-size:clamp(1.8rem,4vw,2.6rem);font-weight:900}
/* Animations */
.fu{opacity:0;transform:translateY(18px);animation:fadeUp .55s ease forwards}
.d1{animation-delay:.05s}.d2{animation-delay:.15s}.d3{animation-delay:.25s}
@keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
@keyframes progressFill{from{width:0}to{width:100%}}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{animation:spin .8s linear infinite;display:inline-block}
/* Cards */
.card{background:var(--surface);border:1px solid var(--border);border-radius:14px}
.card-h{transition:box-shadow .2s,transform .2s}.card-h:hover{box-shadow:0 8px 32px rgba(61,90,254,.10);transform:translateY(-2px)}
.card-brand{background:var(--surface);border:1.5px solid #c7d2fe;border-radius:16px;box-shadow:0 4px 24px rgba(61,90,254,.08)}
.sd{box-shadow:0 2px 12px rgba(0,0,0,.05)}
.fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-top:20px}
.ficon{width:44px;height:44px;border-radius:12px;background:var(--brand-l);display:flex;align-items:center;justify-content:center;margin-bottom:14px}
/* Badges */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
.b-high{background:#FEE2E2;color:#DC2626}.b-medium{background:#FEF3C7;color:#D97706}.b-low{background:#DBEAFE;color:#2563EB}
.b-todo{background:#F3F4F8;color:#6B7280}.b-doing{background:#FEF3C7;color:#D97706}.b-done{background:#D1FAE5;color:#059669}
.b-owner{background:var(--brand-l);color:var(--brand)}.b-member{background:var(--s2);color:var(--t2)}
/* Buttons */
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:background .15s,transform .1s;white-space:nowrap}
.btn:active{transform:scale(.97)}
.btn-brand{background:var(--brand);color:#fff}.btn-brand:hover{background:var(--brand-d)}
.btn-outline{background:transparent;color:var(--brand);border:1.5px solid var(--brand)}.btn-outline:hover{background:var(--brand-l)}
.btn-surface{background:var(--s2);color:var(--t1);border:1px solid var(--border)}.btn-surface:hover{background:var(--border)}
.btn-ghost{background:var(--brand-l);color:var(--brand)}
.btn-danger{background:var(--rl);color:var(--red);border:1px solid #fecaca}.btn-danger:hover{background:#fecaca}
.btn-sm{padding:6px 12px;font-size:12px;border-radius:6px}
.btn-xs{padding:4px 8px;font-size:11px;border-radius:5px;gap:4px}
.btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
.nav-btn{background:none;border:none;cursor:pointer;color:var(--t2);font-size:13px;font-family:inherit}
.nav-btn:hover{color:var(--t1)}
/* Inputs */
.inp{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;background:var(--surface);color:var(--t1);outline:none;transition:border .15s}
.inp:focus{border-color:var(--brand)}
.label{display:block;font-size:12px;font-weight:600;color:var(--t2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}
/* OTP */
.otp-wrap{display:flex;gap:8px;justify-content:center}
.otp-box{width:44px;height:52px;text-align:center;font-size:20px;font-weight:700;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--t1);outline:none;transition:border .15s}
.otp-box:focus{border-color:var(--brand)}
.otp-box.filled{border-color:var(--brand);background:var(--brand-l)}
/* Topnav */
.topnav{background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100}
.logo{display:flex;align-items:center;gap:8px}
.logo-icon{width:34px;height:34px;border-radius:9px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Noto Serif SC',serif;font-weight:900;font-size:15px}
.logo-text{font-family:'Noto Serif SC',serif;font-size:17px;font-weight:700;color:var(--t1)}
/* Dashboard layout */
.dash-wrap{display:flex;max-width:1100px;margin:0 auto;padding:24px 20px;gap:24px;align-items:flex-start}
.dash-side{width:200px;flex-shrink:0;position:sticky;top:80px}
.dash-main{flex:1;min-width:0}
.side-nav{display:flex;flex-direction:column;gap:4px}
.side-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;font-size:13px;font-weight:500;color:var(--t2);background:none;border:none;cursor:pointer;width:100%;text-align:left;transition:background .15s,color .15s}
.side-btn:hover{background:var(--s2);color:var(--t1)}
.side-btn.active{background:var(--brand-l);color:var(--brand);font-weight:600}
/* Todo row */
.trow{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;transition:opacity .2s}
.trow.done{opacity:.6}
.chk{width:22px;height:22px;border-radius:6px;border:1.5px solid var(--border);background:var(--s2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s,border .15s}
.chk.checked{background:var(--green);border-color:var(--green)}
.chk.doing{background:var(--amber);border-color:var(--amber)}
/* Avatar */
.av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.av-sm{width:28px;height:28px;font-size:11px}
/* Toast */
#toastc{position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:8px;z-index:9999;pointer-events:none}
.toast{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.12);animation:fadeUp .3s ease;pointer-events:auto}
.t-ok{background:#fff;border:1px solid var(--gb);color:#065f46}
.t-err{background:#fff;border:1px solid #fca5a5;color:#991b1b}
.t-info{background:#fff;border:1px solid var(--bb);color:#1e40af}
@media(max-width:640px){
  .dash-wrap{flex-direction:column;padding:16px}
  .dash-side{width:100%;position:static}
  .side-nav{flex-direction:row;flex-wrap:wrap}
  .side-btn{width:auto;padding:8px 12px}
  .hidden-xs{display:none}
}
`;
}

// ============================================================
// INIT
// ============================================================
(async function init() {
  // Fix toast container id mismatch (html has toast-c, js uses toastc)
  const tc = document.getElementById('toast-c');
  if (tc) tc.id = 'toastc';

  // Inject app script into the placeholder <script id="main-script">
  const mainScript = document.getElementById('main-script');
  if (mainScript) mainScript.remove();

  await checkAuth();
  if (S.user) {
    S.page = 'dashboard';
    render();
    await loadDashboard();
    renderDashContent();
  } else {
    S.page = 'home';
    render();
  }
})();

     