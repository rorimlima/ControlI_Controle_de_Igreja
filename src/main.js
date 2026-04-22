import './styles/index.css';
import { Router } from './lib/router.js';
import { supabase } from './lib/supabase.js';
import { getSession, getProfile, onAuthStateChange, signOut } from './lib/auth.js';
import { $, showToast } from './lib/utils.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderMembers } from './pages/members.js';
import { renderFinancial } from './pages/financial.js';
import { renderEvents } from './pages/events.js';
import { renderMinistries } from './pages/ministries.js';
import { renderGroups } from './pages/groups.js';
import { renderCommunication } from './pages/communication.js';
import { renderProjects } from './pages/projects.js';
import { renderPatrimony } from './pages/patrimony.js';
import { renderChurches } from './pages/churches.js';
import { renderSettings } from './pages/settings.js';
import { renderTutorial } from './pages/tutorial.js';

const app = $('#app');
const router = new Router();

let currentUser = null;
let currentProfile = null;
let currentChurch = null;

export function getAppState() {
  return { user: currentUser, profile: currentProfile, church: currentChurch };
}

export function setCurrentChurch(church) {
  currentChurch = church;
  localStorage.setItem('ci_church_id', church?.id || '');
}

function renderSidebar() {
  const isMaster = currentProfile?.role === 'master';
  const isAdmin = ['master', 'admin'].includes(currentProfile?.role);
  const isLeader = ['master', 'admin', 'leader'].includes(currentProfile?.role);
  const initials = (currentProfile?.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const icons = {
    dashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>`,
    church: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L6 6v16h12V6z"></path><path d="M12 10v6"></path><path d="M10 12h4"></path></svg>`,
    members: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    finance: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
    patrimony: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`,
    events: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    ministries: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`,
    groups: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    communication: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    projects: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    tutorial: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`
  };

  const navItems = [
    { section: 'Principal', items: [
      { icon: icons.dashboard, label: 'Dashboard', path: '/dashboard' },
      ...(isMaster ? [{ icon: icons.church, label: 'Igrejas', path: '/churches' }] : []),
      { icon: icons.tutorial, label: 'Tutorial de Uso', path: '/tutorial' },
    ]},
    { section: 'Gestão', items: [
      { icon: icons.members, label: 'Membros', path: '/members' },
      ...(isAdmin ? [{ icon: icons.finance, label: 'Financeiro', path: '/financial' }] : []),
      ...(isAdmin ? [{ icon: icons.patrimony, label: 'Patrimônio', path: '/patrimony' }] : []),
    ]},
    { section: 'Comunidade', items: [
      { icon: icons.events, label: 'Eventos', path: '/events' },
      { icon: icons.ministries, label: 'Ministérios', path: '/ministries' },
      { icon: icons.groups, label: 'Células', path: '/groups' },
      { icon: icons.communication, label: 'Comunicação', path: '/communication' },
      { icon: icons.projects, label: 'Projetos Sociais', path: '/projects' },
    ]},
    { section: 'Sistema', items: [
      { icon: icons.settings, label: 'Configurações', path: '/settings' },
    ]},
  ];

  const currentPath = router.getCurrentPath();

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-logo">
          <img src="/icons/icon.svg" alt="Control Igreja" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 6px rgba(212,175,55,0.5))" />
        </div>
        <div class="sidebar-brand-text">
          <strong>Control Igreja</strong>
          <small>Gestão Integrada</small>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(section => `
          <div class="sidebar-section">
            <div class="sidebar-section-title">${section.section}</div>
            ${section.items.map(item => `
              <a class="sidebar-link ${currentPath === item.path ? 'active' : ''}" href="#${item.path}" data-path="${item.path}">
                <span class="sidebar-link-icon">${item.icon}</span>
                <span>${item.label}</span>
              </a>
            `).join('')}
          </div>
        `).join('')}
      </nav>
      <div class="sidebar-user">
        <div class="sidebar-avatar">${initials}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${currentProfile?.full_name || 'Usuário'}</div>
          <div class="sidebar-user-role">${currentProfile?.role === 'master' ? '🌟 Master' : currentProfile?.role === 'admin' ? 'Administrador' : currentProfile?.role === 'leader' ? 'Líder' : 'Membro'}</div>
        </div>
        <button class="sidebar-logout" id="logoutBtn" title="Sair"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></button>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
  `;
}

function renderHeader(title, subtitle) {
  const churchName = currentChurch?.name || 'Selecione uma igreja';
  return `
    <header class="header" id="header">
      <div class="header-left">
        <button class="hamburger" id="hamburgerBtn">☰</button>
        <div>
          <div class="header-title" id="headerTitle">${title}</div>
          <div class="header-subtitle" id="headerSubtitle">${subtitle || ''}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="header-church-badge">
          <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L6 6v16h12V6z"></path><path d="M12 10v6"></path><path d="M10 12h4"></path></svg></span>
          <span id="headerChurchName">${churchName}</span>
        </div>
      </div>
    </header>
  `;
}

export function renderLayout(title, subtitle, content) {
  app.innerHTML = `
    ${renderSidebar()}
    ${renderHeader(title, subtitle)}
    <main class="main-content">
      <div class="page-content">
        ${content}
      </div>
    </main>
  `;

  // Set up sidebar toggle
  const hamburger = $('#hamburgerBtn');
  const sidebar = $('#sidebar');
  const overlay = $('#sidebarOverlay');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Close sidebar on link click (mobile)
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  });

  // Logout
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut();
      currentUser = null;
      currentProfile = null;
      router.navigate('/login');
    });
  }
}

