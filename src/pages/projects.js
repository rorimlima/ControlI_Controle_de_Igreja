import { supabase } from '../lib/supabase.js';
import { renderLayout, getAppState } from '../main.js';
import { $, showToast, showConfirm, formatDate, getStatusBadge } from '../lib/utils.js';

export async function renderProjects() {
  const { church } = getAppState();
  const churchId = church?.id;

  renderLayout('Projetos Sociais', 'Impacte a comunidade', `
    <div class="page-header">
      <div class="page-header-info"><h1>❤️ Projetos Sociais</h1><p>Gerencie projetos de impacto social da igreja</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" id="addProjectBtn">+ Novo Projeto</button></div>
    </div>
    <div id="projectsContent"><div class="loading-text"><div class="spinner spinner-sm" style="margin:8px auto"></div></div></div>
    <div class="modal-overlay" id="projModal">
      <div class="modal">
        <div class="modal-header"><h3 id="projModalTitle">Novo Projeto</h3><button class="modal-close" id="closeProjModal">✕</button></div>
        <div class="modal-body">
          <form id="projForm">
            <div class="form-group"><label class="form-label">Nome *</label><input type="text" class="form-control" id="pName" required /></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Tema</label><input type="text" class="form-control" id="pTheme" placeholder="Ex: Educação, Saúde..." /></div>
              <div class="form-group"><label class="form-label">Status</label><select class="form-control" id="pStatus"><option value="planning">Planejamento</option><option value="active">Ativo</option><option value="completed">Concluído</option><option value="archived">Arquivado</option></select></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Início</label><input type="date" class="form-control" id="pStart" /></div>
              <div class="form-group"><label class="form-label">Término</label><input type="date" class="form-control" id="pEnd" /></div>
            </div>
            <div class="form-group"><label class="form-label">Líder</label><select class="form-control" id="pLeader"><option value="">Selecione</option></select></div>
            <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-control" id="pDescription" rows="3"></textarea></div>
          </form>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="cancelProjBtn">Cancelar</button><button class="btn btn-primary" id="saveProjBtn">Salvar</button></div>
      </div>
    </div>
  `);
  if (!churchId) return;

  let allProjects=[],allMembers=[],editingId=null;

  async function loadData() {
    const [pRes,mRes]=await Promise.all([
      supabase.from('projects').select('*,project_participants(member_id)').eq('church_id',churchId).order('created_at',{ascending:false}),
      supabase.from('members').select('id,full_name').eq('church_id',churchId).eq('status','active').order('full_name')
    ]);
    allProjects=pRes.data||[];allMembers=mRes.data||[];
    renderCards();
    $('#pLeader').innerHTML='<option value="">Selecione</option>'+allMembers.map(m=>`<option value="${m.id}">${m.full_name}</option>`).join('');
  }

  function renderCards(){
    const c=document.getElementById('projectsContent');
    if(!allProjects.length){c.innerHTML='<div class="empty-state"><span class="empty-state-icon">❤️</span><h3>Nenhum projeto</h3><p>Crie um projeto social para impactar a comunidade</p></div>';return;}
    c.innerHTML=`<div class="grid-3">${allProjects.map(p=>{
      const leader=allMembers.find(m=>m.id===p.leader_id);
      const participants=p.project_participants?.length||0;
      return `
        <div class="card" style="padding:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <h3 style="font-size:1rem;">${p.name}</h3>
            ${getStatusBadge(p.status)}
          </div>
          ${p.theme?`<span class="badge badge-info mb-1">${p.theme}</span>`:''}
          ${p.description?`<p style="font-size:0.82rem;color:var(--text-secondary);margin:8px 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${p.description}</p>`:''}
          <div style="display:flex;gap:6px;margin:12px 0;">
            <span class="badge badge-gold">👤 ${leader?.full_name||'Sem líder'}</span>
            <span class="badge badge-secondary">👥 ${participants} voluntários</span>
          </div>
          ${p.start_date||p.end_date?`<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px;">📅 ${formatDate(p.start_date)} — ${formatDate(p.end_date)}</div>`:''}
          <div style="display:flex;gap:6px;justify-content:flex-end;">
            <button class="btn btn-ghost btn-sm p-edit" data-id="${p.id}">✏️</button>
            <button class="btn btn-ghost btn-sm p-delete" data-id="${p.id}">🗑️</button>
          </div>
        </div>`;
    }).join('')}</div>`;
    c.querySelectorAll('.p-edit').forEach(b=>b.addEventListener('click',()=>editProject(b.dataset.id)));
    c.querySelectorAll('.p-delete').forEach(b=>b.addEventListener('click',()=>deleteProject(b.dataset.id)));
  }

  function openModal(){editingId=null;$('#projModalTitle').textContent='Novo Projeto';$('#projForm').reset();$('#projModal').classList.add('modal-overlay-active');}
  function closeModal(){$('#projModal').classList.remove('modal-overlay-active');}

  function editProject(id){const p=allProjects.find(x=>x.id===id);if(!p)return;editingId=id;$('#projModalTitle').textContent='Editar Projeto';$('#pName').value=p.name;$('#pTheme').value=p.theme||'';$('#pStatus').value=p.status;$('#pStart').value=p.start_date||'';$('#pEnd').value=p.end_date||'';$('#pLeader').value=p.leader_id||'';$('#pDescription').value=p.description||'';$('#projModal').classList.add('modal-overlay-active');}

  async function deleteProject(id){if(!await showConfirm('Excluir','Excluir este projeto?'))return;await supabase.from('projects').delete().eq('id',id);showToast('Excluído','success');loadData();}

  async function saveProject(){
    const data={church_id:churchId,name:$('#pName').value.trim(),theme:$('#pTheme').value.trim()||null,status:$('#pStatus').value,start_date:$('#pStart').value||null,end_date:$('#pEnd').value||null,leader_id:$('#pLeader').value||null,description:$('#pDescription').value.trim()||null};
    if(!data.name){showToast('Nome obrigatório','warning');return;}
    try{if(editingId){await supabase.from('projects').update(data).eq('id',editingId);}else{await supabase.from('projects').insert(data);}showToast('Projeto salvo','success');closeModal();loadData();}catch(err){showToast('Erro: '+err.message,'error');}
  }

  $('#addProjectBtn')?.addEventListener('click',openModal);$('#closeProjModal')?.addEventListener('click',closeModal);$('#cancelProjBtn')?.addEventListener('click',closeModal);$('#saveProjBtn')?.addEventListener('click',saveProject);
  $('#projModal')?.addEventListener('click',e=>{if(e.target.id==='projModal')closeModal();});

  loadData();
}
