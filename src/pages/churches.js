import { db, addSyncQueue } from '../lib/db.js';
import { renderLayout, getAppState, setCurrentChurch } from '../main.js';
import { $, showToast, showConfirm, formatDate, generateId } from '../lib/utils.js';

export async function renderChurches() {
  const { profile } = getAppState();
  if (profile?.role !== 'master') {
    renderLayout('Igrejas','',`<div class="empty-state"><span class="empty-state-icon">🔒</span><h3>Acesso Restrito</h3><p>Apenas o Master pode gerenciar igrejas</p></div>`);
    return;
  }

  renderLayout('Igrejas','Gestão multi-igreja',`
    <div class="page-header">
      <div class="page-header-info"><h1>⛪ Igrejas</h1><p>Gerencie todas as igrejas do sistema</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" id="addChurchBtn">+ Nova Igreja</button></div>
    </div>
    <div id="churchesContent"><div class="loading-text"><div class="spinner spinner-sm" style="margin:8px auto"></div></div></div>
    <div class="modal-overlay" id="churchModal">
      <div class="modal">
        <div class="modal-header"><h3 id="churchModalTitle">Nova Igreja</h3><button class="modal-close" id="closeChurchModal">✕</button></div>
        <div class="modal-body">
          <form id="churchForm">
            <div class="form-row" style="margin-bottom:16px;">
              <div style="flex:1">
                <label class="form-label">Logo da Igreja</label>
                <div style="display:flex; gap:12px; align-items:center;">
                  <div id="cLogoPreview" style="width:60px;height:60px;border-radius:var(--radius-sm);background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--border);">
                    <span style="font-size:1.5rem;color:var(--text-muted)">⛪</span>
                  </div>
                  <div style="flex:1;">
                    <input type="file" id="cLogoFile" accept="image/*" class="form-control" style="font-size:0.85rem;padding:8px;" />
                    <small style="color:var(--text-muted);display:block;margin-top:4px;">A logo será usada nos PDFs (Dízimos, Ofertas, etc.)</small>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-group"><label class="form-label">Nome *</label><input type="text" class="form-control" id="cName" required /></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">CNPJ</label><input type="text" class="form-control" id="cCnpj" /></div>
              <div class="form-group"><label class="form-label">Líder/Pastor</label><input type="text" class="form-control" id="cLeader" /></div>
            </div>
            <div class="form-group"><label class="form-label">Endereço</label><input type="text" class="form-control" id="cAddress" /></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">E-mail</label><input type="email" class="form-control" id="cEmail" /></div>
              <div class="form-group"><label class="form-label">Telefone</label><input type="text" class="form-control" id="cPhone" /></div>
            </div>
          </form>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="cancelChurchBtn">Cancelar</button><button class="btn btn-primary" id="saveChurchBtn">Salvar</button></div>
      </div>
    </div>
  `);

  let allChurches=[], editingId=null, currentLogoB64=null;

  async function loadData(){
    const data = await db.churches.toArray();
    allChurches = data.sort((a,b) => a.name.localeCompare(b.name));
    renderCards();
  }

  function renderCards(){
    const c=document.getElementById('churchesContent');
    if(!allChurches.length){c.innerHTML='<div class="empty-state"><span class="empty-state-icon">⛪</span><h3>Nenhuma igreja cadastrada</h3><p>Adicione a primeira igreja ao sistema</p></div>';return;}
    const currentId=localStorage.getItem('ci_church_id');
    c.innerHTML=`<div class="grid-3">${allChurches.map(ch=>`
      <div class="card" style="padding:20px;border:${ch.id===currentId?'2px solid var(--accent)':'1px solid var(--border)'};">
        ${ch.id===currentId?'<div style="position:absolute;top:12px;right:12px;"><span class="badge badge-gold">Ativa</span></div>':''}
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
          <div style="width:50px;height:50px;border-radius:var(--radius);background:linear-gradient(135deg,var(--primary),var(--primary-light));display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;overflow:hidden;">
            ${ch.logo_url ? `<img src="${ch.logo_url}" style="width:100%;height:100%;object-fit:cover;" alt="Logo" />` : '⛪'}
          </div>
          <div>
            <h3 style="font-size:1rem;">${ch.name}</h3>
            <div style="font-size:0.78rem;color:var(--text-muted);">${ch.leader_name||'Sem líder definido'}</div>
          </div>
        </div>
        ${ch.address?`<div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:4px;">📍 ${ch.address}</div>`:''}
        ${ch.contact_email?`<div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:4px;">📧 ${ch.contact_email}</div>`:''}
        ${ch.cnpj?`<div style="font-size:0.78rem;color:var(--text-muted);">CNPJ: ${ch.cnpj}</div>`:''}
        <div style="display:flex;gap:6px;margin-top:14px;justify-content:flex-end;">
          ${ch.id!==currentId?`<button class="btn btn-ghost btn-sm ch-select" data-id="${ch.id}">✅ Selecionar</button>`:''}
          <button class="btn btn-ghost btn-sm ch-edit" data-id="${ch.id}">✏️</button>
          <button class="btn btn-ghost btn-sm ch-delete" data-id="${ch.id}">🗑️</button>
        </div>
      </div>
    `).join('')}</div>`;
    c.querySelectorAll('.ch-select').forEach(b=>b.addEventListener('click',()=>{
      const ch=allChurches.find(x=>x.id===b.dataset.id);
      setCurrentChurch(ch);showToast(`Igreja "${ch.name}" selecionada`,'success');renderCards();
      const el=document.getElementById('headerChurchName');if(el)el.textContent=ch.name;
    }));
    c.querySelectorAll('.ch-edit').forEach(b=>b.addEventListener('click',()=>editChurch(b.dataset.id)));
    c.querySelectorAll('.ch-delete').forEach(b=>b.addEventListener('click',()=>deleteChurch(b.dataset.id)));
  }

  function updatePreview(url) {
    const p = $('#cLogoPreview');
    if(url) p.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:contain;" />`;
    else p.innerHTML = '<span style="font-size:1.5rem;color:var(--text-muted)">⛪</span>';
  }

  function openModal(){editingId=null;currentLogoB64=null;$('#churchModalTitle').textContent='Nova Igreja';$('#churchForm').reset();updatePreview(null);$('#churchModal').classList.add('modal-overlay-active');}
  function closeModal(){$('#churchModal').classList.remove('modal-overlay-active');}
  function editChurch(id){const ch=allChurches.find(x=>x.id===id);if(!ch)return;editingId=id;currentLogoB64=ch.logo_url||null;$('#churchModalTitle').textContent='Editar Igreja';$('#cName').value=ch.name;$('#cCnpj').value=ch.cnpj||'';$('#cLeader').value=ch.leader_name||'';$('#cAddress').value=ch.address||'';$('#cEmail').value=ch.contact_email||'';$('#cPhone').value=ch.contact_phone||'';$('#cLogoFile').value='';updatePreview(currentLogoB64);$('#churchModal').classList.add('modal-overlay-active');}
  async function deleteChurch(id){if(!await showConfirm('Excluir Igreja','Isso removerá todos os dados desta igreja. Continuar?'))return;await db.churches.delete(id);await addSyncQueue('churches', 'DELETE', null, id);showToast('Igreja excluída','success');if(localStorage.getItem('ci_church_id')===id){localStorage.removeItem('ci_church_id');setCurrentChurch(null);}loadData();}
  async function saveChurch(){
    const data={
      name:$('#cName').value.trim(),
      cnpj:$('#cCnpj').value.trim()||null,
      leader_name:$('#cLeader').value.trim()||null,
      address:$('#cAddress').value.trim()||null,
      contact_email:$('#cEmail').value.trim()||null,
      contact_phone:$('#cPhone').value.trim()||null,
      logo_url:currentLogoB64
    };
    if(!data.name){showToast('Nome obrigatório','warning');return;}
    try{
      if(editingId){await db.churches.update(editingId, data);await addSyncQueue('churches', 'UPDATE', data, editingId);showToast('Igreja atualizada','success');}
      else{
        data.id = generateId();
        await db.churches.put(data);
        await addSyncQueue('churches', 'INSERT', data);
        if(!localStorage.getItem('ci_church_id')){setCurrentChurch(data);}
        showToast('Igreja criada','success');
      }
      closeModal();loadData();
    }catch(err){showToast('Erro: '+err.message,'error');}
  }

  $('#addChurchBtn')?.addEventListener('click',openModal);$('#closeChurchModal')?.addEventListener('click',closeModal);$('#cancelChurchBtn')?.addEventListener('click',closeModal);$('#saveChurchBtn')?.addEventListener('click',saveChurch);
  $('#churchModal')?.addEventListener('click',e=>{if(e.target.id==='churchModal')closeModal();});

  $('#cLogoFile')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;
    const maxSize = 2 * 1024 * 1024; // 2MB
    if(file.size > maxSize) {
      showToast('Imagem muito grande. Máximo 2MB.', 'warning');
      this.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(evt) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; // Ensure transparent PNGs get white background if forced to JPEG, but we use webp/png
        ctx.drawImage(img, 0, 0, width, height);
        // compress slightly
        currentLogoB64 = canvas.toDataURL('image/webp', 0.85);
        updatePreview(currentLogoB64);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  loadData();
}
