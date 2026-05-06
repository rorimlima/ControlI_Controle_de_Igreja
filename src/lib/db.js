import Dexie from 'dexie';

export const db = new Dexie('ControlIgrejaDB');

// Declare tables, IDs and indexes
db.version(1).stores({
  // Tabela interna para fila de sincronização
  sync_queue: '++id, table, operation, timestamp, status', 
  // status: 'pending', 'error'
  // operation: 'INSERT', 'UPDATE', 'DELETE'

  // Tabelas da aplicação (O primeiro campo é a Primary Key)
  churches: 'id, name',
  profiles: 'id, email',
  
  members: 'id, church_id, full_name, status, role',
  financial_transactions: 'id, church_id, account_id, category_id, member_id, supplier_id, date, type, status',
  financial_accounts: 'id, church_id, type',
  financial_categories: 'id, church_id, type',
  suppliers: 'id, church_id, person_type',
  
  events: 'id, church_id, date',
  
  groups: 'id, church_id',
  group_members: 'id, group_id, member_id',
  
  ministries: 'id, church_id',
  ministry_members: 'id, ministry_id, member_id',
  
  projects: 'id, church_id',
  project_participants: 'id, project_id, member_id',
  
  patrimony: 'id, church_id, status',
  
  announcements: 'id, church_id, author_id, pinned, created_at',
  prayers: 'id, church_id, author_id, created_at'
});

export async function addSyncQueue(table, operation, data, recordId = null) {
  await db.sync_queue.add({
    table,
    operation,
    data: data, // JSON com os dados (ex: no UPDATE, os dados modificados. no DELETE, apenas o id)
    recordId: recordId || (data ? data.id : null),
    timestamp: new Date().toISOString(),
    status: 'pending',
    error_msg: null
  });
  
  // Trigger sync in background
  if (typeof window.triggerSync === 'function') {
    window.triggerSync();
  }
}
