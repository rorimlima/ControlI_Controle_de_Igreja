import { supabase } from '../lib/supabase.js';
import { renderLayout, getAppState } from '../main.js';
import { $, showToast, showConfirm, formatCurrency, formatDate, getStatusBadge } from '../lib/utils.js';

/** Gera código único: PAT-AAAMMDD-XXX (ex: PAT-20260421-001) */
function generateAssetCode(existingItems) {
  const today = new Date();
  const dateStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('');

  // Filtra itens do dia e encontra o próximo sequencial
  const prefix = `PAT-${dateStr}-`;
  const todayItems = existingItems
    .filter(i => (i.asset_tag || '').startsWith(prefix))
    .map(i => parseInt((i.asset_tag || '').replace(prefix, '')) || 0)
    .sort((a, b) => b - a);

  const next = ((todayItems[0] || 0) + 1).toString().padStart(3, '0');
  return `${prefix}${next}`;
}

export async function renderPatrimony() {
  const { church, profile } = getAppState();
  const churchId = church?.id;
  if (!['admin', 'master'].includes(profile?.role)) {
    renderLayout('Patrimônio', '', `<div class="empty-state"><span class="empty-state-icon">🔒</span><h3>Acesso Restrito</h3></div>`);
    return;
  }

  renderLayout('Patrimônio', 'Controle do patrimônio da igreja', `
    <style>
      .pat-code { font-family: 'Courier New', monospace; font-size: .75rem; background: var(--bg-tertiary); padding: 3px 10px; border-radius: 4px; color: var(--accent); border: 1px solid rgba(212,175,55,.2); }
      .pat-code-display { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: linear-gradient(135deg, rgba(212,175,55,.08), rgba(212,175,55,.03)); border: 1px solid rgba(212,175,55,.25); border-radius: var(--radius-sm); margin-bottom: 16px; }
      .pat-code-display .code-label { font-size: .7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
      .pat-code-display .code-value { font-family: 'Courier New', monospace; font-size: 1rem; font-weight: 700; color: var(--accent); letter-spacing: 2px; }
      @media(max-width:768px){ .page-header{flex-direction:column!important;gap:10px} th,td{padding:8px 6px!important;font-size:.8rem} }
    </style>
    <div class="page-header">
      <div class="page-header-info"><h1>🏢 Patrimônio</h1><p>Controle de bens e ativos da igreja</p></div>
      <div class="page-header-actions"><button class="btn btn-primary" id="addPatBtn">+ Novo Item</button></div>
    </div>
    <div class="stats-grid" id="patStats"></div>
    <div class="table-wrapper">
      <div class="table-toolbar">
        <div class="table-search"><span class="table-search-icon">🔍</span><input type="text" id="patSearch" placeholder="Buscar patrimônio..." /></div>
        <div class="table-filters">
          <select class="filter-select" id="filterCond">
            <option value="">Toda Condição</option>
            <option value="novo">Novo</option>
            <option value="bom">Bom</option>
            <option value="regular">Regular</option>
            <option value="ruim">Ruim</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>
      <div class="table-container">
        <table><thead><tr>
          <th>Item</th>
          <th>Código Automático</th>
          <th>Localização</th>
          <th>Condição</th>
          <th>Valor Est.</th>
          <th>Aquisição</th>
          <th>Ações</th>
        </tr></thead>
        <tbody id="patTableBody"><tr><td colspan="7" class="table-empty"><div class="spinner spinner-sm" style="margin:0 auto"></div></td></tr></tbody></table>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" id="patModal">
      <div class="modal">
        <div class="modal-header">
          <h3 id="patModalTitle" style="font-family:var(--font-serif)">Novo Item de Patrimônio</h3>
          <button class="modal-close" id="closePatModal">✕</button>
        </div>
        <div class="modal-body">
          <!-- Código gerado automaticamente (só leitura) -->
          <div class="pat-code-display" id="codeDisplay">
            <div>
              <div class="code-label">🏷️ Código de Patrimônio (gerado automaticamente)</div>
              <div class="code-value" id="generatedCode">PAT---------</div>
            </div>
          </div>
          <form id="patForm">
            <div class="form-group">
              <label class="form-label">Nome do Bem *</label>
              <input type="text" class="form-control" id="ptName" placeholder="Ex: Projetor Epson, Cadeira, Mesa..." required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Condição</label>
                <select class="form-control" id="ptCondition">
                  <option value="novo">Novo</option>
                  <option value="bom">Bom</option>
                  <option value="regular">Regular</option>
                  <option value="ruim">Ruim</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Valor Estimado (R$)</label>
                <input type="number" class="form-control" id="ptValue" step="0.01" min="0" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Localização</label>
                <input type="text" class="form-control" id="ptLocation" placeholder="Ex: Salão principal, Escritório..." />
              </div>
              <div class="form-group">
                <label class="form-label">Data de Aquisição</label>
                <input type="date" class="form-control" id="ptDate" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Descrição / Observações</label>
              <input type="text" class="form-control" id="ptNotes" placeholder="Modelo, marca, série, etc." />
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelPatBtn">Cancelar</button>
          <button class="btn btn-primary" id="savePatBtn">Registrar Patrimônio</button>
        </div>
      </div>
    </div>
  `);

  if (!churchId) return;

  let allItems = [], editingId = null, pendingCode = null;

  async function loadData() {
    const { data } = await supabase.from('patrimony').select('*').eq('church_id', churchId).order('created_at', { ascending: false });
    allItems = data || [];
    renderStats();
    renderTable();
  }

  function renderStats() {
    const total = allItems.length;
    const totalValue = allItems.reduce((s, i) => s + Number(i.estimated_value || 0), 0);
    const active = allItems.filter(i => i.condition !== 'inativo').length;
    document.getElementById('patStats').innerHTML = `
      <div class="stat-card"><div class="stat-icon stat-icon-primary">📦</div><div class="stat-info"><div class="stat-label">Total Itens</div><div class="stat-value">${total}</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-accent">💰</div><div class="stat-info"><div class="stat-label">Valor Total</div><div class="stat-value">${formatCurrency(totalValue)}</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-success">✅</div><div class="stat-info"><div class="stat-label">Ativos</div><div class="stat-value">${active}</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-danger">⚠️</div><div class="stat-info"><div class="stat-label">Inativos</div><div class="stat-value">${total - active}</div></div></div>
    `;
  }

  function renderTable() {
    const search = ($('#patSearch')?.value || '').toLowerCase();
    const cond = $('#filterCond')?.value || '';
    const filtered = allItems.filter(i => {
      if (search && !`${i.name} ${i.asset_tag} ${i.location} ${i.notes}`.toLowerCase().includes(search)) return false;
      if (cond && i.condition !== cond) return false;
      return true;
    });
    const tbody = $('#patTableBody');
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><span class="table-empty-icon">📦</span><p>Nenhum item registrado</p></td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map(i => `
      <tr>
        <td style="font-weight:600;">${i.name}<br><small style="color:var(--text-muted);font-size:.75rem">${i.notes || ''}</small></td>
        <td><span class="pat-code">${i.asset_tag || '—'}</span></td>
        <td>${i.location || '—'}</td>
        <td>${getStatusBadge(i.condition || 'bom')}</td>
        <td style="font-weight:600;">${formatCurrency(i.estimated_value)}</td>
        <td>${formatDate(i.acquisition_date)}</td>
        <td><div class="table-actions">
          <button class="table-action-btn edit" data-id="${i.id}">✏️</button>
          <button class="table-action-btn delete" data-id="${i.id}">🗑️</button>
        </div></td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.edit').forEach(b => b.addEventListener('click', () => editItem(b.dataset.id)));
    tbody.querySelectorAll('.delete').forEach(b => b.addEventListener('click', () => deleteItem(b.dataset.id)));
  }

  function openModal() {
    editingId = null;
    pendingCode = generateAssetCode(allItems);
    $('#patModalTitle').textContent = 'Novo Item de Patrimônio';
    $('#patForm').reset();
    $('#ptDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('generatedCode').textContent = pendingCode;
    document.getElementById('codeDisplay').style.display = 'flex';
    $('#savePatBtn').textContent = 'Registrar Patrimônio';
    $('#patModal').classList.add('modal-overlay-active');
  }

  function editItem(id) {
    const i = allItems.find(x => x.id === id);
    if (!i) return;
    editingId = id;
    pendingCode = i.asset_tag || generateAssetCode(allItems);
    $('#patModalTitle').textContent = 'Editar Item';
    $('#ptName').value = i.name;
    $('#ptCondition').value = i.condition || 'bom';
    $('#ptValue').value = i.estimated_value || '';
    $('#ptLocation').value = i.location || '';
    $('#ptDate').value = i.acquisition_date || '';
    $('#ptNotes').value = i.notes || '';
    document.getElementById('generatedCode').textContent = pendingCode;
    document.getElementById('codeDisplay').style.display = 'flex';
    $('#savePatBtn').textContent = 'Salvar Alterações';
    $('#patModal').classList.add('modal-overlay-active');
  }

  function closeModal() { $('#patModal').classList.remove('modal-overlay-active'); }

  async function deleteItem(id) {
    if (!await showConfirm('Excluir', 'Excluir este item do patrimônio?')) return;
    await supabase.from('patrimony').delete().eq('id', id);
    showToast('Item excluído', 'success');
    loadData();
  }

  async function saveItem() {
    const name = $('#ptName').value.trim();
    if (!name) { showToast('Nome é obrigatório', 'warning'); return; }

    const data = {
      church_id: churchId,
      name,
      asset_tag: pendingCode,        // código gerado automaticamente
      condition: $('#ptCondition').value,
      estimated_value: parseFloat($('#ptValue').value) || null,
      location: $('#ptLocation').value.trim() || null,
      acquisition_date: $('#ptDate').value || null,
      notes: $('#ptNotes').value.trim() || null
    };

    try {
      if (editingId) {
        await supabase.from('patrimony').update(data).eq('id', editingId);
      } else {
        await supabase.from('patrimony').insert(data);
      }
      showToast('Patrimônio salvo!', 'success');
      closeModal();
      loadData();
    } catch (err) {
      showToast('Erro: ' + err.message, 'error');
    }
  }

  $('#addPatBtn')?.addEventListener('click', openModal);
  $('#closePatModal')?.addEventListener('click', closeModal);
  $('#cancelPatBtn')?.addEventListener('click', closeModal);
  $('#savePatBtn')?.addEventListener('click', saveItem);
  $('#patModal')?.addEventListener('click', e => { if (e.target.id === 'patModal') closeModal(); });
  $('#patSearch')?.addEventListener('input', () => renderTable());
  $('#filterCond')?.addEventListener('change', () => renderTable());

  loadData();
}
