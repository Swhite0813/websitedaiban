// ============================================================
// LOGIN PAGE LOGIC
// ============================================================
let loginState = { email: '', countdown: 0, codeSent: false, error: '', otpError: '', devCode: '', step: 'form' };
let countdownTimer = null;

function _refreshSendBtn() {
  const btn = document.getElementById('send-btn');
  if (!btn) return;
  const email = document.getElementById('email-inp')?.value?.trim() || '';
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (loginState.countdown > 0) {
    btn.disabled = true;
    btn.textContent = loginState.countdown + 's';
  } else {
    btn.disabled = !valid;
    btn.textContent = loginState.codeSent ? '重新发送' : '获取验证码';
  }
}

function startCountdown() {
  loginState.countdown = 60;
  loginState.codeSent = true;
  clearInterval(countdownTimer);
  _refreshSendBtn();
  countdownTimer = setInterval(() => {
    loginState.countdown--;
    _refreshSendBtn();
    if (loginState.countdown <= 0) clearInterval(countdownTimer);
  }, 1000);
}

async function sendCode() {
  const email = document.getElementById('email-inp')?.value?.trim() || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  loginState.email = email;
  loginState.error = '';
  const errEl = document.getElementById('email-err');
  if (errEl) errEl.textContent = '';
  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  btn.textContent = '发送中…';
  try {
    const res = await API.auth.sendCode(email);
    loginState.devCode = res.code || '';
    if (loginState.devCode) {
      const devEl = document.getElementById('dev-code-hint');
      if (devEl) { devEl.textContent = '演示验证码：' + loginState.devCode; devEl.style.display = 'block'; }
    }
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
  btn.disabled = true;
  btn.innerHTML = '<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg> 登录中…';
  try {
    const res = await API.auth.login(email, code);
    S.user = res.user;
    loginState.step = 'success';
    render();
    await loadDashboard();
    setTimeout(() => navigate('dashboard'), 1500);
  } catch(e) {
    loginState.otpError = e.message || '验证码错误或已过期';
    if (errEl) errEl.textContent = loginState.otpError;
    btn.disabled = false;
    btn.textContent = '登录';
  }
}

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
        <h2 style="font-family:'Noto Serif SC',serif;font-size:22px;font-weight:700;margin-bottom:4px">登录 / 注册</h2>
        <p class="text-sm text-muted mb-5">邮箱验证，30 秒搞定</p>

        <label class="label">邮箱地址</label>
        <input id="email-inp" type="email" placeholder="请输入您的邮箱地址" class="inp mb-1"
          oninput="_refreshSendBtn()"
          onkeydown="if(event.key==='Enter')sendCode()" />
        <p id="email-err" class="text-xs mb-4" style="color:var(--red);min-height:16px"></p>

        <label class="label">验证码</label>
        <div class="flex gap-2 mb-1">
          <input id="code-inp" type="text" inputmode="numeric" maxlength="6" placeholder="输入验证码" class="inp flex-1"
            onkeydown="if(event.key==='Enter')verifyOtp()" />
          <button id="send-btn" class="btn btn-outline shrink-0" style="min-width:96px" onclick="sendCode()" disabled>获取验证码</button>
        </div>
        <p id="dev-code-hint" class="text-xs mb-1" style="color:var(--brand);display:none"></p>
        <p id="otp-err" class="text-xs mb-4" style="color:var(--red);min-height:16px"></p>

        <button id="login-btn" class="btn btn-brand w-full" onclick="verifyOtp()">登录</button>
        <p class="text-xs text-center mt-4 text-muted">登录即同意 <a href="#" style="color:var(--brand)">服务条款</a> 和 <a href="#" style="color:var(--brand)">隐私政策</a></p>
      </div>
      <p class="text-center text-sm text-muted mt-4"><button class="nav-btn" onclick="navigate('home')">← 返回首页</button></p>
    </div>
  </div>`;
}
