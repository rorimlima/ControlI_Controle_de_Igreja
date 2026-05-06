import { db, addSyncQueue } from '../lib/db.js';
import { renderLayout, getAppState } from '../main.js';
import { $, showToast, showConfirm, formatDate, getStatusBadge, getRoleBadge, debounce, generateId } from '../lib/utils.js';

let allMembers = [];
let currentPage = 1;
const perPage = 12;

export async function renderMembers() {
  const { church } = getAppState();
  const churchId = church?.id;

  renderLayout('Membros', 'Gerencie os membros da sua igreja', `
    <div class="page-header">
      <div class="page-header-info">
        <h1>👥 Membros</h1>
        <p>Cadastre e gerencie os membros da comunidade</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" id="exportCsvBtn">📥 Exportar CSV</button>
        <button class="btn btn-primary" id="addMemberBtn">+ Novo Membro</button>
      </div>
    </div>

    <div class="table-wrapper">
      <div class="table-toolbar">
        <div class="table-search">
          <span class="table-search-icon">🔍</span>
          <input type="text" id="memberSearch" placeholder="Buscar por nome, email, telefone..." />
        </div>
        <div class="table-filters">
          <select class="filter-select" id="filterStatus">
            <option value="">Todos Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <select class="filter-select" id="filterRole">
            <option value="">Todos os Perfis</option>
            <option value="admin">Administradores</option>
            <option value="leader">Líderes</option>
            <option value="member">Membros</option>
          </select>
          <select class="filter-select" id="filterBaptism">
            <option value="">Batismo</option>
            <option value="batizado">Batizados</option>
            <option value="nao_batizado">Não Batizados</option>
            <option value="em_preparacao">Em Preparação</option>
          </select>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Membro</th>
              <th>Telefone</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Batismo</th>
              <th>Membro Desde</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="membersTableBody">
            <tr><td colspan="7" class="table-empty"><div class="spinner spinner-sm" style="margin:0 auto"></div></td></tr>
          </tbody>
        </table>
      </div>
      <div class="table-pagination" id="membersPagination"></div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" id="memberModal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 id="memberModalTitle">Novo Membro</h3>
          <button class="modal-close" id="closeMemberModal">✕</button>
        </div>
        <div class="modal-body">
          <form id="memberForm">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nome Completo *</label>
                <input type="text" class="form-control" id="mFullName" required />
              </div>
              <div class="form-group">
                <label class="form-label">E-mail</label>
                <input type="email" class="form-control" id="mEmail" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Telefone</label>
                <input type="text" class="form-control" id="mPhone" placeholder="(00) 00000-0000" />
              </div>
              <div class="form-group">
                <label class="form-label">CPF</label>
                <input type="text" class="form-control" id="mCpf" placeholder="000.000.000-00" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Data de Nascimento</label>
                <input type="date" class="form-control" id="mBirthDate" />
              </div>
              <div class="form-group">
                <label class="form-label">Estado Civil</label>
                <select class="form-control" id="mMaritalStatus">
                  <option value="">Selecione</option>
                  <option value="solteiro">Solteiro(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viuvo">Viúvo(a)</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Endereço</label>
              <input type="text" class="form-control" id="mAddress" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Status de Batismo</label>
                <select class="form-control" id="mBaptismStatus">
                  <option value="">Selecione</option>
                  <option value="batizado">Batizado</option>
                  <option value="nao_batizado">Não Batizado</option>
                  <option value="em_preparacao">Em Preparação</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Data do Batismo</label>
                <input type="date" class="form-control" id="mBaptismDate" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Perfil</label>
                <select class="form-control" id="mRole">
                  <option value="member">Membro</option>
                  <option value="leader">Líder</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Membro Desde</label>
                <input type="date" class="form-control" id="mMemberSince" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Observações</label>
              <textarea class="form-control" id="mNotes" rows="3"></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelMemberBtn">Cancelar</button>
          <button class="btn btn-primary" id="saveMemberBtn">Salvar</button>
        </div>
      </div>
    </div>
  `);

  if (!churchId) return;

  let editingId = null;

  async function loadMembers() {
    try {
      const data = await db.members.where('church_id').equals(churchId).toArray();
      allMembers = data.sort((a,b) => (a.full_name||'').localeCompare(b.full_name||''));
      applyFilters();
    } catch (error) {
      showToast('Erro ao carregar membros: ' + error.message, 'error');
    }
  }

  function applyFilters() {
    const search = ($('#memberSearch')?.value || '').toLowerCase();
    const status = $('#filterStatus')?.value || '';
    const role = $('#filterRole')?.value || '';
    const baptism = $('#filterBaptism')?.value || '';

    let filtered = allMembers.filter(m => {
      if (search && !`${m.full_name} ${m.email} ${m.phone} ${m.cpf}`.toLowerCase().includes(search)) return false;
      if (status && m.status !== status) return false;
      if (role && m.role !== role) return false;
      if (baptism && m.baptism_status !== baptism) return false;
      return true;
    });

    renderTable(filtered);
  }

  function renderTable(members) {
    const start = (currentPage - 1) * perPage;
    const paged = members.slice(start, start + perPage);
    const totalPages = Math.ceil(members.length / perPage);

    const tbody = $('#membersTableBody');
    if (!paged.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><span class="table-empty-icon">👥</span><p>Nenhum membro encontrado</p></td></tr>';
    } else {
      tbody.innerHTML = paged.map(m => {
        const initials = (m.full_name || '?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
        return `
          <tr>
            <td>
              <div class="member-info">
                <div class="sidebar-avatar" style="width:36px;height:36px;font-size:0.75rem;">${initials}</div>
                <div>
                  <div class="member-name">${m.full_name}</div>
                  <div class="member-email">${m.email || '—'}</div>
                </div>
              </div>
            </td>
            <td>${m.phone || '—'}</td>
            <td>${getRoleBadge(m.role)}</td>
            <td>${getStatusBadge(m.status)}</td>
            <td>${m.baptism_status ? getStatusBadge(m.baptism_status) : '—'}</td>
            <td>${formatDate(m.member_since)}</td>
            <td>
              <div class="table-actions">
                <button class="table-action-btn edit" data-id="${m.id}" title="Editar">✏️</button>
                <button class="table-action-btn delete" data-id="${m.id}" title="Excluir">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Pagination
    const pagination = $('#membersPagination');
    pagination.innerHTML = `
      <span>Mostrando ${start+1}–${Math.min(start+perPage, members.length)} de ${members.length}</span>
      <div class="table-pagination-controls">
        <button class="table-pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} id="prevPage">‹</button>
        ${Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
          const p = i + 1;
          return `<button class="table-pagination-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
        }).join('')}
        <button class="table-pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} id="nextPage">›</button>
      </div>
    `;

    // Event listeners
    tbody.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', () => editMember(btn.dataset.id)));
    tbody.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', () => deleteMember(btn.dataset.id)));
    pagination.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => { currentPage = parseInt(btn.dataset.page); applyFilters(); }));
    const prevBtn = $('#prevPage');
    const nextBtn = $('#nextPage');
    if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; applyFilters(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; applyFilters(); });
  }

  function openModal(title = 'Novo Membro') {
    editingId = null;
    $('#memberModalTitle').textContent = title;
    $('#memberForm').reset();
    $('#mMemberSince').value = new Date().toISOString().split('T')[0];
    $('#memberModal').classList.add('modal-overlay-active');
  }

  function closeModal() {
    $('#memberModal').classList.remove('modal-overlay-active');
    editingId = null;
  }

  function editMember(id) {
    const member = allMembers.find(m => m.id === id);
    if (!member) return;
    editingId = id;
    $('#memberModalTitle').textContent = 'Editar Membro';
    $('#mFullName').value = member.full_name || '';
    $('#mEmail').value = member.email || '';
    $('#mPhone').value = member.phone || '';
    $('#mCpf').value = member.cpf || '';
    $('#mBirthDate').value = member.birth_date || '';
    $('#mMaritalStatus').value = member.marital_status || '';
    $('#mAddress').value = member.address || '';
    $('#mBaptismStatus').value = member.baptism_status || '';
    $('#mBaptismDate').value = member.baptism_date || '';
    $('#mRole').value = member.role || 'member';
    $('#mMemberSince').value = member.member_since || '';
    $('#mNotes').value = member.notes || '';
    $('#memberModal').classList.add('modal-overlay-active');
  }

  async function deleteMember(id) {
    const member = allMembers.find(m => m.id === id);
    const confirmed = await showConfirm('Excluir Membro', `Tem certeza que deseja excluir <strong>${member?.full_name}</strong>?`);
    if (!confirmed) return;
    try {
      await db.members.delete(id);
      await addSyncQueue('members', 'DELETE', null, id);
      showToast('Membro excluído com sucesso', 'success');
      loadMembers();
    } catch (error) {
      showToast('Erro ao excluir: ' + error.message, 'error');
    }
  }

  async function saveMember() {
    const data = {
      church_id: churchId,
      full_name: $('#mFullName').value.trim(),
      email: $('#mEmail').value.trim() || null,
      phone: $('#mPhone').value.trim() || null,
      cpf: $('#mCpf').value.trim() || null,
      birth_date: $('#mBirthDate').value || null,
      marital_status: $('#mMaritalStatus').value || null,
      address: $('#mAddress').value.trim() || null,
      baptism_status: $('#mBaptismStatus').value || null,
      baptism_date: $('#mBaptismDate').value || null,
      role: $('#mRole').value,
      member_since: $('#mMemberSince').value || null,
      notes: $('#mNotes').value.trim() || null
    };

    if (!data.full_name) { showToast('Nome é obrigatório', 'warning'); return; }

    const saveBtn = $('#saveMemberBtn');
    saveBtn.classList.add('btn-loading');
    saveBtn.disabled = true;

    try {
      if (editingId) {
        await db.members.update(editingId, data);
        await addSyncQueue('members', 'UPDATE', data, editingId);
        showToast('Membro atualizado com sucesso', 'success');
      } else {
        data.id = generateId();
        await db.members.put(data);
        await addSyncQueue('members', 'INSERT', data);
        showToast('Membro cadastrado com sucesso', 'success');
      }
      closeModal();
      loadMembers();
    } catch (err) {
      showToast('Erro: ' + err.message, 'error');
    } finally {
      saveBtn.classList.remove('btn-loading');
      saveBtn.disabled = false;
    }
  }

  function exportCSV() {
    if (!allMembers.length) { showToast('Nenhum dado para exportar', 'warning'); return; }
    const headers = ['Nome','Email','Telefone','CPF','Nascimento','Estado Civil','Endereço','Batismo','Perfil','Status','Membro Desde'];
    const rows = allMembers.map(m => [m.full_name, m.email, m.phone, m.cpf, m.birth_date, m.marital_status, m.address, m.baptism_status, m.role, m.status, m.member_since]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `membros_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('CSV exportado com sucesso', 'success');
  }

  // Event listeners
  $('#addMemberBtn')?.addEventListener('click', () => openModal());
  $('#closeMemberModal')?.addEventListener('click', closeModal);
  $('#cancelMemberBtn')?.addEventListener('click', closeModal);
  $('#saveMemberBtn')?.addEventListener('click', saveMember);
  $('#exportCsvBtn')?.addEventListener('click', exportCSV);
  $('#memberSearch')?.addEventListener('input', debounce(() => { currentPage = 1; applyFilters(); }));
  $('#filterStatus')?.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  $('#filterRole')?.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  $('#filterBaptism')?.addEventListener('change', () => { currentPage = 1; applyFilters(); });
  $('#memberModal')?.addEventListener('click', (e) => { if (e.target.id === 'memberModal') closeModal(); });

  loadMembers();
}
