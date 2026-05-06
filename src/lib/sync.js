import { supabase } from './supabase.js';
import { db } from './db.js';

let isSyncing = false;
export let lastSyncTime = null;

// Tabelas a sincronizar (ordenadas por dependência, independentes primeiro)
const TABLES = [
  'churches',
  'profiles',
  'financial_accounts',
  'financial_categories',
  'suppliers',
  'members',
  'financial_transactions',
  'events',
  'groups',
  'group_members',
  'ministries',
  'ministry_members',
  'projects',
  'project_participants',
  'patrimony',
  'announcements',
  'prayers'
];

/**
 * PULL: Baixa todos os dados do Supabase e injeta no banco local.
 * Em um sistema mais avançado, usaríamos 'updated_at' para trazer apenas o delta.
 */
export async function syncPull(churchId = null) {
  try {
    for (const table of TABLES) {
      let query = supabase.from(table).select('*');
      
      // Filtrar por igreja se a tabela possuir 'church_id'
      if (churchId && table !== 'churches' && table !== 'profiles') {
        query = query.eq('church_id', churchId);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        await db.transaction('rw', db[table], async () => {
          // Limpa os dados locais atuais (estratégia simples "server overwrites local cache")
          // Idealmente, mesclaríamos, mas como as mutações ocorrem via push, as pendentes não estarão no server ainda.
          // Para evitar apagar algo não sincronizado, o PUSH deve rodar antes do PULL.
          const localKeys = await db[table].toCollection().primaryKeys();
          const serverIds = new Set(data.map(item => item.id));
          
          // Remove o que não existe mais no server
          const toDelete = localKeys.filter(k => !serverIds.has(k));
          if (toDelete.length > 0) {
            await db[table].bulkDelete(toDelete);
          }
          
          // Insere ou atualiza o que veio do server
          await db[table].bulkPut(data);
        });
      }
    }
    lastSyncTime = new Date();
    updateSyncStatusUI('online');
  } catch (err) {
    console.error('Error pulling data:', err);
    updateSyncStatusUI('error');
  }
}

/**
 * PUSH: Envia as alterações pendentes da fila para o Supabase.
 */
export async function syncPush() {
  if (!navigator.onLine) {
    updateSyncStatusUI('offline');
    return;
  }
  
  const pending = await db.sync_queue.where('status').equals('pending').sortBy('timestamp');
  if (pending.length === 0) return;

  updateSyncStatusUI('syncing');

  for (const item of pending) {
    try {
      const { table, operation, data, recordId } = item;
      let error = null;

      if (operation === 'INSERT') {
        // Remove ids gerados temporários (se houver, ex: uuid gerado no cliente)
        // Se já geramos um UUID válido v4 no cliente, mantemos.
        const res = await supabase.from(table).insert(data);
        error = res.error;
      } 
      else if (operation === 'UPDATE') {
        const res = await supabase.from(table).update(data).eq('id', recordId);
        error = res.error;
      } 
      else if (operation === 'DELETE') {
        const res = await supabase.from(table).delete().eq('id', recordId);
        error = res.error;
      }

      if (error) {
        console.error(`Sync error on ${operation} in ${table}:`, error);
        await db.sync_queue.update(item.id, { status: 'error', error_msg: error.message });
      } else {
        // Remove da fila se deu certo
        await db.sync_queue.delete(item.id);
      }
    } catch (err) {
      console.error('Push loop error:', err);
      await db.sync_queue.update(item.id, { status: 'error', error_msg: err.message });
    }
  }
}

/**
 * Orquestrador principal. Roda Push e depois Pull.
 */
export async function triggerSync(churchId = null) {
  if (isSyncing) return;
  if (!navigator.onLine) {
    updateSyncStatusUI('offline');
    return;
  }

  isSyncing = true;
  updateSyncStatusUI('syncing');

  try {
    // 1. Envia as mutações locais
    await syncPush();
    // 2. Baixa as atualizações do servidor
    await syncPull(churchId);
  } finally {
    isSyncing = false;
    // Se ainda houver itens na fila, status warning
    const remaining = await db.sync_queue.where('status').equals('pending').count();
    if (remaining > 0) {
      updateSyncStatusUI('error');
    } else {
      updateSyncStatusUI('online');
    }
  }
}

/**
 * Atualiza o ícone global de status (chamado no main.js).
 */
function updateSyncStatusUI(status) {
  const el = document.getElementById('globalSyncIndicator');
  if (!el) return;
  
  el.classList.remove('sync-online', 'sync-offline', 'sync-syncing', 'sync-error');
  el.classList.add(`sync-${status}`);
  
  if (status === 'online') {
    el.innerHTML = '<span title="Sincronizado">☁️✓</span>';
  } else if (status === 'offline') {
    el.innerHTML = '<span title="Modo Offline">☁️❌</span>';
  } else if (status === 'syncing') {
    el.innerHTML = '<span title="Sincronizando..." style="display:inline-block;animation:spin 2s linear infinite">🔄</span>';
  } else if (status === 'error') {
    el.innerHTML = '<span title="Erro na sincronização">☁️⚠️</span>';
  }
}

// Configurar trigger automático
window.triggerSync = triggerSync;
window.addEventListener('online', () => {
  const churchId = localStorage.getItem('ci_church_id');
  if (churchId) triggerSync(churchId);
});
window.addEventListener('offline', () => {
  updateSyncStatusUI('offline');
});
