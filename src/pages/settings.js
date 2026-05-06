import { supabase } from '../lib/supabase.js';
import { db, addSyncQueue } from '../lib/db.js';
import { renderLayout, getAppState } from '../main.js';
import { $, showToast, getRoleBadge } from '../lib/utils.js';

export async function renderSettings() {
  const { profile, church } = getAppState();

  renderLayout('Configurações','Perfil e preferências',`
    <div class="page-header">
      <div class="page-header-info"><h1>⚙️ Configurações</h1><p>Gerencie seu perfil e preferências do sistema</p></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>👤 Meu Perfil</h3></div>
        <div style="text-align:center;margin-bottom:20px;">
          <div class="sidebar-avatar" style="width:80px;height:80px;font-size:1.8rem;margin:0 auto 12px;">${(profile?.full_name||'U').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
          <h3>${profile?.full_name||'Usuário'}</h3>
          <p style="color:var(--text-secondary);font-size:0.88rem;margin-top:4px;">${profile?.email}</p>
          <div style="margin-top:8px;">${getRoleBadge(profile?.role)}</div>
        </div>
        <form id="profileForm">
          <div class="form-group"><label class="form-label">Nome Completo</label><input type="text" class="form-control" id="sName" value="${profile?.full_name||''}" /></div>
          <div class="form-group"><label class="form-label">E-mail</label><input type="email" class="form-control" value="${profile?.email||''}" disabled /></div>
          <button type="button" class="btn btn-primary" id="saveProfileBtn" style="width:100%;">Salvar Alterações</button>
        </form>
      </div>
      <div>
        <div class="card mb-2">
          <div class="card-header"><h3>⛪ Igreja Atual</h3></div>
          ${church ? `
            <div style="display:flex;align-items:center;gap:14px;">
              <div style="width:50px;height:50px;border-radius:var(--radius);background:linear-gradient(135deg,var(--primary),var(--primary-light));display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">⛪</div>
              <div>
                <h4>${church.name}</h4>
                <p style="font-size:0.82rem;color:var(--text-secondary);">${church.address||'Endereço não informado'}</p>
                ${church.leader_name?`<p style="font-size:0.82rem;color:var(--text-muted);">Pastor: ${church.leader_name}</p>`:''}
              </div>
            </div>
          ` : '<p class="text-muted">Nenhuma igreja selecionada</p>'}
        </div>
        <div class="card mb-2">
          <div class="card-header"><h3>🔒 Segurança</h3></div>
          <button class="btn btn-secondary" id="changePasswordBtn" style="width:100%;">Alterar Senha</button>
        </div>
        <div class="card">
          <div class="card-header"><h3>ℹ️ Sobre o Sistema</h3></div>
          <div style="font-size:0.88rem;color:var(--text-secondary);">
            <p><strong>Control Igreja</strong> v1.0.0</p>
            <p style="margin-top:4px;">Sistema de Gestão Integrada de Igreja</p>
            <p style="margin-top:4px;">Powered by Supabase + Vite</p>
            <p style="margin-top:8px;font-size:0.78rem;color:var(--text-muted);">© 2026 Todos os direitos reservados</p>
          </div>
        </div>
      </div>
    </div>
  `);

  $('#saveProfileBtn')?.addEventListener('click', async () => {
    const name = $('#sName').value.trim();
    if (!name) { showToast('Nome é obrigatório', 'warning'); return; }
    try {
      await db.profiles.update(profile.id, { full_name: name });
      await addSyncQueue('profiles', 'UPDATE', { full_name: name }, profile.id);
      showToast('Perfil atualizado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro: ' + error.message, 'error');
    }
  });

  $('#changePasswordBtn')?.addEventListener('click', async () => {
    const newPass = prompt('Digite a nova senha (mínimo 6 caracteres):');
    if (!newPass || newPass.length < 6) { showToast('Senha deve ter pelo menos 6 caracteres', 'warning'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    showToast('Senha alterada com sucesso!', 'success');
  });
}
