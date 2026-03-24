// ============================================================
// 寰呬細路灏卞姙 鈥?Main App (Vanilla JS SPA)
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
  const icon = type === 'success' ? '鉁? : type === 'error' ? '鉁? : '鈩?;
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
const PRIO_LABEL = { high: '绱ф€?, medium: '涓?, low: '浣? };
const PRIO_CLASS = { high: 'b-high', medium: 'b-medium', low: 'b-low' };
const STATUS_LABEL = { todo: '寰呭姙', doing: '杩涜涓?, done: '宸插畬鎴? };
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
        <div class="badge b-low fu" style="margin-bottom:18px;display:inline-flex">鐜板凡鏀寔鍥㈤槦鍗忎綔</div>
        <h1 class="fu d1">寰呬細锛?br><span style="color:var(--brand)">鐜板湪灏卞姙锛?/span></h1>
        <p class="fu d2">涓汉浠诲姟绠＄悊 + 鍥㈤槦鍗忎綔锛屽府浣犳妸"寰呬細鍐嶈"鍙樻垚"椹笂鎼炲畾"銆傜畝鍗曘€佸揩閫熴€佺湡瀹炶惤鍦般€?/p>
        <div class="flex gap-2 fu d3" style="justify-content:center;flex-wrap:wrap">
          <button class="btn btn-brand" onclick="navigate('login')">鍏嶈垂寮€濮嬩娇鐢?/button>
          <button class="btn btn-outline" onclick="navigate('features')">浜嗚В鍔熻兘 鈫?/button>
        </div>
      </div>
    </section>

    <section style="padding:40px 20px;background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
      <div class="ctr">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center;max-width:600px;margin:0 auto">
          ${[['8涓?','娲昏穬鐢ㄦ埛'],['99%','浠诲姟瀹屾垚鐜?],['5x','鍗忎綔鏁堢巼鎻愬崌']].map(([v,l],i)=>`
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
          <div class="badge b-low" style="display:inline-flex;margin-bottom:12px">鏍稿績鍔熻兘</div>
          <h2 style="font-size:clamp(1.8rem,4vw,2.8rem);margin-bottom:10px">绠€鍗曪紝鎵嶆槸鏈€澶ф晥鐜?/h2>
          <p class="text-muted">涓変釜鏍稿績妯″潡锛岃В鍐虫晥鐜囩鐞嗘渶鏈川鐨勯棶棰樸€?/p>
        </div>
        <div class="fgrid">
          ${[
            ['涓汉寰呭姙','闅忔墜璁板綍锛岃缃紭鍏堢骇锛屼笁鎬佹祦杞€傛竻鍗曡秺鍋氳秺鐭紝鏁堢巼瓒婃潵瓒婇珮銆?,'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
            ['鍥㈤槦鍗忓悓','鍒涘缓鍥㈤槦锛岄個璇锋垚鍛橈紝鍒嗛厤浠诲姟銆傛瘡涓汉鐭ラ亾鑷繁璇ュ仛浠€涔堬紝涓嶅啀闈犲偓銆?,'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75'],
            ['杩涘害杩借釜','瀹炴椂鏌ョ湅姣忎綅鎴愬憳鐨勪换鍔＄姸鎬侊紝椤圭洰杩涘睍涓€鐩簡鐒讹紝涓嶇敤寮€浼氫篃鐭ラ亾鍏ㄥ眬銆?,'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z']
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
          <h2 style="font-size:clamp(1.6rem,4vw,2.4rem);margin-bottom:12px">鍒啀鎷栦簡</h2>
          <p class="text-muted mb-4">娉ㄥ唽鍙渶 30 绉掞紝鎶婇偅浠芥嫋浜嗕竴鍛ㄧ殑浜嬩粖澶╁仛瀹屽惂銆?/p>
          <button class="btn btn-brand" onclick="navigate('login')">椹笂寮€濮嬶紝涓嶆嫋浜?/button>
          <p class="text-xs text-muted mt-3">姘镐箙鍏嶈垂 路 鏃犻渶淇＄敤鍗?/p>
        </div>
      </div>
    </section>

    <footer style="padding:28px 20px;border-top:1px solid var(--border);background:var(--surface)">
      <div class="ctr flex justify-between items-center flex-wrap gap-2">
        <div class="logo">
          <div class="logo-icon" style="width:28px;height:28px;font-size:12px">寰?/div>
          <span class="logo-text" style="font-size:15px">寰呬細<span style="color:var(--brand)">路</span>灏卞姙</span>
        </div>
        <p class="text-sm text-muted">漏 2026 寰呬細路灏卞姙. 淇濈暀鎵€鏈夋潈鍒┿€?/p>
      </div>
    </footer>
  </div>
  `;
}

// ============================================================
// PAGE: LOGIN
// ============================================================

// ============================================================
// DASHBOARD 鈥?TODOS TAB
// ============================================================
async function toggleTodo(id, currentStatus) {
  const next = STATUS_NEXT[currentStatus] || 'todo';
  try {
    await API.todos.update(id, { status: next });
    const t = S.todos.find(x => x._id === id);
    if (t) t.status = next;
    renderDashContent();
  } catch(e) { toast(e.message || '鎿嶄綔澶辫触', 'error'); }
}

async function deleteTodo(id) {
  try {
    await API.todos.delete(id);
    S.todos = S.todos.filter(x => x._id !== id);
    renderDashContent();
    toast('宸插垹闄?, 'success');
  } catch(e) { toast(e.message || '鍒犻櫎澶辫触', 'error'); }
}

async function addTodo(e) {
  e.preventDefault();
  const titleEl = document.getElementById('new-todo-title');
  const prioEl = document.getElementById('new-todo-prio');
  const title = titleEl?.value?.trim();
  if (!title) return;
  const btn = document.getElementById('new-todo-btn');
  btn.disabled = true;
  btn.innerHTML = ICON.spin + '娣诲姞涓€?;
  try {
    const res = await API.todos.create({ title, priority: prioEl?.value || 'medium' });
    S.todos.unshift(res.todo);
    titleEl.value = '';
    renderDashContent();
    toast('宸叉坊鍔?, 'success');
  } catch(e) { toast(e.message || '娣诲姞澶辫触', 'error'); }
  btn.disabled = false;
  btn.innerHTML = '娣诲姞';
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
        <h2 style="font-size:20px;font-weight:700">鎴戠殑寰呭姙</h2>
        <p class="text-sm text-muted mt-1">鍏?${counts.all} 椤?路 ${counts.done} 椤瑰凡瀹屾垚</p>
      </div>
    </div>
    <form class="card p-4 mb-4 sd" onsubmit="addTodo(event)" style="display:flex;gap:10px;flex-wrap:wrap">
      <input id="new-todo-title" class="inp flex-1" style="min-width:180px" placeholder="娣诲姞鏂板緟鍔炩€? required />
      <select id="new-todo-prio" class="inp" style="width:90px">
        <option value="high">绱ф€?/option>
        <option value="medium" selected>涓?/option>
        <option value="low">浣?/option>
      </select>
      <button id="new-todo-btn" class="btn btn-brand btn-sm" type="submit">${ICON.plus} 娣诲姞</button>
    </form>
    <div class="flex gap-2 mb-4 flex-wrap">
      ${[['all','鍏ㄩ儴'],['todo','寰呭姙'],['doing','杩涜涓?],['done','宸插畬鎴?]].map(([k,l])=>
        `<button class="btn btn-xs ${filter===k?'btn-ghost':'btn-surface'}" onclick="window._todoFilter='${k}';renderDashContent()">${l} (${counts[k]})</button>`
      ).join('')}
    </div>
    <div class="space-y-2">
      ${filtered.length === 0 ? `<div class="card p-6 text-center text-muted text-sm">鏆傛棤寰呭姙</div>` :
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
            <button class="btn btn-xs btn-surface" title="鍒囨崲鐘舵€? onclick="toggleTodo('${t._id}','${t.status}')">${ICON.rotate}</button>
            <button class="btn btn-xs btn-danger" title="鍒犻櫎" onclick="deleteTodo('${t._id}')">${ICON.trash}</button>
          </div>
        </div>`).join('')
      }
    </div>
  </div>`;
}

// ============================================================
// DASHBOARD 鈥?TEAM TAB
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
  btn.disabled = true; btn.innerHTML = ICON.spin + '鍒涘缓涓€?;
  try {
    const res = await API.teams.create(name);
    S.teams.push({ ...res.team, todos: [] });
    toast('鍥㈤槦鍒涘缓鎴愬姛', 'success');
    window._teamView = 'main';
    renderDashContent();
  } catch(e) { toast(e.message || '鍒涘缓澶辫触', 'error'); }
  btn.disabled = false; btn.innerHTML = '纭鍒涘缓';
}

async function inviteMember() {
  const inp = document.getElementById('invite-phone');
  const phone = inp?.value?.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(phone)) { toast('璇疯緭鍏ユ纭殑閭鍦板潃', 'error'); return; }
  const team = myTeam();
  if (!team) return;
  const btn = document.getElementById('invite-btn');
  btn.disabled = true; btn.innerHTML = ICON.spin + '閭€璇蜂腑鈥?;
  const statusEl = document.getElementById('invite-status');
  try {
    // Check phone registered first
    const check = await API.teams.checkPhone(phone);
    if (!check.exists) {
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--red)">璇ラ偖绠卞皻鏈敞鍐岋紝璇峰鏂瑰厛娉ㄥ唽鍚庡啀閭€璇?/span>`;
      btn.disabled = false; btn.innerHTML = '閭€璇?;
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
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)">鉁?閭€璇锋垚鍔燂紒</span>`;
    setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
    renderDashContent();
    toast('閭€璇锋垚鍔?, 'success');
  } catch(err) {
    const msg = err.message || '閭€璇峰け璐?;
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--red)">${msg}</span>`;
    toast(msg, 'error');
  }
  btn.disabled = false; btn.innerHTML = '閭€璇?;
}

async function removeMember(phone) {
  const team = myTeam();
  if (!team) return;
  if (!confirm(`纭绉婚櫎璇ユ垚鍛橈紵`)) return;
  try {
    await API.teams.removeMember(team._id, phone);
    const idx = S.teams.findIndex(t => t._id === team._id);
    if (idx >= 0) S.teams[idx].members = S.teams[idx].members.filter(m => m.phone !== phone);
    renderDashContent();
    toast('宸茬Щ闄?, 'success');
  } catch(e) { toast(e.message || '鎿嶄綔澶辫触', 'error'); }
}

function renderTeamTab() {
  const team = myTeam();
  const view = window._teamView || 'main';
  if (!team && view !== 'create') {
    return `
    <div>
      <h2 style="font-size:20px;font-weight:700;margin-bottom:6px">鎴戠殑鍥㈤槦</h2>
      <p class="text-sm text-muted mb-6">浣犺繕娌℃湁鍔犲叆浠讳綍鍥㈤槦</p>
      <div class="card p-6 text-center" style="max-width:360px">
        <div class="ficon" style="margin:0 auto 14px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        <h3 style="font-size:16px;font-weight:700;margin-bottom:8px">鍒涘缓绗竴涓洟闃?/h3>
        <p class="text-sm text-muted mb-4">閭€璇锋垚鍛橈紝鍒嗛厤浠诲姟锛屽叡鍚屽畬鎴愮洰鏍囥€?/p>
        <button class="btn btn-brand w-full" onclick="window._teamView='create';renderDashContent()">${ICON.plus} 鍒涘缓鍥㈤槦</button>
      </div>
    </div>`;
  }
  if (view === 'create') {
    return `
    <div>
      <button class="flex items-center gap-2 text-sm text-muted mb-4" style="cursor:pointer" onclick="window._teamView='main';renderDashContent()">${ICON.back} 杩斿洖</button>
      <h2 style="font-size:20px;font-weight:700;margin-bottom:6px">鍒涘缓鍥㈤槦</h2>
      <form class="card p-5" style="max-width:400px" onsubmit="createTeam(event)">
        <label class="label">鍥㈤槦鍚嶇О</label>
        <input id="team-name-inp" class="inp mb-4" placeholder="渚嬪锛氫骇鍝佽璁＄粍銆佽繍钀ュ洟闃熲€? required autofocus />
        <div class="flex gap-2">
          <button id="create-team-btn" class="btn btn-brand flex-1" type="submit">纭鍒涘缓</button>
          <button class="btn btn-surface" type="button" onclick="window._teamView='main';renderDashContent()">鍙栨秷</button>
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
        <p class="text-sm text-muted mt-1">${team.members?.length || 0} 鍚嶆垚鍛?/p>
      </div>
      <span class="badge b-done">鍥㈤槦娲昏穬涓?/span>
    </div>
    <div class="card p-5 mb-4">
      <h3 class="font-semibold text-sm mb-3">鎴愬憳鍒楄〃</h3>
      <div class="space-y-3">
        ${(team.members||[]).map(m => `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="av" style="${avBg(m.role)}">${nameAv(m.nickname)}</div>
            <div>
              <p class="font-medium text-sm">${m.nickname || '鐢ㄦ埛'}</p>
              <p class="text-xs text-muted">${phoneMask(m.phone)}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge ${m.role==='owner'?'b-owner':'b-member'}">${m.role==='owner'?'绠＄悊鍛?:'鎴愬憳'}</span>
            ${isOwner && m.role !== 'owner' ? `<button class="btn btn-xs btn-danger" onclick="removeMember('${m.email}')">${ICON.x}</button>` : ''}
          </div>
        </div>`).join('')}
      </div>
    </div>
    ${isOwner ? `
    <div class="card p-5">
      <h3 class="font-semibold text-sm mb-3">閭€璇锋柊鎴愬憳</h3>
      <p class="text-xs text-muted mb-3">浠呭彲閭€璇峰凡娉ㄥ唽鐨勭敤鎴凤紙绯荤粺浼氳嚜鍔ㄦ牎楠岋級</p>
      <div class="flex gap-2 flex-wrap">
        <input id="invite-phone" class="inp flex-1" style="min-width:160px" placeholder="杈撳叆瀵规柟閭鍦板潃" onkeydown="if(event.key==='Enter')inviteMember()" />
        <button id="invite-btn" class="btn btn-brand btn-sm shrink-0" onclick="inviteMember()">閭€璇?/button>
      </div>
      <p id="invite-status" class="text-xs mt-2" style="min-height:18px"></p>
    </div>` : ''}
  </div>`;
}

// ============================================================
// DASHBOARD 鈥?MEMBERS TAB
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
  if (btn) { btn.disabled=true; btn.innerHTML=ICON.spin+'鈥?; }
  try {
    const res = await API.teams.createTeamTodo(team._id, { title, priority: prioEl?.value||'medium', assigneePhone: phone });
    const idx = S.teams.findIndex(t=>t._id===team._id);
    if (idx>=0) S.teams[idx].todos = [res.todo, ...(S.teams[idx].todos||[])];
    titleEl.value = '';
    renderDashContent();
    toast('浠诲姟宸插垎閰?, 'success');
  } catch(e) { toast(e.message || '鍒嗛厤澶辫触', 'error'); }
  if (btn) { btn.disabled=false; btn.innerHTML=ICON.plus+'鍒嗛厤'; }
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
  } catch(e) { toast(e.message || '鎿嶄綔澶辫触', 'error'); }
}

async function deleteTeamTodo(teamId, todoId) {
  try {
    await API.teams.deleteTeamTodo(teamId, todoId);
    const idx = S.teams.findIndex(t=>t._id===teamId);
    if (idx>=0) S.teams[idx].todos = (S.teams[idx].todos||[]).filter(x=>x._id!==todoId);
    renderDashContent();
    toast('宸插垹闄?, 'success');
  } catch(e) { toast(e.message || '鍒犻櫎澶辫触', 'error'); }
}

function renderMembersTab() {
  const team = myTeam();
  if (!team) {
    return `<div class="card p-6 text-center text-muted text-sm">璇峰厛鍔犲叆鎴栧垱寤哄洟闃?/div>`;
  }
  const isOwner = myRole(team) === 'owner';
  const members = team.members || [];
  const teamTodos = team.todos || [];

  return `
  <div>
    <div class="flex justify-between items-center mb-5 flex-wrap gap-2">
      <div>
        <h2 style="font-size:20px;font-weight:700">鎴愬憳浠诲姟</h2>
        <p class="text-sm text-muted mt-1">${team.name} 路 ${members.length} 鍚嶆垚鍛?/p>
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
                <p class="font-medium text-sm">${m.nickname || '鐢ㄦ埛'}</p>
                <p class="text-xs text-muted">${phoneMask(m.phone)} 路 ${m.role==='owner'?'绠＄悊鍛?:'鎴愬憳'}</p>
              </div>
            </div>
            <span class="badge b-todo">${memberTodos.length} 椤逛换鍔?/span>
          </div>
          ${isOwner ? `
          <form onsubmit="addTeamTodo(event,'${m.phone}')" class="flex gap-2 mb-3 flex-wrap">
            <input id="ttodo-${m.phone}" class="inp flex-1" style="min-width:140px;font-size:13px" placeholder="鍒嗛厤鏂颁换鍔♀€? required />
            <select id="tprio-${m.phone}" class="inp" style="width:80px;font-size:13px">
              <option value="high">绱ф€?/option>
              <option value="medium" selected>涓?/option>
              <option value="low">浣?/option>
            </select>
            <button id="ttodo-btn-${m.phone}" class="btn btn-brand btn-sm shrink-0" type="submit">${ICON.plus}鍒嗛厤</button>
          </form>` : ''}
          <div class="space-y-2">
            ${memberTodos.length === 0 ? `<p class="text-xs text-muted">鏆傛棤鍒嗛厤浠诲姟</p>` :
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
    { id:'todos', label:'鎴戠殑寰呭姙', icon: ICON.todo },
    { id:'team',  label:'鎴戠殑鍥㈤槦', icon: ICON.team },
    { id:'members', label:'鎴愬憳浠诲姟', icon: ICON.grid }];
  return `
  <div class="page">
    <nav class="topnav">
      <div class="ctr flex justify-between items-center" style="height:56px">
        <div class="logo">
          <div class="logo-icon" style="width:30px;height:30px;font-size:13px">寰?/div>
          <span class="logo-text">寰呬細<span style="color:var(--brand)">路</span>灏卞姙</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="av av-sm" style="${avBg('member')}">${nameAv(u?.nickname||u?.name||'?')}</div>
            <span class="text-sm font-medium hidden-xs">${u?.nickname||u?.name||'鐢ㄦ埛'}</span>
          </div>
          <button class="btn btn-xs btn-surface" onclick="handleLogout()" title="閫€鍑虹櫥褰?>${ICON.logout}</button>
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
        ${S.loading ? `<div class="flex items-center justify-center" style="height:200px;color:var(--t2)">${ICON.spin} <span class="ml-2">鍔犺浇涓€?/span></div>` : ''}
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
// DASHBOARD SHELL + RENDER
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
  S.user = null; S.todos = []; S.teams = [];
  S.page = 'home';
  render();
}

function render() {
  injectStyles();
  const app = document.getElementById('app');
  if (!app) return;
  if (S.page === 'home') app.innerHTML = renderHome();
  else if (S.page === 'login') { loginState.step = loginState.step || 'form'; app.innerHTML = renderLogin(); }
  else if (S.page === 'dashboard') { app.innerHTML = renderDashboard(); if (!S.loading) renderDashContent(); }
  const tc = document.getElementById('toast-c');
  if (tc) tc.id = 'toastc';
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

     
