import { signIn, resetPassword } from '../lib/auth.js';
import { $, showToast } from '../lib/utils.js';

export function renderLogin(router) {
  const app = $('#app');
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <div class="login-logo-icon">CI</div>
          <h1>Control Igreja</h1>
          <p>Sistema de Gestão Integrada</p>
        </div>
        <form class="login-form" id="loginForm">
          <div class="form-group">
            <label class="form-label" for="loginEmail">E-mail</label>
            <input type="email" class="form-control" id="loginEmail" placeholder="seu@email.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label" for="loginPassword">Senha</label>
            <input type="password" class="form-control" id="loginPassword" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn btn-primary login-btn" id="loginBtn">
            Entrar
          </button>
        </form>
        <div class="login-forgot">
          <a href="#" id="forgotLink">Esqueceu a senha?</a>
        </div>
      </div>
    </div>
  `;

  const form = $('#loginForm');
  const loginBtn = $('#loginBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;

    loginBtn.classList.add('btn-loading');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';

    try {
      await signIn(email, password);
      showToast('Login realizado com sucesso!', 'success');
      router.navigate('/dashboard');
    } catch (err) {
      showToast(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : err.message, 'error');
    } finally {
      loginBtn.classList.remove('btn-loading');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  });

  $('#forgotLink').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    if (!email) {
      showToast('Digite seu e-mail primeiro', 'warning');
      return;
    }
    try {
      await resetPassword(email);
      showToast('Link de recuperação enviado para ' + email, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
