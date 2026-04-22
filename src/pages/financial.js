import { supabase } from '../lib/supabase.js';
import { renderLayout, getAppState } from '../main.js';
import { $, showToast, showConfirm, formatCurrency, formatDate, getTypeBadge, debounce } from '../lib/utils.js';
import Chart from 'chart.js/auto';
import { jsPDF } from 'jspdf';

let activeTab = 'transactions';
let allTransactions = [];
let allAccounts = [];
let allCategories = [];
let allMembers = [];
let allSuppliers = [];
let currentPage = 1;
const perPage = 15;
let churchId = null;
let currentChurchData = null;

export async function renderFinancial() {
  const { church, profile } = getAppState();
  churchId = church?.id;
  currentChurchData = church;

  if (!['admin','master'].includes(profile?.role)) {
    renderLayout('Financeiro', '', '<div class="empty-state"><span class="empty-state-icon">🔒</span><h3>Acesso Restrito</h3><p>Apenas administradores podem acessar o módulo financeiro.</p></div>');
    return;
  }

  const tabStyles = `
    <style>
      .fin-tabs{display:flex;gap:6px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:8px;overflow-x:auto;-webkit-overflow-scrolling:touch}
      .fin-tab{padding:9px 14px;color:var(--text-secondary);background:0 0;border:none;border-radius:var(--radius-sm);cursor:pointer;font-weight:600;font-family:var(--font-family);transition:var(--transition-fast);white-space:nowrap;font-size:.85rem}
      .fin-tab:hover{background:rgba(255,255,255,.05);color:var(--text-primary)}
      .fin-tab.active{background:linear-gradient(135deg,var(--accent),var(--accent-dark));color:var(--bg-primary)}
      .fin-content{display:none;animation:fadeIn .3s ease}
      .fin-content.active{display:block}
      @media(max-width:768px){
        .page-header{flex-direction:column!important;gap:12px;align-items:flex-start!important}
        .page-header-actions{width:100%}
        .page-header-actions .btn{width:100%}
        .stats-grid{grid-template-columns:1fr 1fr!important}
        .grid-2{grid-template-columns:1fr!important}
        .form-row{flex-direction:column!important}
        .table-toolbar{flex-direction:column!important;gap:10px}
        .table-filters{flex-wrap:wrap;width:100%}
        .table-filters .filter-select,.table-filters .btn{flex:1;min-width:120px}
        .fin-tabs{gap:4px}
        .fin-tab{padding:8px 10px;font-size:.78rem}
        .modal{margin:10px!important;max-width:calc(100vw - 20px)!important}
        .stat-card{padding:12px!important}
        .stat-value{font-size:1.1rem!important}
      }
      @media(max-width:480px){
        .stats-grid{grid-template-columns:1fr!important}
        .table-container{font-size:.8rem}
        th,td{padding:8px 6px!important}
      }
      .sup-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;transition:var(--transition-fast)}
      .sup-card:hover{border-color:var(--accent);box-shadow:var(--glow-accent)}
      .sup-badge{font-size:.65rem;padding:2px 8px;border-radius:var(--radius-full);font-weight:700;text-transform:uppercase}
      .sup-badge.pj{background:var(--info-bg);color:var(--info)}
      .sup-badge.pf{background:var(--warning-bg);color:var(--warning)}
    </style>
  `;

  renderLayout('Tesouraria', 'Gestão avançada de contas, caixas e lançamentos', `
    ${tabStyles}
    <div class="page-header">
      <div class="page-header-info"><h1>💰 Tesouraria & Bancos</h1><p>Consultoria financeira e controle de fluxo</p></div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" id="exportFinBtn">📥 Exportar</button>
      </div>
    </div>
    <div class="fin-tabs">
      <button class="fin-tab active" data-tab="transactions">Transações</button>
      <button class="fin-tab" data-tab="accounts">Contas</button>
      <button class="fin-tab" data-tab="categories">Categorias</button>
      <button class="fin-tab" data-tab="suppliers">Fornecedores</button>
      <button class="fin-tab" data-tab="reconciliation">Conciliação</button>
    </div>

    <!-- TAB: TRANSACTIONS -->
    <div id="tab-transactions" class="fin-content active">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon stat-icon-success"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="stat-info"><div class="stat-label">Entradas</div><div class="stat-value" id="fRevenue">—</div></div></div>
        <div class="stat-card"><div class="stat-icon stat-icon-danger"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg></div><div class="stat-info"><div class="stat-label">Saídas</div><div class="stat-value" id="fExpenses">—</div></div></div>
        <div class="stat-card"><div class="stat-icon stat-icon-accent"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div><div class="stat-info"><div class="stat-label">Resultado</div><div class="stat-value" id="fBalance">—</div></div></div>
        <div class="stat-card"><div class="stat-icon stat-icon-primary"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l2-9 5 18 3-10 4 4 4-4"/></svg></div><div class="stat-info"><div class="stat-label">Operações</div><div class="stat-value" id="fTotal">—</div></div></div>
      </div>
      <div class="table-wrapper">
        <div class="table-toolbar">
          <div class="table-search"><span class="table-search-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span><input type="text" id="finSearch" placeholder="Buscar..." /></div>
          <div class="table-filters">
            <select class="filter-select" id="filterType"><option value="">Todos</option><option value="dizimo">Dízimo</option><option value="oferta">Oferta</option><option value="doacao">Doação</option><option value="despesa">Despesa</option></select>
            <input type="month" class="filter-select" id="filterMonth" style="padding:8px 12px" />
            <button class="btn btn-primary" id="addTransBtn">+ Lançamento</button>
          </div>
        </div>
        <div class="table-container"><table><thead><tr><th>Data</th><th>Tipo</th><th>Conta</th><th>Desc.</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody id="finTableBody"><tr><td colspan="7" class="table-empty"><div class="spinner spinner-sm" style="margin:0 auto"></div></td></tr></tbody></table></div>
        <div class="table-pagination" id="finPagination"></div>
      </div>
    </div>

    <!-- TAB: ACCOUNTS -->
    <div id="tab-accounts" class="fin-content">
      <div class="page-header" style="margin-bottom:20px"><h3 style="font-family:var(--font-serif);font-size:1.3rem">Contas e Caixas</h3><button class="btn btn-primary" id="addAccountBtn">+ Nova Conta</button></div>
      <div class="grid-2" id="accountsGrid"></div>
    </div>

    <!-- TAB: CATEGORIES -->
    <div id="tab-categories" class="fin-content">
      <div class="page-header" style="margin-bottom:20px"><h3 style="font-family:var(--font-serif);font-size:1.3rem">Categorias</h3><button class="btn btn-primary" id="addCategoryBtn">+ Nova</button></div>
      <div class="grid-2" id="categoriesGrid">
        <div class="card"><div class="card-header"><h3 style="color:var(--success)">Receitas</h3></div><div id="catIncomeList"></div></div>
        <div class="card"><div class="card-header"><h3 style="color:var(--danger)">Despesas</h3></div><div id="catExpenseList"></div></div>
      </div>
    </div>

    <!-- TAB: SUPPLIERS -->
    <div id="tab-suppliers" class="fin-content">
      <div class="page-header" style="margin-bottom:20px">
        <div class="page-header-info"><h3 style="font-family:var(--font-serif);font-size:1.3rem">Fornecedores</h3><p>Cadastro de fornecedores PJ e PF</p></div>
        <button class="btn btn-primary" id="addSupplierBtn">+ Novo Fornecedor</button>
      </div>
      <div class="grid-2" id="suppliersGrid"></div>
    </div>

    <!-- TAB: RECONCILIATION -->
    <div id="tab-reconciliation" class="fin-content">
      <div class="page-header" style="margin-bottom:20px">
        <div class="page-header-info"><h3 style="font-family:var(--font-serif);font-size:1.3rem">Conciliação Bancária</h3></div>
        <select class="filter-select" id="recAccountSelect"><option value="">Selecione conta...</option></select>
      </div>
      <div class="card"><div class="table-container"><table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Ação</th></tr></thead><tbody id="recTableBody"><tr><td colspan="4" class="table-empty"><p>Selecione uma conta</p></td></tr></tbody></table></div></div>
    </div>
  `);

  if (!churchId) return;

  document.querySelectorAll('.fin-tab').forEach(btn => {
    btn.addEventListener('click', e => {
      document.querySelectorAll('.fin-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.fin-content').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      activeTab = e.target.dataset.tab;
      document.getElementById(`tab-${activeTab}`).classList.add('active');
    });
  });

  initModals();
  await loadData();
}

