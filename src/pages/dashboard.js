import { supabase } from '../lib/supabase.js';
import { renderLayout, getAppState } from '../main.js';
import { formatCurrency, formatDate } from '../lib/utils.js';
import Chart from 'chart.js/auto';
import { jsPDF } from 'jspdf';

let charts = [];

function destroyCharts() {
  charts.forEach(c => c.destroy());
  charts = [];
}

/** Returns all active members whose birth_date falls in the given month (1-12) */
function filterBirthdaysByMonth(members, month) {
  return members.filter(m => {
    if (!m.birth_date) return false;
    const d = new Date(m.birth_date + 'T00:00:00');
    return d.getMonth() + 1 === month;
  }).sort((a, b) => {
    const da = new Date(a.birth_date + 'T00:00:00').getDate();
    const db = new Date(b.birth_date + 'T00:00:00').getDate();
    return da - db;
  });
}

/** Returns members whose birthday falls within the current week (Mon-Sun) */
function filterBirthdaysByWeek(members) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return members.filter(m => {
    if (!m.birth_date) return false;
    const bd = new Date(m.birth_date + 'T00:00:00');
    // Build a date in the current year with the birthday month/day
    const thisYearBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
    return thisYearBd >= monday && thisYearBd <= sunday;
  }).sort((a, b) => {
    const da = new Date(a.birth_date + 'T00:00:00').getDate();
    const db = new Date(b.birth_date + 'T00:00:00').getDate();
    return da - db;
  });
}

function calcAge(birthDate) {
  const today = new Date();
  const bd = new Date(birthDate + 'T00:00:00');
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
}

function getMonthName(month) {
  const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return names[month - 1];
}

