import Dexie from 'dexie'

export const db = new Dexie('EasyAI')

db.version(1).stores({
  conversations: '++id, title, model, createdAt, updatedAt',
  messages: '++id, conversationId, role, content, createdAt',
  memories: '++id, title, content, createdAt',
  tasks: '++id, title, status, createdAt, updatedAt',
})