// ============ DATA ============
async function loadData() {
  await Promise.all([fetchAccounts(), fetchCategories(), fetchTransactions(), fetchMembers(), fetchSuppliers()]);
  renderAll();
}
async function fetchAccounts() { const { data } = await supabase.from('financial_accounts').select('*').eq('church_id', churchId); allAccounts = data || []; }
async function fetchCategories() { const { data } = await supabase.from('financial_categories').select('*').eq('church_id', churchId); allCategories = data || []; }
async function fetchTransactions() { const { data } = await supabase.from('financial_transactions').select('*, financial_accounts(*), financial_categories(*)').eq('church_id', churchId).order('date', { ascending: false }); allTransactions = data || []; }
async function fetchMembers() { const { data } = await supabase.from('members').select('id, full_name').eq('church_id', churchId).order('full_name'); allMembers = data || []; }
async function fetchSuppliers() { const { data } = await supabase.from('suppliers').select('*').eq('church_id', churchId).order('name'); allSuppliers = data || []; }

function renderAll() { updateStats(); applyFilters(); renderAccounts(); renderCategories(); renderSuppliers(); renderReconciliation(); }

// ============ STATS ============
function updateStats() {
  const now = new Date();
  const ms = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const md = allTransactions.filter(t => t.date >= ms);
  const rev = md.filter(t => t.type !== 'despesa').reduce((s, t) => s + Number(t.amount), 0);
  const exp = md.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0);
  if ($('#fRevenue')) {
    $('#fRevenue').textContent = formatCurrency(rev);
    $('#fExpenses').textContent = formatCurrency(exp);
    $('#fBalance').textContent = formatCurrency(rev - exp);
    $('#fBalance').style.color = rev - exp >= 0 ? 'var(--success)' : 'var(--danger)';
    $('#fTotal').textContent = allTransactions.length;
  }
}

