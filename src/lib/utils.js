export function $(selector) {
  return document.querySelector(selector);
}

export function $$(selector) {
  return document.querySelectorAll(selector);
}

export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') el.className = v;
    else if (k === 'innerHTML') el.innerHTML = v;
    else if (k === 'textContent') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v);
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatDate(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short'
  }).format(new Date(date));
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = createElement('div', {
    className: `toast toast-${type}`,
    innerHTML: `
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
      <span>${message}</span>
    `
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function showConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = createElement('div', { className: 'modal-overlay modal-overlay-active' });
    const modal = createElement('div', {
      className: 'modal modal-sm',
      innerHTML: `
        <div class="modal-header">
          <h3>${title}</h3>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirmCancel">Cancelar</button>
          <button class="btn btn-danger" id="confirmOk">Confirmar</button>
        </div>
      `
    });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modal.querySelector('#confirmCancel').onclick = () => { overlay.remove(); resolve(false); };
    modal.querySelector('#confirmOk').onclick = () => { overlay.remove(); resolve(true); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
  });
}

export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function getStatusBadge(status) {
  const map = {
    active: { label: 'Ativo', class: 'badge-success' },
    inactive: { label: 'Inativo', class: 'badge-danger' },
    pending: { label: 'Pendente', class: 'badge-warning' },
    confirmed: { label: 'Confirmado', class: 'badge-success' },
    declined: { label: 'Recusado', class: 'badge-danger' },
    planning: { label: 'Planejamento', class: 'badge-info' },
    completed: { label: 'Concluído', class: 'badge-success' },
    archived: { label: 'Arquivado', class: 'badge-secondary' },
    answered: { label: 'Respondido', class: 'badge-success' },
    batizado: { label: 'Batizado', class: 'badge-success' },
    nao_batizado: { label: 'Não Batizado', class: 'badge-warning' },
    em_preparacao: { label: 'Em Preparação', class: 'badge-info' },
    novo: { label: 'Novo', class: 'badge-success' },
    bom: { label: 'Bom', class: 'badge-info' },
    regular: { label: 'Regular', class: 'badge-warning' },
    ruim: { label: 'Ruim', class: 'badge-danger' },
    inativo: { label: 'Inativo', class: 'badge-secondary' }
  };
  const info = map[status] || { label: status, class: 'badge-secondary' };
  return `<span class="badge ${info.class}">${info.label}</span>`;
}

export function getRoleBadge(role) {
  const map = {
    master: { label: 'Master', class: 'badge-gold' },
    admin: { label: 'Administrador', class: 'badge-primary' },
    leader: { label: 'Líder', class: 'badge-info' },
    member: { label: 'Membro', class: 'badge-secondary' }
  };
  const info = map[role] || { label: role, class: 'badge-secondary' };
  return `<span class="badge ${info.class}">${info.label}</span>`;
}

export function getTypeBadge(type) {
  const map = {
    dizimo: { label: 'Dízimo', class: 'badge-success' },
    oferta: { label: 'Oferta', class: 'badge-info' },
    doacao: { label: 'Doação', class: 'badge-primary' },
    despesa: { label: 'Despesa', class: 'badge-danger' }
  };
  const info = map[type] || { label: type, class: 'badge-secondary' };
  return `<span class="badge ${info.class}">${info.label}</span>`;
}

export function paginate(array, page = 1, perPage = 10) {
  const start = (page - 1) * perPage;
  return {
    data: array.slice(start, start + perPage),
    total: array.length,
    page,
    perPage,
    totalPages: Math.ceil(array.length / perPage)
  };
}