async function loadUserData() {
  try {
    const session = await getSession();
    if (!session) return false;

    currentUser = session.user;
    currentProfile = await getProfile();

    // Fallback: if profile query returned null, build from session metadata
    if (!currentProfile) {
      currentProfile = {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário',
        role: session.user.user_metadata?.role || 'member',
        church_id: null
      };
    }

    // Load church
    if (currentProfile?.role === 'master') {
      const savedChurchId = localStorage.getItem('ci_church_id');
      if (savedChurchId) {
        const { data } = await supabase.from('churches').select('*').eq('id', savedChurchId).maybeSingle();
        currentChurch = data;
      }
      if (!currentChurch) {
        const { data } = await supabase.from('churches').select('*').limit(1).maybeSingle();
        currentChurch = data;
        if (data) localStorage.setItem('ci_church_id', data.id);
      }
    } else if (currentProfile?.church_id) {
      const { data } = await supabase.from('churches').select('*').eq('id', currentProfile.church_id).maybeSingle();
      currentChurch = data;
    }

    return true;
  } catch (err) {
    console.error('loadUserData error:', err);
    return false;
  }
}

async function guardRoute(renderFn) {
  const loggedIn = await loadUserData();
  if (!loggedIn) {
    router.navigate('/login');
    return;
  }
  await renderFn();
}

// Register routes
router.addRoute('/login', () => renderLogin(router));
router.addRoute('/dashboard', () => guardRoute(() => renderDashboard()));
router.addRoute('/members', () => guardRoute(() => renderMembers()));
router.addRoute('/financial', () => guardRoute(() => renderFinancial()));
router.addRoute('/events', () => guardRoute(() => renderEvents()));
router.addRoute('/ministries', () => guardRoute(() => renderMinistries()));
router.addRoute('/groups', () => guardRoute(() => renderGroups()));
router.addRoute('/communication', () => guardRoute(() => renderCommunication()));
router.addRoute('/projects', () => guardRoute(() => renderProjects()));
router.addRoute('/patrimony', () => guardRoute(() => renderPatrimony()));
router.addRoute('/churches', () => guardRoute(() => renderChurches()));
router.addRoute('/tutorial', () => guardRoute(() => renderTutorial()));
router.addRoute('/settings', () => guardRoute(() => renderSettings()));

// Auth state listener
onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT') {
    currentUser = null;
    currentProfile = null;
    currentChurch = null;
    router.navigate('/login');
  }
});

// Start
async function init() {
  const session = await getSession();
  if (session) {
    if (!window.location.hash || window.location.hash === '#/login') {
      window.location.hash = '#/dashboard';
    }
  } else {
    window.location.hash = '#/login';
  }
  router.start();
}

init();