// ============ TRANSACTIONS TABLE ============
function applyFilters() {
  const search = ($('#finSearch')?.value || '').toLowerCase();
  const type = $('#filterType')?.value || '';
  const month = $('#filterMonth')?.value || '';
  let filtered = allTransactions.filter(t => {
    if (search && !`${t.description || ''} ${t.financial_categories?.name || ''} ${t.category || ''}`.toLowerCase().includes(search)) return false;
    if (type && t.type !== type) return false;
    if (month && !t.date.startsWith(month)) return false;
    return true;
  });
  renderTable(filtered);
}

function renderTable(trans) {
  if (!$('#finTableBody')) return;
  const start = (currentPage - 1) * perPage;
  const paged = trans.slice(start, start + perPage);
  const tbody = $('#finTableBody');
  if (!paged.length) { tbody.innerHTML = '<tr><td colspan="7" class="table-empty"><p>Sem transações</p></td></tr>'; return; }
  tbody.innerHTML = paged.map(t => {
    const cat = t.financial_categories?.name || t.category || '';
    const acc = t.financial_accounts?.name || 'Geral';
    const mem = t.member_id ? allMembers.find(m => m.id === t.member_id)?.full_name : '';
    const sup = t.supplier_id ? allSuppliers.find(s => s.id === t.supplier_id)?.name : '';
    const detail = [t.description, mem ? `(${mem})` : '', sup ? `[${sup}]` : ''].filter(Boolean).join(' ');
    const sts = t.status === 'reconciled' ? '<span style="color:var(--success);font-size:.7rem">✓ Conc.</span>' : '<span style="color:var(--warning);font-size:.7rem">Pend.</span>';
    return `<tr>
      <td>${formatDate(t.date)}</td>
      <td><div>${getTypeBadge(t.type)}</div><small style="color:var(--text-muted)">${cat}</small></td>
      <td><small>${acc}</small></td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${detail || '—'}</td>
      <td style="font-weight:700;color:${t.type==='despesa'?'var(--danger)':'var(--success)'}">${t.type==='despesa'?'- ':'+ '}${formatCurrency(t.amount)}</td>
      <td>${sts}</td>
      <td><div class="table-actions"><button class="table-action-btn del-t" data-id="${t.id}">🗑️</button>${['dizimo','oferta'].includes(t.type)?`<button class="table-action-btn pdf-t" data-id="${t.id}">📄</button>`:''}</div></td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('.del-t').forEach(b => b.addEventListener('click', () => deleteTrans(b.dataset.id)));
  tbody.querySelectorAll('.pdf-t').forEach(b => b.addEventListener('click', () => generateReceiptPDF(b.dataset.id)));
}

// ============ ACCOUNTS ============
function renderAccounts() {
  const g = $('#accountsGrid'); if (!g) return;
  if (!allAccounts.length) { g.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>Nenhuma conta cadastrada</p></div>'; return; }
  g.innerHTML = allAccounts.map(a => {
    const at = allTransactions.filter(t => t.account_id === a.id);
    const inc = at.filter(t => t.type !== 'despesa').reduce((s,t) => s + Number(t.amount), 0);
    const exp = at.filter(t => t.type === 'despesa').reduce((s,t) => s + Number(t.amount), 0);
    const bal = Number(a.initial_balance || 0) + inc - exp;
    return `<div class="sup-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div><h4 style="margin:0;font-family:var(--font-serif);color:var(--text-primary)">${a.name}</h4><small style="color:var(--text-muted)">${a.type==='bank'?(a.bank_name||'Banco'):'Caixa Físico'}</small></div><button class="table-action-btn del-acc" data-id="${a.id}">🗑️</button></div><div style="background:rgba(0,0,0,.2);padding:10px;border-radius:var(--radius-sm);display:flex;justify-content:space-between;border:1px solid var(--border)"><span style="color:var(--text-secondary);font-size:.85rem">Saldo</span><span style="font-weight:700;font-size:1.1rem;color:${bal<0?'var(--danger)':'var(--success)'}">${formatCurrency(bal)}</span></div></div>`;
  }).join('');
  g.querySelectorAll('.del-acc').forEach(b => b.addEventListener('click', () => deleteAccount(b.dataset.id)));
}

