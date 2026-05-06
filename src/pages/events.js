import { db, addSyncQueue } from '../lib/db.js';
import { renderLayout, getAppState } from '../main.js';
import { $, showToast, showConfirm, formatDateTime, generateId } from '../lib/utils.js';

let allEvents = [];

export async function renderEvents() {
  const { church } = getAppState();
  const churchId = church?.id;

  renderLayout('Eventos', 'Agenda e escalas da igreja', `
    <div class="page-header">
      <div class="page-header-info"><h1>📅 Eventos & Agenda</h1><p>Gerencie eventos, cultos e escalas de serviço</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" id="addEventBtn">+ Novo Evento</button></div>
    </div>
    <div class="tabs" id="eventTabs">
      <button class="tab active" data-tab="list">📋 Lista</button>
      <button class="tab" data-tab="calendar">📅 Calendário</button>
    </div>
    <div id="eventContent"><div class="loading-text"><div class="spinner spinner-sm" style="margin:8px auto"></div></div></div>
    <div class="modal-overlay" id="eventModal">
      <div class="modal">
        <div class="modal-header"><h3 id="eventModalTitle">Novo Evento</h3><button class="modal-close" id="closeEventModal">✕</button></div>
        <div class="modal-body">
          <form id="eventForm">
            <div class="form-group"><label class="form-label">Título *</label><input type="text" class="form-control" id="eTitle" required /></div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Data/Hora Início *</label><input type="datetime-local" class="form-control" id="eDate" required /></div>
              <div class="form-group"><label class="form-label">Data/Hora Fim</label><input type="datetime-local" class="form-control" id="eEndDate" /></div>
            </div>
            <div class="form-group"><label class="form-label">Local</label><input type="text" class="form-control" id="eLocation" /></div>
            <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-control" id="eDescription" rows="3"></textarea></div>
            <div class="form-group"><label class="form-label">Cor</label><input type="color" id="eColor" value="#1E3A5F" style="width:60px;height:36px;border:none;cursor:pointer;" /></div>
          </form>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" id="cancelEventBtn">Cancelar</button><button class="btn btn-primary" id="saveEventBtn">Salvar</button></div>
      </div>
    </div>
  `);
  if (!churchId) return;

  let editingId = null;
  let currentView = 'list';
  let calMonth = new Date().getMonth();
  let calYear = new Date().getFullYear();

  async function loadData() {
    const data = await db.events.where('church_id').equals(churchId).toArray();
    allEvents = data.sort((a,b) => new Date(b.date) - new Date(a.date));
    renderCurrentView();
  }

  function renderCurrentView() {
    if (currentView === 'list') renderList();
    else renderCalendar();
  }

  function renderList() {
    const container = document.getElementById('eventContent');
    if (!allEvents.length) { container.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📅</span><h3>Nenhum evento</h3><p>Crie seu primeiro evento para começar</p></div>'; return; }
    const upcoming = allEvents.filter(e => new Date(e.date) >= new Date());
    const past = allEvents.filter(e => new Date(e.date) < new Date());
    container.innerHTML = `
      ${upcoming.length ? `<h3 style="margin-bottom:12px;font-size:0.95rem;color:var(--accent)">📌 Próximos (${upcoming.length})</h3>` : ''}
      <div class="grid-3 mb-3">${upcoming.map(e => eventCard(e)).join('')}</div>
      ${past.length ? `<h3 style="margin:20px 0 12px;font-size:0.95rem;color:var(--text-muted)">📋 Passados (${past.length})</h3><div class="grid-3">${past.slice(0,12).map(e => eventCard(e, true)).join('')}</div>` : ''}
    `;
    container.querySelectorAll('.ev-edit').forEach(b => b.addEventListener('click', () => editEvent(b.dataset.id)));
    container.querySelectorAll('.ev-delete').forEach(b => b.addEventListener('click', () => deleteEvent(b.dataset.id)));
  }

  function eventCard(e, isPast = false) {
    const dt = new Date(e.date);
    return `
      <div class="card" style="padding:16px;opacity:${isPast?0.6:1}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="width:48px;height:48px;border-radius:var(--radius);background:${e.color||'var(--primary)'}22;color:${e.color||'var(--primary)'};display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">
            <span style="font-size:1.1rem;line-height:1;">${dt.getDate()}</span>
            <span style="font-size:0.6rem;text-transform:uppercase;">${dt.toLocaleString('pt-BR',{month:'short'})}</span>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.title}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">${dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} ${e.location ? '• '+e.location : ''}</div>
          </div>
        </div>
        ${e.description ? `<p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${e.description}</p>` : ''}
        <div style="display:flex;gap:6px;justify-content:flex-end;">
          <button class="btn btn-ghost btn-sm ev-edit" data-id="${e.id}">✏️ Editar</button>
          <button class="btn btn-ghost btn-sm ev-delete" data-id="${e.id}">🗑️</button>
        </div>
      </div>
    `;
  }

  function renderCalendar() {
    const container = document.getElementById('eventContent');
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const monthName = new Date(calYear, calMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const today = new Date();

    let cells = '';
    const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    for (let i = 0; i < firstDay; i++) cells += '<div class="calendar-cell other-month"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvents = allEvents.filter(e => e.date.startsWith(dateStr));
      const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
      cells += `<div class="calendar-cell ${isToday ? 'today' : ''}"><div class="calendar-day">${d}</div>${dayEvents.map(e => `<div class="calendar-event" style="background:${e.color||'var(--accent)'}22;color:${e.color||'var(--accent)'}">${e.title}</div>`).join('')}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <button class="btn btn-ghost btn-sm" id="prevMonth">‹ Anterior</button>
        <h3 style="text-transform:capitalize;font-size:1.1rem;">${monthName}</h3>
        <button class="btn btn-ghost btn-sm" id="nextMonth">Próximo ›</button>
      </div>
      <div class="calendar-grid">${days.map(d => `<div class="calendar-header-cell">${d}</div>`).join('')}${cells}</div>
    `;
    document.getElementById('prevMonth')?.addEventListener('click', () => { calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); });
    document.getElementById('nextMonth')?.addEventListener('click', () => { calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); });
  }

  function openModal() { editingId=null; $('#eventModalTitle').textContent='Novo Evento'; $('#eventForm').reset(); $('#eColor').value='#1E3A5F'; $('#eventModal').classList.add('modal-overlay-active'); }
  function closeModal() { $('#eventModal').classList.remove('modal-overlay-active'); }

  function editEvent(id) {
    const e = allEvents.find(x=>x.id===id); if(!e) return;
    editingId = id; $('#eventModalTitle').textContent='Editar Evento';
    $('#eTitle').value=e.title; $('#eDate').value=e.date?.slice(0,16)||''; $('#eEndDate').value=e.end_date?.slice(0,16)||'';
    $('#eLocation').value=e.location||''; $('#eDescription').value=e.description||''; $('#eColor').value=e.color||'#1E3A5F';
    $('#eventModal').classList.add('modal-overlay-active');
  }

  async function deleteEvent(id) {
    if(!await showConfirm('Excluir Evento','Tem certeza?')) return;
    await db.events.delete(id);
    await addSyncQueue('events', 'DELETE', null, id);
    showToast('Evento excluído','success'); loadData();
  }

  async function saveEvent() {
    const data = { church_id:churchId, title:$('#eTitle').value.trim(), date:$('#eDate').value, end_date:$('#eEndDate').value||null, location:$('#eLocation').value.trim()||null, description:$('#eDescription').value.trim()||null, color:$('#eColor').value };
    if(!data.title||!data.date){showToast('Preencha título e data','warning');return;}
    try {
      if(editingId){
        await db.events.update(editingId, data);
        await addSyncQueue('events', 'UPDATE', data, editingId);
        showToast('Evento atualizado','success');
      } else {
        data.id = generateId();
        await db.events.put(data);
        await addSyncQueue('events', 'INSERT', data);
        showToast('Evento criado','success');
      }
      closeModal(); loadData();
    } catch(err){showToast('Erro: '+err.message,'error');}
  }

  document.querySelectorAll('#eventTabs .tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('#eventTabs .tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active'); currentView = tab.dataset.tab; renderCurrentView();
  }));

  $('#addEventBtn')?.addEventListener('click', openModal);
  $('#closeEventModal')?.addEventListener('click', closeModal);
  $('#cancelEventBtn')?.addEventListener('click', closeModal);
  $('#saveEventBtn')?.addEventListener('click', saveEvent);
  $('#eventModal')?.addEventListener('click', e=>{if(e.target.id==='eventModal')closeModal();});

  loadData();
}
