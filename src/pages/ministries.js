import { db, addSyncQueue } from '../lib/db.js';
import { renderLayout, getAppState } from '../main.js';
import { $, showToast, showConfirm, generateId } from '../lib/utils.js';

export async function renderMinistries() {
  const { church } = getAppState();
  const churchId = church?.id;

  renderLayout('Ministérios', 'Gerencie os ministérios da igreja', `
    <div class="page-header">
      <div class="page-header-info"><h1>🎵 Ministérios</h1><p>Organize os ministérios e seus participantes</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" id="addMinistryBtn">+ Novo Ministério</button></div>
    </div>
    <div id="ministriesContent"><div class="loading-text"><div class="spinner spinner-sm" style="margin:8px auto"></div></div></div>
    <div class="modal-overlay" id="ministryModal">
      <div class="modal">
        <div class="modal-header"><h3 id="mModalTitle">Novo Ministério</h3><button class="modal-close" id="closeMinistryModal">✕</button></div>
        <div class="modal-body">
          <form id="ministryForm">
            <div class="form-group"><label class="form-label">Nome *</label><input type="text" class="form-control" id="miName" required /></div>
            <div class="form-group"><label class="form-label">Líder</label><select class="form-control" id="miLeader"><option value="">Selecione</option></select></div>
            <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-control" id="miDescription" rows="3"></textarea></div>
          </form>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="cancelMinistryBtn">Cancelar</button><button class="btn btn-primary" id="saveMinistryBtn">Salvar</button></div>
      </div>
    </div>
    <div class="modal-overlay" id="membersListModal">
      <div class="modal">
        <div class="modal-header"><h3 id="mlTitle">Membros do Ministério</h3><button class="modal-close" id="closeMembersListModal">✕</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Adicionar Membro</label><select class="form-control" id="addMemberSelect"><option value="">Selecione um membro</option></select></div>
          <button class="btn btn-primary btn-sm mb-2" id="addMemberToMinistry">+ Adicionar</button>
          <div id="ministryMembersList"></div>
        </div>
      </div>
    </div>
  `);
  if (!churchId) return;

  let allMinistries = [];
  let allMembers = [];
  let editingId = null;
  let currentMinistryId = null;

  async function loadData() {
    const mRes = await db.ministries.where('church_id').equals(churchId).toArray();
    const membersRes = (await db.members.where('church_id').equals(churchId).toArray()).filter(m => m.status === 'active');
    
    const ministryMembers = await db.ministry_members.toArray();
    for (let m of mRes) {
      m.ministry_members = ministryMembers.filter(mm => mm.ministry_id === m.id);
    }
    
    allMinistries = mRes.sort((a,b)=>a.name.localeCompare(b.name)) || [];
    allMembers = membersRes.sort((a,b)=>a.full_name.localeCompare(b.full_name)) || [];
    renderMinistryCards();
    populateLeaderSelect();
  }

  function populateLeaderSelect() {
    const sel = $('#miLeader');
    sel.innerHTML = '<option value="">Selecione</option>' + allMembers.map(m => `<option value="${m.id}">${m.full_name}</option>`).join('');
  }

  function renderMinistryCards() {
    const container = document.getElementById('ministriesContent');
    if (!allMinistries.length) {
      container.innerHTML = '<div class="empty-state"><span class="empty-state-icon">🎵</span><h3>Nenhum ministério</h3><p>Crie o primeiro ministério da sua igreja</p></div>';
      return;
    }
    container.innerHTML = `<div class="grid-3">${allMinistries.map(m => {
      const membersCount = m.ministry_members?.length || 0;
      const leader = allMembers.find(mb => mb.id === m.leader_id);
      return `
        <div class="card" style="padding:20px;position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),transparent);"></div>
          <h3 style="font-size:1.05rem;margin-bottom:8px;">${m.name}</h3>
          ${m.description ? `<p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${m.description}</p>` : ''}
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span class="badge badge-gold">👤 ${leader?.full_name || 'Sem líder'}</span>
            <span class="badge badge-info">👥 ${membersCount} membros</span>
          </div>
          <div style="display:flex;gap:6px;justify-content:flex-end;">
            <button class="btn btn-ghost btn-sm mi-members" data-id="${m.id}">👥 Membros</button>
            <button class="btn btn-ghost btn-sm mi-edit" data-id="${m.id}">✏️</button>
            <button class="btn btn-ghost btn-sm mi-delete" data-id="${m.id}">🗑️</button>
          </div>
        </div>
      `;
    }).join('')}</div>`;
    container.querySelectorAll('.mi-edit').forEach(b => b.addEventListener('click', () => editMinistry(b.dataset.id)));
    container.querySelectorAll('.mi-delete').forEach(b => b.addEventListener('click', () => deleteMinistry(b.dataset.id)));
    container.querySelectorAll('.mi-members').forEach(b => b.addEventListener('click', () => showMinistryMembers(b.dataset.id)));
  }

  function openModal() { editingId=null; $('#mModalTitle').textContent='Novo Ministério'; $('#ministryForm').reset(); $('#ministryModal').classList.add('modal-overlay-active'); }
  function closeModal() { $('#ministryModal').classList.remove('modal-overlay-active'); }

  function editMinistry(id) {
    const m = allMinistries.find(x=>x.id===id); if(!m) return;
    editingId=id; $('#mModalTitle').textContent='Editar Ministério';
    $('#miName').value=m.name; $('#miLeader').value=m.leader_id||''; $('#miDescription').value=m.description||'';
    $('#ministryModal').classList.add('modal-overlay-active');
  }

  async function deleteMinistry(id) {
    if(!await showConfirm('Excluir','Excluir este ministério?')) return;
    await db.ministries.delete(id);
    await addSyncQueue('ministries', 'DELETE', null, id);
    showToast('Ministério excluído','success'); loadData();
  }

  async function saveMinistry() {
    const data = { church_id:churchId, name:$('#miName').value.trim(), leader_id:$('#miLeader').value||null, description:$('#miDescription').value.trim()||null };
    if(!data.name){showToast('Nome é obrigatório','warning');return;}
    try {
      if(editingId){
        await db.ministries.update(editingId, data);
        await addSyncQueue('ministries', 'UPDATE', data, editingId);
      } else {
        data.id = generateId();
        await db.ministries.put(data);
        await addSyncQueue('ministries', 'INSERT', data);
      }
      showToast('Ministério salvo','success'); closeModal(); loadData();
    } catch(err){showToast('Erro: '+err.message,'error');}
  }

  async function showMinistryMembers(id) {
    currentMinistryId = id;
    const ministry = allMinistries.find(m=>m.id===id);
    $('#mlTitle').textContent = `Membros — ${ministry?.name}`;
    const sel = $('#addMemberSelect');
    sel.innerHTML = '<option value="">Selecione um membro</option>' + allMembers.map(m=>`<option value="${m.id}">${m.full_name}</option>`).join('');
    await loadMinistryMembers();
    $('#membersListModal').classList.add('modal-overlay-active');
  }

  async function loadMinistryMembers() {
    const data = await db.ministry_members.where('ministry_id').equals(currentMinistryId).toArray();
    for(let mm of data) {
      const m = await db.members.get(mm.member_id);
      mm.members = m || {};
    }
    const el = document.getElementById('ministryMembersList');
    if(!data?.length) { el.innerHTML='<p class="text-muted text-center">Nenhum membro adicionado</p>'; return; }
    el.innerHTML = data.map(mm => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
        <span>${mm.members?.full_name||'—'}</span>
        <button class="btn btn-ghost btn-sm mm-remove" data-id="${mm.id}" style="color:var(--danger)">✕</button>
      </div>
    `).join('');
    el.querySelectorAll('.mm-remove').forEach(b=>b.addEventListener('click', async ()=>{
      await db.ministry_members.delete(b.dataset.id);
      await addSyncQueue('ministry_members', 'DELETE', null, b.dataset.id);
      showToast('Membro removido','success'); loadMinistryMembers(); loadData();
    }));
  }

  $('#addMinistryBtn')?.addEventListener('click', openModal);
  $('#closeMinistryModal')?.addEventListener('click', closeModal);
  $('#cancelMinistryBtn')?.addEventListener('click', closeModal);
  $('#saveMinistryBtn')?.addEventListener('click', saveMinistry);
  $('#ministryModal')?.addEventListener('click', e=>{if(e.target.id==='ministryModal')closeModal();});
  $('#closeMembersListModal')?.addEventListener('click', ()=>$('#membersListModal').classList.remove('modal-overlay-active'));
  $('#membersListModal')?.addEventListener('click', e=>{if(e.target.id==='membersListModal')$('#membersListModal').classList.remove('modal-overlay-active');});
  $('#addMemberToMinistry')?.addEventListener('click', async ()=>{
    const memberId = $('#addMemberSelect').value;
    if(!memberId){showToast('Selecione um membro','warning');return;}
    const existing = (await db.ministry_members.where('ministry_id').equals(currentMinistryId).toArray()).find(mm => mm.member_id === memberId);
    if(existing){showToast('Membro já está neste ministério','error');return;}
    const data = { id: generateId(), ministry_id: currentMinistryId, member_id: memberId };
    await db.ministry_members.put(data);
    await addSyncQueue('ministry_members', 'INSERT', data);
    showToast('Membro adicionado','success'); loadMinistryMembers(); loadData();
  });

  loadData();
}
