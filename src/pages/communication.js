import { db, addSyncQueue } from '../lib/db.js';
import { renderLayout, getAppState } from '../main.js';
import { $, showToast, formatDate, generateId } from '../lib/utils.js';

export async function renderCommunication() {
  const { church, profile } = getAppState();
  const churchId = church?.id;

  renderLayout('Comunicação', 'Mural, avisos e pedidos de oração', `
    <div class="page-header">
      <div class="page-header-info"><h1>📢 Comunicação</h1><p>Mural de avisos e pedidos de oração da comunidade</p></div>
    </div>
    <div class="tabs" id="commTabs">
      <button class="tab active" data-tab="announcements">📢 Avisos</button>
      <button class="tab" data-tab="prayers">🙏 Pedidos de Oração</button>
    </div>
    <div id="commContent"></div>
    <div class="modal-overlay" id="annModal">
      <div class="modal">
        <div class="modal-header"><h3 id="annTitle">Novo Aviso</h3><button class="modal-close" id="closeAnnModal">✕</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Título *</label><input type="text" class="form-control" id="annTitleInput" required /></div>
          <div class="form-group"><label class="form-label">Conteúdo *</label><textarea class="form-control" id="annContent" rows="5" required></textarea></div>
          <div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="annPinned" /> <span class="form-label" style="margin:0;">Fixar no topo</span></label></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="cancelAnnBtn">Cancelar</button><button class="btn btn-primary" id="saveAnnBtn">Publicar</button></div>
      </div>
    </div>
    <div class="modal-overlay" id="prayerModal">
      <div class="modal modal-sm">
        <div class="modal-header"><h3>Novo Pedido de Oração</h3><button class="modal-close" id="closePrayerModal">✕</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Seu pedido *</label><textarea class="form-control" id="prayerContent" rows="4" required></textarea></div>
          <div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="prayerAnon" /> <span class="form-label" style="margin:0;">Publicar anonimamente</span></label></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="cancelPrayerBtn">Cancelar</button><button class="btn btn-primary" id="savePrayerBtn">Enviar</button></div>
      </div>
    </div>
  `);
  if (!churchId) return;

  let currentTab = 'announcements';
  const isLeader = ['master','admin','leader'].includes(profile?.role);

  async function loadTab() {
    if (currentTab === 'announcements') await loadAnnouncements();
    else await loadPrayers();
  }

  async function loadAnnouncements() {
    const anns = await db.announcements.where('church_id').equals(churchId).toArray();
    for (let a of anns) {
      if(a.author_id) {
        const prof = await db.profiles.get(a.author_id);
        a.profiles = { full_name: prof ? prof.full_name : 'Membro' };
      }
    }
    const data = anns.sort((a,b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    const c = document.getElementById('commContent');
    c.innerHTML = `
      ${isLeader ? '<div style="margin-bottom:16px;"><button class="btn btn-primary" id="newAnnBtn">+ Novo Aviso</button></div>' : ''}
      ${!data?.length ? '<div class="empty-state"><span class="empty-state-icon">📢</span><h3>Nenhum aviso</h3></div>' :
      data.map(a => `
        <div class="feed-card">
          <div class="feed-card-header">
            <div class="feed-card-avatar">${(a.profiles?.full_name||'?')[0].toUpperCase()}</div>
            <div>
              <div class="feed-card-author">${a.profiles?.full_name || 'Anônimo'}</div>
              <div class="feed-card-date">${formatDate(a.created_at)} ${a.pinned ? '📌 Fixado' : ''}</div>
            </div>
          </div>
          <h4 style="font-size:1rem;margin-bottom:8px;">${a.title}</h4>
          <div class="feed-card-content">${a.content?.replace(/\n/g,'<br>')}</div>
        </div>
      `).join('')}
    `;
    c.querySelector('#newAnnBtn')?.addEventListener('click', () => $('#annModal').classList.add('modal-overlay-active'));
  }

  async function loadPrayers() {
    const prayers = await db.prayers.where('church_id').equals(churchId).toArray();
    for (let p of prayers) {
      if(p.author_id) {
        const prof = await db.profiles.get(p.author_id);
        p.profiles = { full_name: prof ? prof.full_name : 'Membro' };
      }
    }
    const data = prayers.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    const c = document.getElementById('commContent');
    c.innerHTML = `
      <div style="margin-bottom:16px;"><button class="btn btn-primary" id="newPrayerBtn">+ Novo Pedido</button></div>
      ${!data?.length ? '<div class="empty-state"><span class="empty-state-icon">🙏</span><h3>Nenhum pedido</h3></div>' :
      data.map(p => `
        <div class="feed-card">
          <div class="feed-card-header">
            <div class="feed-card-avatar">🙏</div>
            <div>
              <div class="feed-card-author">${p.is_anonymous ? 'Anônimo' : (p.profiles?.full_name || 'Membro')}</div>
              <div class="feed-card-date">${formatDate(p.created_at)}</div>
            </div>
            <span class="badge ${p.status==='answered'?'badge-success':p.status==='archived'?'badge-secondary':'badge-info'}" style="margin-left:auto;">${p.status==='active'?'Ativo':p.status==='answered'?'Respondido':'Arquivado'}</span>
          </div>
          <div class="feed-card-content">${p.content?.replace(/\n/g,'<br>')}</div>
          <div class="feed-card-actions">
            <button class="feed-action-btn pray-like" data-id="${p.id}">❤️ ${p.likes_count||0}</button>
          </div>
        </div>
      `).join('')}
    `;
    c.querySelector('#newPrayerBtn')?.addEventListener('click', () => $('#prayerModal').classList.add('modal-overlay-active'));
    c.querySelectorAll('.pray-like').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.id;
      const p = await db.prayers.get(id);
      if (p) {
        const newLikes = (parseInt(b.textContent.replace(/\D/g,''))||0)+1;
        p.likes_count = newLikes;
        await db.prayers.put(p);
        await addSyncQueue('prayers', 'UPDATE', { likes_count: newLikes }, id);
        loadPrayers();
      }
    }));
  }

  document.querySelectorAll('#commTabs .tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('#commTabs .tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active'); currentTab=tab.dataset.tab; loadTab();
  }));

  $('#closeAnnModal')?.addEventListener('click', () => $('#annModal').classList.remove('modal-overlay-active'));
  $('#cancelAnnBtn')?.addEventListener('click', () => $('#annModal').classList.remove('modal-overlay-active'));
  $('#annModal')?.addEventListener('click', e=>{if(e.target.id==='annModal')$('#annModal').classList.remove('modal-overlay-active');});
  $('#saveAnnBtn')?.addEventListener('click', async () => {
    const title=$('#annTitleInput').value.trim(), content=$('#annContent').value.trim(), pinned=$('#annPinned').checked;
    if(!title||!content){showToast('Preencha título e conteúdo','warning');return;}
    const data = { id: generateId(), church_id: churchId, author_id: profile?.id, title, content, pinned, created_at: new Date().toISOString() };
    try {
      await db.announcements.put(data);
      await addSyncQueue('announcements', 'INSERT', data);
      showToast('Aviso publicado!','success'); $('#annModal').classList.remove('modal-overlay-active'); loadTab();
    } catch(error) {
      showToast('Erro: '+error.message,'error');
    }
  });

  $('#closePrayerModal')?.addEventListener('click', () => $('#prayerModal').classList.remove('modal-overlay-active'));
  $('#cancelPrayerBtn')?.addEventListener('click', () => $('#prayerModal').classList.remove('modal-overlay-active'));
  $('#prayerModal')?.addEventListener('click', e=>{if(e.target.id==='prayerModal')$('#prayerModal').classList.remove('modal-overlay-active');});
  $('#savePrayerBtn')?.addEventListener('click', async () => {
    const content=$('#prayerContent').value.trim(), is_anonymous=$('#prayerAnon').checked;
    if(!content){showToast('Escreva seu pedido','warning');return;}
    const data = { id: generateId(), church_id: churchId, author_id: profile?.id, content, is_anonymous, status: 'active', likes_count: 0, created_at: new Date().toISOString() };
    try {
      await db.prayers.put(data);
      await addSyncQueue('prayers', 'INSERT', data);
      showToast('Pedido enviado!','success'); $('#prayerModal').classList.remove('modal-overlay-active'); loadTab();
    } catch(error) {
      showToast('Erro: '+error.message,'error');
    }
  });

  loadTab();
}