// ============ CATEGORIES ============
function renderCategories() {
  if (!$('#catIncomeList')) return;
  const mk = c => `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed var(--border)"><span>${c.name}</span><button class="table-action-btn del-cat" data-id="${c.id}" style="color:var(--danger)">✕</button></div>`;
  $('#catIncomeList').innerHTML = allCategories.filter(c=>c.type==='income').map(mk).join('') || '<p class="text-muted">Nenhuma</p>';
  $('#catExpenseList').innerHTML = allCategories.filter(c=>c.type==='expense').map(mk).join('') || '<p class="text-muted">Nenhuma</p>';
  document.querySelectorAll('.del-cat').forEach(b => b.addEventListener('click', () => deleteCategory(b.dataset.id)));
}

// ============ SUPPLIERS ============
function renderSuppliers() {
  const g = $('#suppliersGrid'); if (!g) return;
  if (!allSuppliers.length) { g.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>Nenhum fornecedor cadastrado</p></div>'; return; }
  g.innerHTML = allSuppliers.map(s => {
    const purchases = allTransactions.filter(t => t.supplier_id === s.id);
    const total = purchases.reduce((sum, t) => sum + Number(t.amount), 0);
    return `<div class="sup-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <h4 style="margin:0;font-family:var(--font-serif);color:var(--text-primary);font-size:1.05rem">${s.name}</h4>
            <span class="sup-badge ${s.person_type==='juridica'?'pj':'pf'}">${s.person_type==='juridica'?'PJ':'PF'}</span>
          </div>
          <small style="color:var(--text-muted)">${s.cpf_cnpj || 'Sem documento'}</small>
        </div>
        <button class="table-action-btn del-sup" data-id="${s.id}" style="color:var(--danger)">🗑️</button>
      </div>
      ${s.address ? `<div style="font-size:.8rem;color:var(--text-secondary);margin-bottom:6px">📍 ${s.address}</div>` : ''}
      ${s.contact_phone ? `<div style="font-size:.8rem;color:var(--text-secondary);margin-bottom:8px">📞 ${s.contact_phone} ${s.contact_email ? '| ✉️ '+s.contact_email : ''}</div>` : ''}
      <div style="background:rgba(0,0,0,.2);padding:10px;border-radius:var(--radius-sm);display:flex;justify-content:space-between;border:1px solid var(--border)">
        <div><small style="color:var(--text-muted)">Total Compras</small><div style="font-weight:700;color:var(--danger)">${formatCurrency(total)}</div></div>
        <div style="text-align:right"><small style="color:var(--text-muted)">Qtd.</small><div style="font-weight:700;color:var(--text-primary)">${purchases.length}</div></div>
      </div>
      ${purchases.length ? `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:.8rem;color:var(--accent)">Histórico de compras</summary><div style="max-height:150px;overflow-y:auto;margin-top:6px">${purchases.slice(0,10).map(p=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:.8rem"><span style="color:var(--text-secondary)">${formatDate(p.date)}</span><span style="color:var(--text-muted)">${p.description||'—'}</span><span style="font-weight:600;color:var(--danger)">-${formatCurrency(p.amount)}</span></div>`).join('')}</div></details>` : ''}
    </div>`;
  }).join('');
  g.querySelectorAll('.del-sup').forEach(b => b.addEventListener('click', () => deleteSupplier(b.dataset.id)));
}

// ============ RECONCILIATION ============
function renderReconciliation() {
  const sel = $('#recAccountSelect'); if (!sel) return;
  sel.innerHTML = '<option value="">Selecione conta...</option>' + allAccounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  sel.onchange = () => {
    const id = sel.value, tb = $('#recTableBody');
    if (!id) { tb.innerHTML = '<tr><td colspan="4" class="table-empty"><p>Selecione uma conta</p></td></tr>'; return; }
    const pend = allTransactions.filter(t => t.account_id === id && t.status !== 'reconciled');
    if (!pend.length) { tb.innerHTML = '<tr><td colspan="4" class="table-empty"><p>✓ Tudo conciliado!</p></td></tr>'; return; }
    tb.innerHTML = pend.map(t => `<tr><td>${formatDate(t.date)}</td><td>${getTypeBadge(t.type)} <small>${t.description||''}</small></td><td style="font-weight:700;color:${t.type==='despesa'?'var(--danger)':'var(--success)'}">${formatCurrency(t.amount)}</td><td><button class="btn btn-primary rec-btn" data-id="${t.id}" style="padding:4px 10px;font-size:.75rem;background:var(--success)">✓ Confirmar</button></td></tr>`).join('');
    tb.querySelectorAll('.rec-btn').forEach(b => b.addEventListener('click', () => reconcile(b.dataset.id)));
  };
}
async function reconcile(id) {
  await supabase.from('financial_transactions').update({ status: 'reconciled', reconciliation_date: new Date().toISOString() }).eq('id', id);
  showToast('Conciliado!', 'success'); await fetchTransactions(); renderAll();
  $('#recAccountSelect').dispatchEvent(new Event('change'));
}

// ============ MODALS ============
function initModals() {
  const ex = document.getElementById('advFinModals'); if (ex) ex.remove();
  const div = document.createElement('div'); div.id = 'advFinModals';
  div.innerHTML = `
    <!-- Transaction Modal -->
    <div class="modal-overlay" id="transModal"><div class="modal">
      <div class="modal-header"><h3 id="transModalTitle" style="font-family:var(--font-serif)">Novo Lançamento</h3><button class="modal-close" onclick="document.getElementById('transModal').classList.remove('modal-overlay-active')">✕</button></div>
      <div class="modal-body"><form id="transForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Tipo *</label><select class="form-control" id="tType"><option value="dizimo">Dízimo</option><option value="oferta">Oferta</option><option value="doacao">Doação</option><option value="despesa">Despesa</option></select></div>
          <div class="form-group"><label class="form-label">Valor (R$) *</label><input type="number" class="form-control" id="tAmount" step="0.01" min="0.01" required /></div>
        </div>
        <div class="form-group" id="memberFieldRow" style="display:block"><label class="form-label">👤 Membro *</label><select class="form-control" id="tMember"><option value="">— Selecione —</option></select></div>
        <div class="form-group" id="supplierFieldRow" style="display:none"><label class="form-label">🏢 Fornecedor *</label><select class="form-control" id="tSupplier"><option value="">— Selecione —</option></select></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Data *</label><input type="date" class="form-control" id="tDate" required /></div>
          <div class="form-group"><label class="form-label">Conta *</label><select class="form-control" id="tAccount"></select></div>
        </div>
        <div class="form-group"><label class="form-label">Categoria</label><select class="form-control" id="tCategory"></select></div>
        <div class="form-group"><label class="form-label">Descrição</label><input type="text" class="form-control" id="tDescription" placeholder="Detalhes" /></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="document.getElementById('transModal').classList.remove('modal-overlay-active')">Cancelar</button><button class="btn btn-primary" id="saveTransBtnX">Efetivar</button></div>
    </div></div>

    <!-- Account Modal -->
    <div class="modal-overlay" id="accModal"><div class="modal" style="max-width:420px">
      <div class="modal-header"><h3 style="font-family:var(--font-serif)">Nova Conta</h3><button class="modal-close" onclick="document.getElementById('accModal').classList.remove('modal-overlay-active')">✕</button></div>
      <div class="modal-body"><form id="accForm">
        <div class="form-group"><label class="form-label">Tipo</label><select class="form-control" id="aType"><option value="cash">Caixa Físico</option><option value="bank">Conta Bancária</option></select></div>
        <div class="form-group"><label class="form-label">Nome *</label><input class="form-control" id="aName" required /></div>
        <div class="form-group" id="bankFields" style="display:none"><label class="form-label">Banco</label><input class="form-control" id="aBank"/></div>
        <div class="form-group"><label class="form-label">Saldo Inicial</label><input type="number" class="form-control" id="aBal" step="0.01" value="0" /></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-primary" id="saveAccBtnX" style="width:100%">Criar</button></div>
    </div></div>

    <!-- Category Modal -->
    <div class="modal-overlay" id="catModal"><div class="modal" style="max-width:420px">
      <div class="modal-header"><h3 style="font-family:var(--font-serif)">Nova Categoria</h3><button class="modal-close" onclick="document.getElementById('catModal').classList.remove('modal-overlay-active')">✕</button></div>
      <div class="modal-body"><form id="catForm">
        <div class="form-group"><label class="form-label">Natureza</label><select class="form-control" id="cType"><option value="expense">Despesa</option><option value="income">Receita</option></select></div>
        <div class="form-group"><label class="form-label">Nome *</label><input class="form-control" id="cName" required /></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-primary" id="saveCatBtnX" style="width:100%">Criar</button></div>
    </div></div>

    <!-- Supplier Modal -->
    <div class="modal-overlay" id="supModal"><div class="modal" style="max-width:500px">
      <div class="modal-header"><h3 style="font-family:var(--font-serif)">Novo Fornecedor</h3><button class="modal-close" onclick="document.getElementById('supModal').classList.remove('modal-overlay-active')">✕</button></div>
      <div class="modal-body"><form id="supForm">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Tipo Pessoa</label><select class="form-control" id="sPersonType"><option value="juridica">Pessoa Jurídica (PJ)</option><option value="fisica">Pessoa Física (PF)</option></select></div>
          <div class="form-group"><label class="form-label" id="sDocLabel">CNPJ</label><input class="form-control" id="sCpfCnpj" placeholder="00.000.000/0001-00" /></div>
        </div>
        <div class="form-group"><label class="form-label">Nome / Razão Social *</label><input class="form-control" id="sName" required /></div>
        <div class="form-group"><label class="form-label">Endereço</label><input class="form-control" id="sAddress" placeholder="Rua, Número, Bairro, Cidade - UF" /></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="sPhone" /></div>
          <div class="form-group"><label class="form-label">E-mail</label><input class="form-control" id="sEmail" type="email" /></div>
        </div>
        <div class="form-group"><label class="form-label">Observações</label><input class="form-control" id="sNotes" /></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-primary" id="saveSupBtnX" style="width:100%">Cadastrar Fornecedor</button></div>
    </div></div>
  `;
  document.body.appendChild(div);

  // Bind events
  document.getElementById('saveTransBtnX').addEventListener('click', saveTrans);
  document.getElementById('tType').addEventListener('change', e => { toggleDynamicFields(e.target.value); popCategories(e.target.value); });
  document.getElementById('aType').addEventListener('change', e => { document.getElementById('bankFields').style.display = e.target.value === 'bank' ? 'block' : 'none'; });
  document.getElementById('saveAccBtnX').addEventListener('click', saveAccount);
  document.getElementById('saveCatBtnX').addEventListener('click', saveCategory);
  document.getElementById('saveSupBtnX').addEventListener('click', saveSupplier);
  document.getElementById('sPersonType').addEventListener('change', e => {
    document.getElementById('sDocLabel').textContent = e.target.value === 'juridica' ? 'CNPJ' : 'CPF';
    document.getElementById('sCpfCnpj').placeholder = e.target.value === 'juridica' ? '00.000.000/0001-00' : '000.000.000-00';
  });

  setTimeout(() => {
    $('#addTransBtn')?.addEventListener('click', openTransModal);
    $('#addAccountBtn')?.addEventListener('click', () => { document.getElementById('accForm').reset(); document.getElementById('accModal').classList.add('modal-overlay-active'); });
    $('#addCategoryBtn')?.addEventListener('click', () => { document.getElementById('catForm').reset(); document.getElementById('catModal').classList.add('modal-overlay-active'); });
    $('#addSupplierBtn')?.addEventListener('click', () => { document.getElementById('supForm').reset(); document.getElementById('supModal').classList.add('modal-overlay-active'); });
    $('#finSearch')?.addEventListener('input', debounce(() => { currentPage = 1; applyFilters(); }));
    $('#filterType')?.addEventListener('change', () => { currentPage = 1; applyFilters(); });
    $('#filterMonth')?.addEventListener('change', () => { currentPage = 1; applyFilters(); });
    $('#exportFinBtn')?.addEventListener('click', exportCSV);
  }, 100);
}

function toggleDynamicFields(type) {
  document.getElementById('memberFieldRow').style.display = ['dizimo','oferta'].includes(type) ? 'block' : 'none';
  document.getElementById('supplierFieldRow').style.display = type === 'despesa' ? 'block' : 'none';
}

function popCategories(t) {
  const isExp = t === 'despesa';
  const cats = allCategories.filter(c => c.type === (isExp ? 'expense' : 'income'));
  document.getElementById('tCategory').innerHTML = '<option value="">(Sem categoria)</option>' + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function openTransModal() {
  document.getElementById('transModalTitle').textContent = 'Novo Lançamento';
  document.getElementById('transForm').reset();
  document.getElementById('tDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('tAccount').innerHTML = allAccounts.length ? allAccounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('') : '<option value="">Crie uma conta primeiro</option>';
  document.getElementById('tMember').innerHTML = '<option value="">— Selecione —</option>' + allMembers.map(m => `<option value="${m.id}">${m.full_name}</option>`).join('');
  document.getElementById('tSupplier').innerHTML = '<option value="">— Selecione —</option>' + allSuppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  toggleDynamicFields('dizimo');
  popCategories('dizimo');
  document.getElementById('transModal').classList.add('modal-overlay-active');
}

// ============ SAVE OPERATIONS ============
async function saveTrans() {
  const type = document.getElementById('tType').value;
  const amount = parseFloat(document.getElementById('tAmount').value);
  const date = document.getElementById('tDate').value;
  const accountId = document.getElementById('tAccount').value || null;
  const memberId = document.getElementById('tMember').value || null;
  const supplierId = document.getElementById('tSupplier').value || null;
  if (!amount || !date || !accountId) { showToast('Preencha campos obrigatórios', 'warning'); return; }
  if (['dizimo','oferta'].includes(type) && !memberId) { showToast('Selecione o membro', 'warning'); return; }
  if (type === 'despesa' && !supplierId) { showToast('Selecione o fornecedor', 'warning'); return; }

  const data = { church_id: churchId, type, amount, date, account_id: accountId, category_id: document.getElementById('tCategory').value || null, description: document.getElementById('tDescription').value || null, member_id: memberId, supplier_id: supplierId, status: 'pending' };
  try {
    const { data: ins, error } = await supabase.from('financial_transactions').insert(data).select().single();
    if (error) throw error;
    showToast('Lançamento efetivado!', 'success');
    document.getElementById('transModal').classList.remove('modal-overlay-active');
    if (type === 'dizimo' && ins) {
      const mem = allMembers.find(m => m.id === memberId);
      if (mem) setTimeout(() => genPDF({ memberName: mem.full_name, amount, date, type: 'Dízimo' }), 300);
    }
    await fetchTransactions(); renderAll();
  } catch (err) { showToast('Erro: ' + err.message, 'error'); }
}

async function deleteTrans(id) {
  if (!await showConfirm('Excluir', 'Confirmar exclusão?')) return;
  await supabase.from('financial_transactions').delete().eq('id', id);
  showToast('Excluído', 'success'); await fetchTransactions(); renderAll();
}

async function saveAccount() {
  const d = { church_id: churchId, name: document.getElementById('aName').value, type: document.getElementById('aType').value, bank_name: document.getElementById('aBank').value || null, initial_balance: parseFloat(document.getElementById('aBal').value || 0) };
  if (!d.name) { showToast('Nome obrigatório', 'warning'); return; }
  const { error } = await supabase.from('financial_accounts').insert(d);
  if (error) { showToast('Erro', 'error'); return; }
  showToast('Conta criada!', 'success'); document.getElementById('accModal').classList.remove('modal-overlay-active');
  await fetchAccounts(); renderAll();
}
async function deleteAccount(id) {
  if (!await showConfirm('Excluir Conta', 'Transações vinculadas serão removidas. Confirmar?')) return;
  await supabase.from('financial_accounts').delete().eq('id', id);
  await fetchAccounts(); await fetchTransactions(); renderAll();
}

async function saveCategory() {
  const d = { church_id: churchId, name: document.getElementById('cName').value, type: document.getElementById('cType').value };
  if (!d.name) { showToast('Nome obrigatório', 'warning'); return; }
  const { error } = await supabase.from('financial_categories').insert(d);
  if (error) { showToast('Erro', 'error'); return; }
  showToast('Categoria criada!', 'success'); document.getElementById('catModal').classList.remove('modal-overlay-active');
  await fetchCategories(); renderAll();
}
async function deleteCategory(id) {
  const { error } = await supabase.from('financial_categories').delete().eq('id', id);
  if (error) { showToast('Em uso, não pode excluir', 'error'); return; }
  await fetchCategories(); renderAll();
}

async function saveSupplier() {
  const d = { church_id: churchId, person_type: document.getElementById('sPersonType').value, name: document.getElementById('sName').value, cpf_cnpj: document.getElementById('sCpfCnpj').value || null, address: document.getElementById('sAddress').value || null, contact_phone: document.getElementById('sPhone').value || null, contact_email: document.getElementById('sEmail').value || null, notes: document.getElementById('sNotes').value || null };
  if (!d.name) { showToast('Nome obrigatório', 'warning'); return; }
  const { error } = await supabase.from('suppliers').insert(d);
  if (error) { showToast('Erro: ' + error.message, 'error'); return; }
  showToast('Fornecedor cadastrado!', 'success'); document.getElementById('supModal').classList.remove('modal-overlay-active');
  await fetchSuppliers(); renderAll();
}
async function deleteSupplier(id) {
  if (!await showConfirm('Excluir Fornecedor', 'Confirmar?')) return;
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) { showToast('Não é possível. Existem compras vinculadas.', 'error'); return; }
  await fetchSuppliers(); renderAll();
}

function exportCSV() {
  if (!allTransactions.length) { showToast('Sem dados', 'warning'); return; }
  const h = ['Data','Tipo','Categoria','Descrição','Valor'];
  const r = allTransactions.map(t => [t.date, t.type, t.financial_categories?.name || '', t.description || '', t.amount]);
  const csv = [h, ...r].map(row => row.map(c => `"${c||''}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `financeiro_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  showToast('Exportado', 'success');
}

// ============ PDF RECEIPT (White Background - Ink Economy) ============
function generateReceiptPDF(tid) {
  const t = allTransactions.find(x => x.id === tid);
  if (!t) return;
  const mem = allMembers.find(m => m.id === t.member_id);
  genPDF({ memberName: mem?.full_name || t.description || 'Membro', amount: Number(t.amount), date: t.date, type: t.type === 'dizimo' ? 'Dízimo' : 'Oferta' });
}

function genPDF({ memberName, amount, date, type }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const ch = currentChurchData || {};
  const churchName = ch.name || 'Igreja';
  const churchAddr = ch.address || '';
  const churchCnpj = ch.cnpj || '';
  const churchPhone = ch.contact_phone || '';
  const churchEmail = ch.contact_email || '';
  const leaderName = ch.leader_name || '';
  const logoUrl = ch.logo_url || '';

  const verses = [
    { text: '"Trazei todos os dízimos à casa do tesouro, para que haja mantimento na minha casa, e provai-me nisto, diz o Senhor dos Exércitos, se eu não vos abrir as janelas do céu e não derramar sobre vós uma bênção tal, que dela vos advenha a maior abastança."', ref: '— Malaquias 3:10' },
    { text: '"Cada um contribua segundo propôs no seu coração; não com tristeza, ou por necessidade; porque Deus ama ao que dá com alegria."', ref: '— 2 Coríntios 9:7' },
    { text: '"Honra ao Senhor com os teus bens e com as primícias de toda a tua renda; e se encherão os teus celeiros."', ref: '— Provérbios 3:9-10' },
    { text: '"Dai, e ser-vos-á dado; boa medida, recalcada, sacudida e transbordando vos deitarão no vosso regaço."', ref: '— Lucas 6:38' },
    { text: '"Porque onde estiver o vosso tesouro, aí estará também o vosso coração."', ref: '— Mateus 6:21' },
  ];
  const verse = verses[Math.floor(Math.random() * verses.length)];
  const fDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  const fAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

  // ============ WHITE BACKGROUND ============
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, 'F');

  // ============ TOP BORDER (Gold line) ============
  doc.setDrawColor(180, 144, 42);
  doc.setLineWidth(1.2);
  doc.line(10, 10, w - 10, 10);
  doc.setLineWidth(0.3);
  doc.line(10, 12, w - 10, 12);

  // ============ LOGO OR FALLBACK ============
  let logoY = 18;
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'AUTO', w / 2 - 12, logoY, 24, 24);
      logoY += 28;
    } catch (e) {
      // Fallback: draw text initials
      doc.setFillColor(180, 144, 42);
      doc.circle(w / 2, logoY + 10, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(churchName.substring(0, 2).toUpperCase(), w / 2, logoY + 13, { align: 'center' });
      logoY += 26;
    }
  } else {
    // Golden circle with initials
    doc.setFillColor(180, 144, 42);
    doc.circle(w / 2, logoY + 10, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(churchName.substring(0, 2).toUpperCase(), w / 2, logoY + 13, { align: 'center' });
    logoY += 26;
  }

  // ============ CHURCH NAME ============
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(30, 30, 30);
  doc.text(churchName.toUpperCase(), w / 2, logoY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  let infoY = logoY + 5;
  if (churchAddr) { doc.text(churchAddr, w / 2, infoY, { align: 'center' }); infoY += 4; }
  if (churchCnpj) { doc.text('CNPJ: ' + churchCnpj, w / 2, infoY, { align: 'center' }); infoY += 4; }
  const contact = [churchPhone, churchEmail].filter(Boolean).join(' | ');
  if (contact) { doc.text(contact, w / 2, infoY, { align: 'center' }); infoY += 4; }

  // ============ SEPARATOR ============
  const sepY = infoY + 3;
  doc.setDrawColor(180, 144, 42);
  doc.setLineWidth(0.3);
  doc.line(20, sepY, w / 2 - 6, sepY);
  doc.line(w / 2 + 6, sepY, w - 20, sepY);
  // Diamond
  doc.setFillColor(180, 144, 42);
  doc.triangle(w / 2, sepY - 2, w / 2 + 2, sepY, w / 2, sepY + 2, 'F');
  doc.triangle(w / 2, sepY - 2, w / 2 - 2, sepY, w / 2, sepY + 2, 'F');

  // ============ TITLE ============
  const titleY = sepY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(`RECIBO DE ${type.toUpperCase()}`, w / 2, titleY, { align: 'center' });

  // ============ BODY CARD ============
  const cardY = titleY + 8;
  const cardH = 48;
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, cardY, w - 28, cardH, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('RECEBEMOS DE', 22, cardY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text(memberName, 22, cardY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('REFERENTE AO ' + type.toUpperCase() + ' NO VALOR DE', 22, cardY + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(180, 144, 42);
  doc.text(fAmount, 22, cardY + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('DATA', w - 22, cardY + 9, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text(fDate, w - 22, cardY + 17, { align: 'right' });

  // ============ VERSE ============
  const vY = cardY + cardH + 12;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  const sv = doc.splitTextToSize(verse.text, w - 40);
  doc.text(sv, w / 2, vY, { align: 'center' });
  const refY = vY + sv.length * 3.5 + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 144, 42);
  doc.text(verse.ref, w / 2, refY, { align: 'center' });

  // ============ SIGNATURES ============
  const sigY = refY + 16;
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.3);
  doc.line(20, sigY, w / 2 - 8, sigY);
  doc.line(w / 2 + 8, sigY, w - 20, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text(leaderName || 'Tesoureiro(a)', (20 + w / 2 - 8) / 2, sigY + 4, { align: 'center' });
  doc.text('Responsável', (w / 2 + 8 + w - 20) / 2, sigY + 4, { align: 'center' });

  // ============ BOTTOM BORDER ============
  doc.setDrawColor(180, 144, 42);
  doc.setLineWidth(0.3);
  doc.line(10, h - 12, w - 10, h - 12);
  doc.setLineWidth(1.2);
  doc.line(10, h - 10, w - 10, h - 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(160, 160, 160);
  doc.text('Documento gerado pelo sistema Control Igreja', w / 2, h - 6, { align: 'center' });

  // ============ OPEN ============
  window.open(URL.createObjectURL(doc.output('blob')), '_blank');
  showToast('Recibo PDF gerado!', 'success');
}
