import { supabase } from '../lib/supabase.js';
import { renderLayout, getAppState } from '../main.js';
import { $, showToast, showConfirm } from '../lib/utils.js';

export async function renderGroups() {
  const { church } = getAppState();
  const churchId = church?.id;

  renderLayout('Células', 'Gerencie os grupos e células', `
    <div class="page-header">
      <div class="page-header-info"><h1>🏠 Células / Grupos</h1><p>Organize os grupos de comunhão e discipulado</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" id="addGroupBtn">+ Novo Grupo</button></div>
    </div>
    <div id="groupsContent"><div class="loading-text"><div class="spinner spinner-sm" style="margin:8px auto"></div></div></div>
    <div class="modal-overlay" id="groupModal">
      <div class="modal">
        <div class="modal-header"><h3 id="gModalTitle">Novo Grupo</h3><button class="modal-close" id="closeGroupModal">✕</button></div>
        <div class="modal-body">
          <form id="groupForm">
            <div class="form-group"><label class="form-label">Nome *</label><input type="text" class="form-control" id="gName" required /></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Líder</label><select class="form-control" id="gLeader"><option value="">Selecione</option></select></div>
              <div class="form-group"><label class="form-label">Dia da Reunião</label><select class="form-control" id="gDay"><option value="">Selecione</option><option>Segunda</option><option>Terça</option><option>Quarta</option><option>Quinta</option><option>Sexta</option><option>Sábado</option><option>Domingo</option></select></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Horário</label><input type="time" class="form-control" id="gTime" /></div>
              <div class="form-group"><label class="form-label">Local</label><input type="text" class="form-control" id="gLocation" /></div>
            </div>
            <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-control" id="gDescription" rows="2"></textarea></div>
          </form>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="cancelGroupBtn">Cancelar</button><button class="btn btn-primary" id="saveGroupBtn">Salvar</button></div>
      </div>
    </div>
    <div class="modal-overlay" id="gmModal">
      <div class="modal">
        <div class="modal-header"><h3 id="gmTitle">Membros do Grupo</h3><button class="modal-close" id="closeGmModal">✕</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Adicionar Membro</label><select class="form-control" id="gmSelect"><option value="">Selecione</option></select></div>
          <button class="btn btn-primary btn-sm mb-2" id="gmAddBtn">+ Adicionar</button>
          <div id="gmList"></div>
        </div>
      </div>
    </div>
  `);
  if (!churchId) return;

  let allGroups=[], allMembers=[], editingId=null, currentGroupId=null;

  async function loadData() {
    const [gRes,mRes] = await Promise.all([
      supabase.from('groups').select('*, group_members(member_id, members(full_name))').eq('church_id',churchId).order('name'),
      supabase.from('members').select('id,full_name').eq('church_id',churchId).eq('status','active').order('full_name')
    ]);
    allGroups=gRes.data||[]; allMembers=mRes.data||[];
    renderCards();
    $('#gLeader').innerHTML='<option value="">Selecione</option>'+allMembers.map(m=>`<option value="${m.id}">${m.full_name}</option>`).join('');
  }

  function renderCards() {
    const c=document.getElementById('groupsContent');
    if(!allGroups.length){c.innerHTML='<div class="empty-state"><span class="empty-state-icon">🏠</span><h3>Nenhum grupo</h3><p>Crie o primeiro grupo</p></div>';return;}
    c.innerHTML=`<div class="grid-3">${allGroups.map(g=>{
      const leader=allMembers.find(m=>m.id===g.leader_id);
      const count=g.group_members?.length||0;
      return `
        <div class="card" style="padding:20px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="width:44px;height:44px;border-radius:var(--radius);background:rgba(var(--accent-rgb),0.12);display:flex;align-items:center;justify-content:center;font-size:1.2rem;">🏠</div>
            <div><div style="font-weight:700;">${g.name}</div><div style="font-size:0.78rem;color:var(--text-muted);">${g.meeting_day||''} ${g.meeting_time?'às '+g.meeting_time:''}</div></div>
          </div>
          ${g.location?`<div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:8px;">📍 ${g.location}</div>`:''}
          <div style="display:flex;gap:6px;margin-bottom:12px;">
            <span class="badge badge-gold">👤 ${leader?.full_name||'Sem líder'}</span>
            <span class="badge badge-info">👥 ${count}</span>
          </div>
          <div style="display:flex;gap:6px;justify-content:flex-end;">
            <button class="btn btn-ghost btn-sm g-members" data-id="${g.id}">👥</button>
            <button class="btn btn-ghost btn-sm g-edit" data-id="${g.id}">✏️</button>
            <button class="btn btn-ghost btn-sm g-delete" data-id="${g.id}">🗑️</button>
          </div>
        </div>`;
    }).join('')}</div>`;
    c.querySelectorAll('.g-edit').forEach(b=>b.addEventListener('click',()=>editGroup(b.dataset.id)));
    c.querySelectorAll('.g-delete').forEach(b=>b.addEventListener('click',()=>deleteGroup(b.dataset.id)));
    c.querySelectorAll('.g-members').forEach(b=>b.addEventListener('click',()=>showGroupMembers(b.dataset.id)));
  }

  function openModal(){editingId=null;$('#gModalTitle').textContent='Novo Grupo';$('#groupForm').reset();$('#groupModal').classList.add('modal-overlay-active');}
  function closeModal(){$('#groupModal').classList.remove('modal-overlay-active');}

  function editGroup(id){const g=allGroups.find(x=>x.id===id);if(!g)return;editingId=id;$('#gModalTitle').textContent='Editar Grupo';$('#gName').value=g.name;$('#gLeader').value=g.leader_id||'';$('#gDay').value=g.meeting_day||'';$('#gTime').value=g.meeting_time||'';$('#gLocation').value=g.location||'';$('#gDescription').value=g.description||'';$('#groupModal').classList.add('modal-overlay-active');}

  async function deleteGroup(id){if(!await showConfirm('Excluir','Excluir este grupo?'))return;await supabase.from('groups').delete().eq('id',id);showToast('Grupo excluído','success');loadData();}

  async function saveGroup(){
    const data={church_id:churchId,name:$('#gName').value.trim(),leader_id:$('#gLeader').value||null,meeting_day:$('#gDay').value||null,meeting_time:$('#gTime').value||null,location:$('#gLocation').value.trim()||null,description:$('#gDescription').value.trim()||null};
    if(!data.name){showToast('Nome é obrigatório','warning');return;}
    try{if(editingId){await supabase.from('groups').update(data).eq('id',editingId);}else{await supabase.from('groups').insert(data);}showToast('Grupo salvo','success');closeModal();loadData();}catch(err){showToast('Erro: '+err.message,'error');}
  }

  async function showGroupMembers(id){
    currentGroupId=id;const g=allGroups.find(x=>x.id===id);$('#gmTitle').textContent=`Membros — ${g?.name}`;
    $('#gmSelect').innerHTML='<option value="">Selecione</option>'+allMembers.map(m=>`<option value="${m.id}">${m.full_name}</option>`).join('');
    await loadGroupMembers();$('#gmModal').classList.add('modal-overlay-active');
  }

  async function loadGroupMembers(){
    const{data}=await supabase.from('group_members').select('*,members(full_name)').eq('group_id',currentGroupId);
    const el=$('#gmList');
    if(!data?.length){el.innerHTML='<p class="text-muted text-center">Nenhum membro</p>';return;}
    el.innerHTML=data.map(gm=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span>${gm.members?.full_name||'—'}</span><button class="btn btn-ghost btn-sm gm-rm" data-id="${gm.id}" style="color:var(--danger)">✕</button></div>`).join('');
    el.querySelectorAll('.gm-rm').forEach(b=>b.addEventListener('click',async()=>{await supabase.from('group_members').delete().eq('id',b.dataset.id);showToast('Removido','success');loadGroupMembers();loadData();}));
  }

  $('#addGroupBtn')?.addEventListener('click',openModal);$('#closeGroupModal')?.addEventListener('click',closeModal);$('#cancelGroupBtn')?.addEventListener('click',closeModal);$('#saveGroupBtn')?.addEventListener('click',saveGroup);
  $('#groupModal')?.addEventListener('click',e=>{if(e.target.id==='groupModal')closeModal();});
  $('#closeGmModal')?.addEventListener('click',()=>$('#gmModal').classList.remove('modal-overlay-active'));
  $('#gmModal')?.addEventListener('click',e=>{if(e.target.id==='gmModal')$('#gmModal').classList.remove('modal-overlay-active');});
  $('#gmAddBtn')?.addEventListener('click',async()=>{const v=$('#gmSelect').value;if(!v){showToast('Selecione','warning');return;}const{error}=await supabase.from('group_members').insert({group_id:currentGroupId,member_id:v});if(error){showToast(error.message.includes('duplicate')?'Já está no grupo':'Erro: '+error.message,'error');return;}showToast('Adicionado','success');loadGroupMembers();loadData();});

  loadData();
}