function renderBirthdayRow(m) {
  const bd = new Date(m.birth_date + 'T00:00:00');
  const day = bd.getDate().toString().padStart(2, '0');
  const monthShort = bd.toLocaleString('pt-BR', { month: 'short' });
  const age = calcAge(m.birth_date);
  const initials = (m.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const today = new Date();
  const isToday = bd.getDate() === today.getDate() && bd.getMonth() === today.getMonth();

  return `
    <div class="birthday-item ${isToday ? 'birthday-today' : ''}">
      <div class="birthday-date-badge">
        <span class="birthday-day">${day}</span>
        <span class="birthday-month">${monthShort}</span>
      </div>
      <div class="birthday-avatar">${initials}</div>
      <div class="birthday-info">
        <div class="birthday-name">${m.full_name}${isToday ? ' <span class="birthday-today-tag">🎂 Hoje!</span>' : ''}</div>
        <div class="birthday-age">${age >= 0 ? `Completará ${age + (bd.getMonth() > today.getMonth() || (bd.getMonth() === today.getMonth() && bd.getDate() >= today.getDate()) ? 1 : 0)} anos` : ''}</div>
      </div>
      ${m.phone ? `<a href="https://wa.me/55${m.phone.replace(/\D/g, '')}" target="_blank" class="birthday-whatsapp" title="Parabenizar via WhatsApp">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>` : ''}
    </div>
  `;
}

function renderBirthdayEmpty(message) {
  return `
    <div class="birthday-empty">
      <div class="birthday-empty-icon">🎂</div>
      <p>${message}</p>
    </div>
  `;
}

function renderBirthdayList(container, members, mode) {
  if (mode === 'weekly') {
    const weekMembers = filterBirthdaysByWeek(members);
    container.innerHTML = weekMembers.length
      ? weekMembers.map(renderBirthdayRow).join('')
      : renderBirthdayEmpty('Nenhum aniversariante esta semana');
  } else {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const monthMembers = filterBirthdaysByMonth(members, currentMonth);
    container.innerHTML = monthMembers.length
      ? monthMembers.map(renderBirthdayRow).join('')
      : renderBirthdayEmpty(`Nenhum aniversariante em ${getMonthName(currentMonth)}`);
  }
}

async function generateBirthdayPDF(members, mode, churchName) {
  const doc = new jsPDF();
  const now = new Date();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(10, 25, 47);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Header gold accent line
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 45, pageWidth, 2, 'F');

  // Decorative circle (cake icon substitute)
  doc.setFillColor(212, 175, 55);
  doc.circle(pageWidth / 2, 14, 4, 'F');
  doc.setFillColor(10, 25, 47);
  doc.circle(pageWidth / 2, 14, 2.5, 'F');
  doc.setFillColor(212, 175, 55);
  doc.rect(pageWidth / 2 - 0.4, 10, 0.8, 2, 'F');

  // Title
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ANIVERSARIANTES', pageWidth / 2, 24, { align: 'center' });

  // Subtitle
  doc.setTextColor(200, 210, 220);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const subtitle = mode === 'weekly'
    ? 'Semana Atual - ' + now.toLocaleDateString('pt-BR')
    : getMonthName(now.getMonth() + 1) + ' de ' + now.getFullYear();
  doc.text(subtitle, pageWidth / 2, 32, { align: 'center' });

  if (churchName) {
    doc.setFontSize(9);
    doc.setTextColor(160, 176, 196);
    doc.text(churchName, pageWidth / 2, 40, { align: 'center' });
  }

  // Filter members
  const filtered = mode === 'weekly'
    ? filterBirthdaysByWeek(members)
    : filterBirthdaysByMonth(members, now.getMonth() + 1);

  if (!filtered.length) {
    doc.setFontSize(13);
    doc.setTextColor(90, 100, 120);
    doc.text('Nenhum aniversariante encontrado.', pageWidth / 2, 70, { align: 'center' });
    doc.save('aniversariantes_' + mode + '_' + now.toISOString().split('T')[0] + '.pdf');
    return;
  }

  // Table header
  let y = 57;

  function drawTableHeader() {
    doc.setFillColor(15, 25, 45);
    doc.rect(14, y, pageWidth - 28, 10, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(212, 175, 55);
    doc.text('DIA', 20, y + 7);
    doc.text('NOME', 42, y + 7);
    doc.text('IDADE', 130, y + 7);
    doc.text('TELEFONE', 158, y + 7);
    y += 14;
  }

  drawTableHeader();

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  filtered.forEach((m, i) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
      drawTableHeader();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
    }

    // Alternate row backgrounds
    if (i % 2 === 0) {
      doc.setFillColor(240, 242, 245);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(14, y - 4, pageWidth - 28, 10, 'F');

    const bd = new Date(m.birth_date + 'T00:00:00');
    const day = bd.getDate().toString().padStart(2, '0') + '/' + (bd.getMonth() + 1).toString().padStart(2, '0');
    const age = calcAge(m.birth_date);
    const nextAge = age + (bd.getMonth() > now.getMonth() || (bd.getMonth() === now.getMonth() && bd.getDate() >= now.getDate()) ? 1 : 0);

    // Highlight today's birthday
    const isToday = bd.getDate() === now.getDate() && bd.getMonth() === now.getMonth();
    if (isToday) {
      doc.setFillColor(255, 248, 220);
      doc.rect(14, y - 4, pageWidth - 28, 10, 'F');
      doc.setFillColor(212, 175, 55);
      doc.rect(14, y - 4, 2, 10, 'F');
    }

    doc.setTextColor(60, 70, 80);
    doc.setFont('helvetica', 'bold');
    doc.text(day, 20, y + 3);
    doc.setFont('helvetica', 'normal');
    const nameText = (m.full_name || '-') + (isToday ? ' *HOJE*' : '');
    doc.text(nameText, 42, y + 3);
    doc.text(nextAge + ' anos', 130, y + 3);
    doc.text((m.phone || '-').replace(/[^\d\s()+-]/g, ''), 158, y + 3);

    y += 10;
  });

  // Footer separator
  y += 8;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(120, 130, 150);
  doc.text('Total: ' + filtered.length + ' aniversariante(s)', 20, y);

  const dataGerado = 'Gerado em ' + now.toLocaleDateString('pt-BR') + ' as ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.text(dataGerado, pageWidth - 20, y, { align: 'right' });

  // Footer branding
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(160, 170, 185);
  doc.setTextColor(160, 170, 185);
  doc.text('Control Igreja - Sistema de Gestao Integrada', pageWidth / 2, pageH - 8, { align: 'center' });

  // Use datauristring for maximum cross-browser compatibility
  const fileName = 'aniversariantes_' + mode + '.pdf';
  try {
    // Attempt standard save first
    doc.save(fileName);
  } catch (e) {
    // Fallback if standard save fails on specific browsers
    const dataUri = doc.output('datauristring');
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export async function renderDashboard() {
  const { profile, church } = getAppState();
  const churchId = church?.id;

  renderLayout('Dashboard', 'Visão geral da sua igreja', `
    <div class="stats-grid" id="statsGrid">
      <div class="stat-card"><div class="stat-icon stat-icon-primary">👥</div><div class="stat-info"><div class="stat-label">Total Membros</div><div class="stat-value" id="statMembers">—</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-success">💰</div><div class="stat-info"><div class="stat-label">Receita do Mês</div><div class="stat-value" id="statRevenue">—</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-danger">📉</div><div class="stat-info"><div class="stat-label">Despesas do Mês</div><div class="stat-value" id="statExpenses">—</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon-accent">📅</div><div class="stat-info"><div class="stat-label">Próximos Eventos</div><div class="stat-value" id="statEvents">—</div></div></div>
    </div>

    <!-- Birthday Section -->
    <div class="card birthday-card mb-3" id="birthdaySection">
      <div class="card-header">
        <h3>🎂 Aniversariantes</h3>
        <div class="birthday-actions">
          <div class="birthday-tabs">
            <button class="birthday-tab active" data-mode="monthly" id="btnMonthly">📅 Mensal</button>
            <button class="birthday-tab" data-mode="weekly" id="btnWeekly">📆 Semanal</button>
          </div>
          <button class="btn btn-sm btn-secondary" id="btnExportBirthdayPDF" title="Exportar PDF">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar PDF
          </button>
        </div>
      </div>
      <div class="birthday-subtitle" id="birthdaySubtitle"></div>
      <div class="birthday-list" id="birthdayList">
        <div class="loading-text"><div class="spinner spinner-sm" style="margin:0 auto"></div></div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h3>💰 Receitas vs Despesas (Últimos 6 meses)</h3>
        <div class="chart-container"><canvas id="financeChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>👥 Crescimento de Membros</h3>
        <div class="chart-container"><canvas id="membersChart"></canvas></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>📅 Próximos Eventos</h3></div>
        <div id="upcomingEvents"><div class="loading-text"><div class="spinner spinner-sm" style="margin:0 auto"></div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>🆕 Membros Recentes</h3></div>
        <div id="recentMembers"><div class="loading-text"><div class="spinner spinner-sm" style="margin:0 auto"></div></div></div>
      </div>
    </div>
  `);

  if (!churchId) return;

  destroyCharts();

  // Load stats
  try {
    const [membersRes, revenueRes, expensesRes, eventsRes] = await Promise.all([
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('church_id', churchId).eq('status', 'active'),
      supabase.from('financial_transactions').select('amount').eq('church_id', churchId).in('type', ['dizimo','oferta','doacao']).gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
      supabase.from('financial_transactions').select('amount').eq('church_id', churchId).eq('type', 'despesa').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('church_id', churchId).gte('date', new Date().toISOString())
    ]);

    const totalMembers = membersRes.count || 0;
    const totalRevenue = (revenueRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
    const totalExpenses = (expensesRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
    const totalEvents = eventsRes.count || 0;

    document.getElementById('statMembers').textContent = totalMembers;
    document.getElementById('statRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('statExpenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('statEvents').textContent = totalEvents;
  } catch (e) {
    console.error('Stats error:', e);
  }

  // Load birthdays
  let birthdayMembers = [];
  let currentBirthdayMode = 'monthly';
  try {
    const { data } = await supabase
      .from('members')
      .select('id, full_name, birth_date, phone, photo_url')
      .eq('church_id', churchId)
      .eq('status', 'active')
      .not('birth_date', 'is', null);
    birthdayMembers = data || [];

    const listContainer = document.getElementById('birthdayList');
    const subtitleEl = document.getElementById('birthdaySubtitle');
    const now = new Date();

    // Initial render
    function updateBirthdayView(mode) {
      currentBirthdayMode = mode;
      if (mode === 'weekly') {
        subtitleEl.textContent = `Semana atual — ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
      } else {
        subtitleEl.textContent = `${getMonthName(now.getMonth() + 1)} de ${now.getFullYear()} — ${filterBirthdaysByMonth(birthdayMembers, now.getMonth() + 1).length} aniversariante(s)`;
      }
      renderBirthdayList(listContainer, birthdayMembers, mode);
    }

    updateBirthdayView('monthly');

    // Tab switching
    const btnMonthly = document.getElementById('btnMonthly');
    const btnWeekly = document.getElementById('btnWeekly');

    btnMonthly?.addEventListener('click', () => {
      btnMonthly.classList.add('active');
      btnWeekly.classList.remove('active');
      updateBirthdayView('monthly');
    });

    btnWeekly?.addEventListener('click', () => {
      btnWeekly.classList.add('active');
      btnMonthly.classList.remove('active');
      updateBirthdayView('weekly');
    });

    // PDF Export
    document.getElementById('btnExportBirthdayPDF')?.addEventListener('click', () => {
      generateBirthdayPDF(birthdayMembers, currentBirthdayMode, church?.name || '');
    });

  } catch (e) { console.error('Birthday error:', e); }

  // Load upcoming events
  try {
    const { data: events } = await supabase.from('events').select('*').eq('church_id', churchId).gte('date', new Date().toISOString()).order('date').limit(5);
    const container = document.getElementById('upcomingEvents');
    if (events?.length) {
      container.innerHTML = events.map(ev => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
          <div style="width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(var(--accent-rgb),0.12);display:flex;align-items:center;justify-content:center;font-size:0.82rem;color:var(--accent);flex-shrink:0;">
            ${new Date(ev.date).getDate()}<br><span style="font-size:0.65rem;">${new Date(ev.date).toLocaleString('pt-BR',{month:'short'})}</span>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ev.title}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${ev.location || 'Local não definido'}</div>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p class="text-muted" style="padding:16px 0;text-align:center;">Nenhum evento próximo</p>';
    }
  } catch (e) { console.error(e); }

  // Load recent members
  try {
    const { data: members } = await supabase.from('members').select('*').eq('church_id', churchId).order('created_at', { ascending: false }).limit(5);
    const container = document.getElementById('recentMembers');
    if (members?.length) {
      container.innerHTML = members.map(m => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
          <div class="sidebar-avatar" style="width:36px;height:36px;font-size:0.78rem;">${(m.full_name || '?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.88rem;">${m.full_name}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">Desde ${formatDate(m.member_since)}</div>
          </div>
          ${m.status === 'active' ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>'}
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p class="text-muted" style="padding:16px 0;text-align:center;">Nenhum membro cadastrado</p>';
    }
  } catch (e) { console.error(e); }

  // Finance chart
  try {
    const months = [];
    const revenues = [];
    const expenses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      months.push(d.toLocaleString('pt-BR', { month: 'short' }));

      const { data: rev } = await supabase.from('financial_transactions').select('amount').eq('church_id', churchId).in('type', ['dizimo','oferta','doacao']).gte('date', start).lte('date', end);
      const { data: exp } = await supabase.from('financial_transactions').select('amount').eq('church_id', churchId).eq('type', 'despesa').gte('date', start).lte('date', end);
      revenues.push((rev || []).reduce((s, r) => s + Number(r.amount), 0));
      expenses.push((exp || []).reduce((s, r) => s + Number(r.amount), 0));
    }

    const ctx = document.getElementById('financeChart');
    if (ctx) {
      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            { label: 'Receitas', data: revenues, backgroundColor: 'rgba(46, 204, 113, 0.7)', borderRadius: 6 },
            { label: 'Despesas', data: expenses, backgroundColor: 'rgba(231, 76, 60, 0.7)', borderRadius: 6 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#8899AA', font: { family: 'Inter' } } } },
          scales: {
            x: { ticks: { color: '#5C6F82' }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#5C6F82', callback: v => 'R$ ' + v.toLocaleString('pt-BR') }, grid: { color: 'rgba(255,255,255,0.04)' } }
          }
        }
      });
      charts.push(chart);
    }
  } catch (e) { console.error(e); }

  // Members growth chart
  try {
    const months = [];
    const counts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      months.push(d.toLocaleString('pt-BR', { month: 'short' }));
      const { count } = await supabase.from('members').select('id', { count: 'exact', head: true }).eq('church_id', churchId).eq('status', 'active').lte('member_since', end);
      counts.push(count || 0);
    }

    const ctx = document.getElementById('membersChart');
    if (ctx) {
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [{
            label: 'Membros Ativos',
            data: counts,
            borderColor: '#C8A951',
            backgroundColor: 'rgba(200, 169, 81, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#C8A951',
            pointRadius: 5
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#8899AA', font: { family: 'Inter' } } } },
          scales: {
            x: { ticks: { color: '#5C6F82' }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#5C6F82', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
          }
        }
      });
      charts.push(chart);
    }
  } catch (e) { console.error(e); }
}
